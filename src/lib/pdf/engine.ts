// Minimal, valid PDF generator for Cloudflare Workers. No Node APIs, no native deps.
// Letter-size (612x792pt) business documents: text, lines, rects, tables, QR matrices.

export const PAGE_W = 612;
export const PAGE_H = 792;
export const MARGIN = 54; // 0.75"

export interface TextOpts { size?: number; bold?: boolean; color?: string; }
export interface QRMatrix { size: number; data: Uint8Array | number[]; }

function escPdf(text: string): string {
  let out = "";
  for (const ch of String(text)) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (code < 128) out += ch;
    else if (code <= 0xff) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += "?";
  }
  return out;
}

/** Rough Helvetica width estimate for wrapping (points). */
export function textWidth(text: string, size: number, bold = false): number {
  let units = 0;
  for (const ch of text) {
    if ("iljtf.,:;'|! ".includes(ch)) units += 0.32;
    else if ("mwMW@".includes(ch)) units += 0.9;
    else if (ch >= "A" && ch <= "Z") units += 0.68;
    else units += 0.52;
  }
  return units * size * (bold ? 1.04 : 1);
}

export class PdfPage {
  ops: string[] = [];
  constructor(public width = PAGE_W, public height = PAGE_H) {}

  raw(op: string): void { this.ops.push(op); }

  text(x: number, y: number, value: string, opts: TextOpts = {}): void {
    const size = opts.size ?? 10;
    const font = opts.bold ? "F2" : "F1";
    const color = opts.color ?? "0 0 0";
    this.ops.push(`BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escPdf(value)}) Tj ET`);
  }

  textRight(x: number, y: number, value: string, opts: TextOpts = {}): void {
    const size = opts.size ?? 10;
    this.text(x - textWidth(value, size, opts.bold), y, value, opts);
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.7, color = "0 0 0"): void {
    this.ops.push(`${color} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  rect(x: number, y: number, w: number, h: number, fill = "0.93 0.93 0.93"): void {
    this.ops.push(`${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  /** Draw a QR matrix with the top-left corner at (x, yTop) and given module size. */
  qr(matrix: QRMatrix, x: number, yTop: number, moduleSize = 2): void {
    const parts: string[] = ["0 0 0 rg"];
    for (let row = 0; row < matrix.size; row++) {
      for (let col = 0; col < matrix.size; col++) {
        if (matrix.data[row * matrix.size + col]) {
          const px = x + col * moduleSize;
          const py = yTop - (row + 1) * moduleSize;
          parts.push(`${px.toFixed(2)} ${py.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`);
        }
      }
    }
    this.ops.push(parts.join(" "));
  }

  /** Draw a captured signature as vector strokes. points: [stroke][point][x,y] in 0..1 space. */
  signature(strokes: number[][][], x: number, y: number, w: number, h: number, color = "0 0 0.4"): void {
    const parts: string[] = [`${color} RG 1.2 w`];
    for (const stroke of strokes) {
      stroke.forEach(([px, py], i) => {
        const ax = x + px * w;
        const ay = y + (1 - py) * h;
        parts.push(`${ax.toFixed(2)} ${ay.toFixed(2)} ${i === 0 ? "m" : "l"}`);
      });
    }
    parts.push("S");
    this.ops.push(parts.join(" "));
  }
}

export class PdfBuilder {
  pages: PdfPage[] = [];

  addPage(): PdfPage {
    const page = new PdfPage();
    this.pages.push(page);
    return page;
  }

  build(): Uint8Array {
    const objects: string[] = [];
    // 1 catalog, 2 pages, 3 font regular, 4 font bold, then per page: page obj + content obj
    const pageCount = this.pages.length;
    const fontRegular = 3, fontBold = 4;
    const pageObjStart = 5;

    objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
    const kids = this.pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(" ");
    objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
    objects[2] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

    const encoder = new TextEncoder();
    this.pages.forEach((page, i) => {
      const pageObj = pageObjStart + i * 2;
      const contentObj = pageObj + 1;
      objects[pageObj - 1] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentObj} 0 R >>`;
      const stream = page.ops.join("\n");
      objects[contentObj - 1] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`;
    });

    // Assemble with xref
    const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    const offsets: number[] = [];
    let position = chunks[0].length;
    objects.forEach((body, i) => {
      offsets[i] = position;
      const chunk = encoder.encode(`${i + 1} 0 obj\n${body}\nendobj\n`);
      chunks.push(chunk);
      position += chunk.length;
    });

    const xrefStart = position;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    chunks.push(encoder.encode(xref));

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let cursor = 0;
    for (const c of chunks) { out.set(c, cursor); cursor += c.length; }
    return out;
  }
}

/** Word-wrap text into lines that fit maxWidth at the given size. */
export function wrapText(text: string, maxWidth: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of String(text).split("\n")) {
    if (!para.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, bold) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Strip tags + decode a few entities to flow rendered agreement HTML into PDF text. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li|\/tr)\s*>/gi, "\n")
    .replace(/<\s*li\s*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
