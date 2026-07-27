// Branded business-document renderers (invoice, quote, receipt, credit memo, statement,
// agreement, label sheet). Letter size, headers/footers, page numbers, verification codes.
import QRCode from "qrcode";
import { PdfBuilder, PdfPage, MARGIN, PAGE_W, PAGE_H, wrapText, textWidth, htmlToPlainText, type QRMatrix } from "./engine";
import { formatUsd, formatDate, formatDateTime } from "../money";

export interface CompanyInfo {
  legalName: string; tagline: string; street: string; city: string; state: string; zip: string;
  phone: string; email: string;
}

export interface DocLine {
  description: string; quantity: number; unit: string; unitPriceCents: number;
  discountCents: number; taxCents: number; totalCents: number; serviceDate?: string | null;
}

export interface FinancialDocData {
  docTitle: string;              // INVOICE, QUOTE, RECEIPT, CREDIT MEMO
  docNumber: string;
  status: string;
  issueDate: string;
  dueDate?: string | null;
  customerName: string;
  customerAddress: string[];
  deliveryAddress?: string[];
  pickupAddress?: string[];
  orderNumber?: string | null;
  purchaseOrderNumber?: string | null;
  agreementReference?: string | null;
  rentalDates?: string | null;
  packageName?: string | null;
  lines: DocLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents?: number;
  creditCents?: number;
  balanceDueCents?: number;
  payments?: { date: string; method: string; amountCents: number }[];
  notes?: string | null;
  terms?: string | null;
  verificationCode: string;
  verificationUrl: string;
  reason?: string | null; // credit memos
}

function qrMatrix(text: string): QRMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  return { size: qr.modules.size, data: Array.from(qr.modules.data) };
}

const CONTENT_W = PAGE_W - MARGIN * 2;

class DocWriter {
  builder = new PdfBuilder();
  page: PdfPage;
  y = 0;
  constructor(public company: CompanyInfo, public docTitle: string, public verificationCode: string) {
    this.page = this.newPage(true);
  }

  newPage(first = false): PdfPage {
    const page = this.builder.addPage();
    this.page = page;
    // Header band
    page.rect(0, PAGE_H - 8, PAGE_W, 8, "0.10 0.29 0.42"); // brand navy band
    page.text(MARGIN, PAGE_H - 38, this.company.legalName, { size: 14, bold: true, color: "0.10 0.29 0.42" });
    page.text(MARGIN, PAGE_H - 52, `${this.company.street}, ${this.company.city}, ${this.company.state} ${this.company.zip}`, { size: 8, color: "0.35 0.35 0.35" });
    page.text(MARGIN, PAGE_H - 62, `${this.company.phone}  ·  ${this.company.email}`, { size: 8, color: "0.35 0.35 0.35" });
    page.textRight(PAGE_W - MARGIN, PAGE_H - 40, this.docTitle, { size: 18, bold: true, color: "0.10 0.29 0.42" });
    page.line(MARGIN, PAGE_H - 72, PAGE_W - MARGIN, PAGE_H - 72, 1, "0.10 0.29 0.42");
    this.y = PAGE_H - 92;
    return page;
  }

  ensureSpace(needed: number): void {
    if (this.y - needed < 70) this.newPage();
  }

  text(value: string, opts: Parameters<PdfPage["text"]>[3] = {}, x = MARGIN): void {
    this.page.text(x, this.y, value, opts);
    this.y -= (opts?.size ?? 10) + 4;
  }

  paragraph(value: string, opts: { size?: number; bold?: boolean; color?: string } = {}): void {
    const size = opts.size ?? 9;
    const lines = wrapText(value, CONTENT_W, size, opts.bold);
    for (const ln of lines) {
      this.ensureSpace(size + 4);
      this.page.text(MARGIN, this.y, ln, { size, bold: opts.bold, color: opts.color });
      this.y -= size + 3.5;
    }
    this.y -= 3;
  }

  gap(h = 8): void { this.y -= h; }

  keyValueRight(pairs: [string, string][]): void {
    for (const [k, v] of pairs) {
      this.ensureSpace(14);
      this.page.text(MARGIN, this.y, k, { size: 9, color: "0.35 0.35 0.35" });
      this.page.textRight(PAGE_W - MARGIN, this.y, v, { size: 9, bold: true });
      this.y -= 13;
    }
  }

  table(headers: string[], rows: string[][], colWidths: number[], rightCols: number[] = []): void {
    const drawHeader = () => {
      this.ensureSpace(20);
      this.page.rect(MARGIN, this.y - 4, CONTENT_W, 15, "0.10 0.29 0.42");
      let x = MARGIN;
      headers.forEach((h, i) => {
        if (rightCols.includes(i)) this.page.textRight(x + colWidths[i] - 4, this.y, h, { size: 8, bold: true, color: "1 1 1" });
        else this.page.text(x + 4, this.y, h, { size: 8, bold: true, color: "1 1 1" });
        x += colWidths[i];
      });
      this.y -= 15;
    };
    drawHeader();
    rows.forEach((row, ri) => {
      if (this.y - 14 < 70) { this.newPage(); drawHeader(); } // repeating table headers
      if (ri % 2 === 1) this.page.rect(MARGIN, this.y - 4, CONTENT_W, 14, "0.96 0.97 0.98");
      let x = MARGIN;
      row.forEach((cell, i) => {
        const clipped = cell.length > 64 ? cell.slice(0, 61) + "…" : cell;
        if (rightCols.includes(i)) this.page.textRight(x + colWidths[i] - 4, this.y, clipped, { size: 8 });
        else this.page.text(x + 4, this.y, clipped, { size: 8 });
        x += colWidths[i];
      });
      this.y -= 14;
    });
    this.page.line(MARGIN, this.y + 4, PAGE_W - MARGIN, this.y + 4, 0.5, "0.7 0.7 0.7");
    this.y -= 4;
  }

  /** Totals block that always stays together on one page. */
  totalsBlock(pairs: [string, string, boolean?][]): void {
    const height = pairs.length * 14 + 12;
    this.ensureSpace(height);
    const boxX = PAGE_W - MARGIN - 230;
    this.page.rect(boxX - 8, this.y - height + 6, 238, height, "0.96 0.97 0.98");
    for (const [label, value, emphasize] of pairs) {
      this.y -= 14;
      this.page.text(boxX, this.y + 4, label, { size: 9, bold: !!emphasize, color: emphasize ? "0.10 0.29 0.42" : "0 0 0" });
      this.page.textRight(PAGE_W - MARGIN - 8, this.y + 4, value, { size: emphasize ? 11 : 9, bold: !!emphasize, color: emphasize ? "0.10 0.29 0.42" : "0 0 0" });
    }
    this.y -= 10;
  }

  finish(): Uint8Array {
    const total = this.builder.pages.length;
    this.builder.pages.forEach((page, i) => {
      page.line(MARGIN, 56, PAGE_W - MARGIN, 56, 0.5, "0.7 0.7 0.7");
      page.text(MARGIN, 44, `${this.company.legalName} — ${this.company.tagline}`, { size: 8, color: "0.35 0.35 0.35" });
      page.text(MARGIN, 34, `Verification: ${this.verificationCode}`, { size: 8, color: "0.35 0.35 0.35" });
      page.textRight(PAGE_W - MARGIN, 44, `Page ${i + 1} of ${total}`, { size: 8, color: "0.35 0.35 0.35" });
      page.textRight(PAGE_W - MARGIN, 34, "Verify at your ToteOps portal /verify", { size: 7, color: "0.55 0.55 0.55" });
    });
    return this.builder.build();
  }
}

export function renderFinancialDoc(company: CompanyInfo, data: FinancialDocData): Uint8Array {
  const w = new DocWriter(company, data.docTitle, data.verificationCode);

  // Meta + bill-to blocks
  const startY = w.y;
  w.page.text(MARGIN, w.y, "BILL TO", { size: 8, bold: true, color: "0.35 0.35 0.35" });
  w.page.text(MARGIN, w.y - 13, data.customerName, { size: 10, bold: true });
  data.customerAddress.forEach((line, i) => w.page.text(MARGIN, w.y - 25 - i * 11, line, { size: 9 }));
  if (data.deliveryAddress?.length) {
    w.page.text(MARGIN, w.y - 40 - data.customerAddress.length * 11, "DELIVERY", { size: 8, bold: true, color: "0.35 0.35 0.35" });
    data.deliveryAddress.forEach((line, i) =>
      w.page.text(MARGIN, w.y - 52 - data.customerAddress.length * 11 - i * 11, line, { size: 9 }));
  }
  if (data.pickupAddress?.length) {
    w.page.text(MARGIN + 200, w.y - 40 - data.customerAddress.length * 11, "PICKUP", { size: 8, bold: true, color: "0.35 0.35 0.35" });
    data.pickupAddress.forEach((line, i) =>
      w.page.text(MARGIN + 200, w.y - 52 - data.customerAddress.length * 11 - i * 11, line, { size: 9 }));
  }

  const meta: [string, string][] = [
    [`${data.docTitle} NUMBER`, data.docNumber],
    ["STATUS", data.status.toUpperCase()],
    ["ISSUE DATE", formatDate(data.issueDate)],
  ];
  if (data.dueDate) meta.push(["DUE DATE", formatDate(data.dueDate)]);
  if (data.orderNumber) meta.push(["ORDER", data.orderNumber]);
  if (data.purchaseOrderNumber) meta.push(["PO NUMBER", data.purchaseOrderNumber]);
  if (data.rentalDates) meta.push(["RENTAL DATES", data.rentalDates]);
  if (data.packageName) meta.push(["PACKAGE", data.packageName]);
  if (data.agreementReference) meta.push(["AGREEMENT", data.agreementReference]);
  let metaY = startY;
  for (const [k, v] of meta) {
    w.page.textRight(PAGE_W - MARGIN - 150, metaY, k, { size: 8, color: "0.35 0.35 0.35" });
    w.page.textRight(PAGE_W - MARGIN, metaY, v, { size: 9, bold: true });
    metaY -= 12;
  }
  w.y = Math.min(startY - 60 - data.customerAddress.length * 11 - (data.deliveryAddress ? 30 : 0), metaY - 8);

  if (data.reason) { w.paragraph(`Reason: ${data.reason}`, { size: 9, bold: true }); w.gap(4); }

  // Lines table
  const rows = data.lines.map((l) => [
    l.description, String(l.quantity), l.unit,
    formatUsd(l.unitPriceCents),
    l.discountCents ? `-${formatUsd(l.discountCents)}` : "—",
    l.taxCents ? formatUsd(l.taxCents) : "—",
    formatUsd(l.totalCents),
  ]);
  w.table(["DESCRIPTION", "QTY", "UNIT", "UNIT PRICE", "DISCOUNT", "TAX", "AMOUNT"],
    rows, [212, 40, 50, 62, 56, 50, 62].map((n) => n * (CONTENT_W / 532)), [3, 4, 5, 6]);

  w.gap(6);
  const totals: [string, string, boolean?][] = [["Subtotal", formatUsd(data.subtotalCents)]];
  if (data.discountCents) totals.push(["Discounts", `-${formatUsd(data.discountCents)}`]);
  totals.push(["Tax", formatUsd(data.taxCents)]);
  totals.push(["Total", formatUsd(data.totalCents), true]);
  if (data.amountPaidCents) totals.push(["Paid", `-${formatUsd(data.amountPaidCents)}`]);
  if (data.creditCents) totals.push(["Credits", `-${formatUsd(data.creditCents)}`]);
  if (data.balanceDueCents != null) totals.push(["Balance Due", formatUsd(data.balanceDueCents), true]);
  w.totalsBlock(totals);

  if (data.payments?.length) {
    w.gap(6);
    w.text("PAYMENTS", { size: 8, bold: true, color: "0.35 0.35 0.35" });
    w.table(["DATE", "METHOD", "AMOUNT"],
      data.payments.map((p) => [formatDate(p.date), p.method, formatUsd(p.amountCents)]),
      [150, 200, CONTENT_W - 350], [2]);
  }

  w.gap(10);
  if (data.terms) w.paragraph(`Terms: ${data.terms}`, { size: 8 });
  if (data.notes) w.paragraph(`Notes: ${data.notes}`, { size: 8 });
  w.paragraph("Payment instructions: pay online through your customer portal link, by check payable to Great Lakes Moving Totes LLC, or call (989) 555-0142.", { size: 8, color: "0.35 0.35 0.35" });

  // QR verification block (kept together)
  w.ensureSpace(70);
  const qr = qrMatrix(data.verificationUrl);
  w.page.qr(qr, PAGE_W - MARGIN - 52, w.y + 8, 1.7);
  w.page.text(MARGIN, w.y, "Scan to verify this document", { size: 8, color: "0.35 0.35 0.35" });
  w.page.text(MARGIN, w.y - 11, data.verificationCode, { size: 9, bold: true });
  w.y -= 62;

  return w.finish();
}

export interface AgreementPdfData {
  agreementNumber: string;
  renderedHtml: string;             // already-escaped merge output
  verificationCode: string;
  verificationUrl: string;
  signed?: {
    customerNameTyped: string;
    acceptedAt: string;
    ipAddress: string | null;
    deviceInfo: string | null;
    checkboxValues: Record<string, boolean>;
    signatureStrokes?: number[][][] | null;
    authorityConfirmed?: boolean;
  };
}

export function renderAgreementPdf(company: CompanyInfo, data: AgreementPdfData): Uint8Array {
  const w = new DocWriter(company, "RENTAL AGREEMENT", data.verificationCode);
  w.keyValueRight([
    ["AGREEMENT NUMBER", data.agreementNumber],
    ["STATUS", data.signed ? "ACCEPTED & SIGNED" : "PENDING SIGNATURE"],
  ]);
  w.gap(4);
  w.paragraph(htmlToPlainText(data.renderedHtml), { size: 9 });

  w.ensureSpace(150);
  w.gap(10);
  w.page.line(MARGIN, w.y, PAGE_W - MARGIN, w.y, 0.8, "0.10 0.29 0.42");
  w.y -= 14;
  w.text("SIGNATURES", { size: 9, bold: true, color: "0.10 0.29 0.42" });
  w.gap(4);

  if (data.signed) {
    const s = data.signed;
    if (s.signatureStrokes?.length) {
      w.page.signature(s.signatureStrokes, MARGIN, w.y - 44, 200, 44);
    }
    w.page.line(MARGIN, w.y - 48, MARGIN + 220, w.y - 48, 0.6);
    w.page.text(MARGIN, w.y - 60, `Signed electronically by: ${s.customerNameTyped}`, { size: 9, bold: true });
    w.page.text(MARGIN, w.y - 72, `Accepted: ${formatDateTime(s.acceptedAt)} (America/Detroit)`, { size: 8 });
    w.page.text(MARGIN, w.y - 83, `IP: ${s.ipAddress ?? "recorded"}  ·  Device: ${(s.deviceInfo ?? "recorded").slice(0, 60)}`, { size: 7, color: "0.35 0.35 0.35" });
    w.y -= 96;
    const checks = Object.entries(s.checkboxValues)
      .filter(([, v]) => v)
      .map(([k]) => `☑ ${k.replace(/_/g, " ")}`);
    if (s.authorityConfirmed) checks.push("☑ authority to sign confirmed");
    w.paragraph(`Acceptance confirmations: ${checks.join("  ·  ")}`, { size: 7, color: "0.35 0.35 0.35" });
  } else {
    w.page.line(MARGIN, w.y - 40, MARGIN + 220, w.y - 40, 0.6);
    w.page.text(MARGIN, w.y - 52, "Customer signature — sign electronically via your secure review link", { size: 8, color: "0.35 0.35 0.35" });
    w.y -= 64;
  }

  w.page.line(MARGIN + 280, w.y + 24, PAGE_W - MARGIN, w.y + 24, 0.6);
  w.page.text(MARGIN + 280, w.y + 12, `For ${company.legalName}`, { size: 8, color: "0.35 0.35 0.35" });
  w.y -= 10;

  w.ensureSpace(70);
  const qr = qrMatrix(data.verificationUrl);
  w.page.qr(qr, PAGE_W - MARGIN - 52, w.y + 8, 1.7);
  w.page.text(MARGIN, w.y, "Document verification", { size: 8, color: "0.35 0.35 0.35" });
  w.page.text(MARGIN, w.y - 11, data.verificationCode, { size: 9, bold: true });
  w.y -= 62;

  return w.finish();
}

export interface StatementData {
  accountNumber: string; businessName: string; periodLabel: string;
  openingBalanceCents: number; closingBalanceCents: number; pastDueCents: number;
  activity: { date: string; reference: string; description: string; amountCents: number }[];
  verificationCode: string; verificationUrl: string;
}

export function renderStatementPdf(company: CompanyInfo, data: StatementData): Uint8Array {
  const w = new DocWriter(company, "ACCOUNT STATEMENT", data.verificationCode);
  w.keyValueRight([
    ["ACCOUNT", data.accountNumber],
    ["BUSINESS", data.businessName],
    ["PERIOD", data.periodLabel],
  ]);
  w.gap(6);
  w.table(["DATE", "REFERENCE", "DESCRIPTION", "AMOUNT"],
    data.activity.map((a) => [formatDate(a.date), a.reference, a.description, formatUsd(a.amountCents)]),
    [80, 130, CONTENT_W - 290, 80], [3]);
  w.gap(6);
  w.totalsBlock([
    ["Opening Balance", formatUsd(data.openingBalanceCents)],
    ["Closing Balance", formatUsd(data.closingBalanceCents), true],
    ["Past Due", formatUsd(data.pastDueCents), data.pastDueCents > 0],
  ]);
  return w.finish();
}

export interface LabelItem { assetNumber: string; qrValue: string; assetType: string; }

/** QR + Code-128-style human label sheet, 3 columns × 8 rows per page. */
export function renderLabelSheet(company: CompanyInfo, items: LabelItem[], batchId: string): Uint8Array {
  const builder = new PdfBuilder();
  const cols = 3, rowsPerPage = 8;
  const cellW = (PAGE_W - MARGIN * 2) / cols;
  const cellH = (PAGE_H - MARGIN * 2) / rowsPerPage;

  for (let start = 0; start < items.length; start += cols * rowsPerPage) {
    const page = builder.addPage();
    const chunk = items.slice(start, start + cols * rowsPerPage);
    chunk.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = MARGIN + col * cellW;
      const yTop = PAGE_H - MARGIN - row * cellH;
      page.rect(x + 2, yTop - cellH + 2, cellW - 4, cellH - 4, "1 1 1");
      page.line(x + 2, yTop - 2, x + cellW - 2, yTop - 2, 0.4, "0.8 0.8 0.8");
      const qr = qrMatrix(item.qrValue);
      page.qr(qr, x + 10, yTop - 8, 1.5);
      page.text(x + 66, yTop - 24, item.assetNumber, { size: 10, bold: true });
      page.text(x + 66, yTop - 36, item.assetType.replace("_", " ").toUpperCase(), { size: 7, color: "0.35 0.35 0.35" });
      page.text(x + 66, yTop - 47, company.legalName, { size: 6.5, color: "0.45 0.45 0.45" });
      page.text(x + 66, yTop - 56, company.phone, { size: 6.5, color: "0.45 0.45 0.45" });
      // simplified barcode strip (human-readable below)
      let bx = x + 10;
      for (const ch of item.assetNumber) {
        const wgt = (ch.charCodeAt(0) % 3) + 1;
        page.rect(bx, yTop - cellH + 8, wgt, 16, "0 0 0");
        bx += wgt + 1.4;
      }
      page.text(x + 10, yTop - cellH + 16, item.assetNumber, { size: 6, color: "0.2 0.2 0.2" });
    });
    page.textRight(PAGE_W - MARGIN, 30, `Label batch ${batchId} — ${company.tagline}`, { size: 7, color: "0.55 0.55 0.55" });
  }
  return builder.build();
}
