import { audit } from "@/lib/audit";
import type { Env } from "@/lib/cloudflare";
import { hmacSha256Hex, sha256Hex, verificationCodeFrom } from "@/lib/crypto";
import { escapeHtml, id, nowIso, one, q, run } from "@/lib/db";
import { storeDocument } from "@/lib/documents";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { nextDocumentNumber } from "@/lib/numbering";
import { renderAgreementPdf } from "@/lib/pdf/documents";
import { getCompanyInfo, getSetting } from "@/lib/settings";
import type { AuthContext } from "@/lib/types";

type AgreementInput = {
  id: string; order_number: string; customer_id: string; order_status: string;
  package_name: string | null; package_description: string | null;
  package_tote_quantity: number | null; package_dolly_quantity: number | null;
  included_rental_days: number | null; scheduled_delivery_date: string | null;
  scheduled_pickup_date: string | null; preferred_delivery_window: string | null;
  preferred_pickup_window: string | null; total_cents: number; discount_cents: number;
  access_fee_cents: number; add_on_cents: number; customer_notes: string | null;
  customer_name: string; customer_email: string | null; customer_phone: string | null;
  delivery_street: string | null; delivery_unit: string | null; delivery_city: string | null;
  delivery_state: string | null; delivery_zip: string | null; pickup_street: string | null;
  pickup_unit: string | null; pickup_city: string | null; pickup_state: string | null; pickup_zip: string | null;
};
type Template = { id: string; version: number };

const formatUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const address = (street: string | null, unit: string | null, city: string | null, state: string | null, zip: string | null) =>
  [street && `${street}${unit ? `, ${unit}` : ""}`, [city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ") || "Address to be confirmed";

function agreementHtml(order: AgreementInput, agreementNumber: string, expiresAt: string): string {
  const deliveryAddress = address(order.delivery_street, order.delivery_unit, order.delivery_city, order.delivery_state, order.delivery_zip);
  const pickupAddress = address(order.pickup_street, order.pickup_unit, order.pickup_city, order.pickup_state, order.pickup_zip);
  const equipment = [
    `${Number(order.package_tote_quantity ?? 0)} reusable moving tote${Number(order.package_tote_quantity ?? 0) === 1 ? "" : "s"}`,
    Number(order.package_dolly_quantity ?? 0) ? `${Number(order.package_dolly_quantity)} dolly${Number(order.package_dolly_quantity) === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(" and ");
  const rows: [string, string][] = [
    ["Customer", order.customer_name], ["Order", order.order_number], ["Package", order.package_name ?? "Custom tote rental"],
    ["Rental period", `${order.scheduled_delivery_date ?? "To be confirmed"} through ${order.scheduled_pickup_date ?? "To be confirmed"}`],
    ["Delivery", deliveryAddress], ["Pickup", pickupAddress], ["Equipment", equipment],
    ["Rental total", formatUsd(order.total_cents)], ["Agreement expires", new Date(expiresAt).toLocaleDateString("en-US")],
  ];
  const detailRows = rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:15px/1.55 Arial,sans-serif;color:#173b52;margin:36px auto;max-width:800px;padding:0 24px}h1{font-size:28px;margin:0 0 3px}h2{font-size:17px;margin:28px 0 9px;color:#087e75}p{margin:8px 0}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:9px 10px;border-bottom:1px solid #dce5e8;text-align:left;vertical-align:top}th{width:34%;font-size:12px;color:#58717e}.notice{background:#edf7f4;border-left:4px solid #15988e;padding:12px 14px;margin:18px 0}.signature{margin-top:42px;padding-top:16px;border-top:1px solid #173b52}.fine{font-size:12px;color:#58717e}</style></head><body>
<p class="fine">GREAT LAKES MOVING TOTES · RENTAL AGREEMENT</p><h1>Rental Agreement</h1><p>Agreement ${escapeHtml(agreementNumber)}</p>
<div class="notice">This agreement records the rental terms selected for this order. Please review all dates, addresses, equipment, and charges before signing.</div>
<table>${detailRows}</table>
<h2>Rental terms</h2>
<p>Great Lakes Moving Totes LLC rents the listed equipment to the customer for the agreed rental period. The customer is responsible for safeguarding the equipment while it is in the customer’s possession and for returning it empty, reasonably clean, and available at the scheduled pickup address and time.</p>
<p>The customer agrees to use the equipment only for ordinary moving and storage purposes, not to alter, sell, sublease, or misuse it, and to promptly report loss, theft, or damage. Additional charges may apply for late return, missing equipment, abnormal cleaning, or damage as allowed by the order terms and applicable law.</p>
<p>Delivery and pickup windows are estimates unless a confirmed window is shown. The customer must provide safe, reasonable access at the delivery and pickup locations. Changes to the rental period, package, addresses, or price require an updated order and may require a replacement agreement.</p>
<p>By electronically signing, the customer confirms that the order details are accurate, agrees to these rental terms, and confirms authority to enter this agreement. A signed electronic copy is retained with the order and made available in the customer portal.</p>
<div class="signature"><strong>Customer electronic signature</strong><p class="fine">Sign securely in the customer portal. A signed PDF with the typed signer name, timestamp, and acceptance record will be attached to this agreement.</p></div>
<p class="fine">Customer notes captured with this order: ${escapeHtml(order.customer_notes || "None")}</p>
</body></html>`;
}

async function findOrder(env: Env, orderId: string): Promise<AgreementInput> {
  const order = await one<AgreementInput>(env.DB, `SELECT o.id,o.order_number,o.customer_id,o.order_status,
    p.name package_name,p.description package_description,p.tote_quantity package_tote_quantity,p.dolly_quantity package_dolly_quantity,p.included_rental_days,
    o.scheduled_delivery_date,o.scheduled_pickup_date,o.preferred_delivery_window,o.preferred_pickup_window,o.total_cents,o.discount_cents,o.access_fee_cents,o.add_on_cents,o.customer_notes,
    COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name,c.email customer_email,c.primary_phone customer_phone,
    da.street delivery_street,da.unit delivery_unit,da.city delivery_city,da.state delivery_state,da.zip delivery_zip,
    pa.street pickup_street,pa.unit pickup_unit,pa.city pickup_city,pa.state pickup_state,pa.zip pickup_zip
    FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN rental_packages p ON p.id=o.package_id
    LEFT JOIN customer_addresses da ON da.id=o.delivery_address_id LEFT JOIN customer_addresses pa ON pa.id=o.pickup_address_id
    WHERE o.id=? AND o.deleted_at IS NULL`, orderId);
  if (!order) throw new NotFoundError("Order");
  if (!order.customer_name.trim()) throw new ValidationError("A customer name is required before creating a contract");
  return order;
}

export async function generateAgreement(env: Env, ctx: AuthContext, orderId: string) {
  const order = await findOrder(env, orderId);
  const accepted = await one<{ id: string; agreement_number: string }>(env.DB, "SELECT id,agreement_number FROM agreements WHERE order_id=? AND status='accepted' ORDER BY accepted_at DESC LIMIT 1", orderId);
  if (accepted) return { agreementId: accepted.id, agreementNumber: accepted.agreement_number, reused: true };
  const template = await one<Template>(env.DB, `SELECT t.id,v.version FROM agreement_templates t JOIN agreement_template_versions v ON v.template_id=t.id WHERE t.active=1 AND v.status='active' AND t.template_type='standard_residential' ORDER BY v.version DESC LIMIT 1`);
  if (!template) throw new ValidationError("No active rental agreement template is configured");
  const days = Math.max(1, Number(await getSetting(env.DB, "agreement.expiration_days", "7")) || 7);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const agreementId = id("agr");
  const agreementNumber = await nextDocumentNumber(env.DB, "agreement");
  const snapshot = { order, templateId: template.id, templateVersion: template.version, generatedAt: createdAt };
  const renderedHtml = agreementHtml(order, agreementNumber, expiresAt);
  const htmlChecksum = await sha256Hex(renderedHtml);
  const verificationCode = verificationCodeFrom(await hmacSha256Hex(env.DOC_LINK_SECRET ?? "local-dev-only-change-me", `${agreementNumber}:${htmlChecksum}`));
  const company = await getCompanyInfo(env.DB);
  const pdf = renderAgreementPdf(company, { agreementNumber, renderedHtml, verificationCode, verificationUrl: `${env.APP_BASE_URL}/agreements/${agreementId}` });
  const unsigned = await storeDocument(env, pdf, "application/pdf", {
    objectKey: `agreements/${agreementId}/${agreementNumber}-unsigned.pdf`, fileName: `${agreementNumber}-rental-agreement.pdf`,
    documentType: "agreement_unsigned", relatedEntityType: "agreement", relatedEntityId: agreementId,
    templateVersion: template.version, generatedBy: ctx.user.id, accessClassification: "customer",
  });
  await run(env.DB, "UPDATE agreements SET status='superseded',superseded_at=?,updated_at=? WHERE order_id=? AND status IN ('draft','generated','sent','viewed')", createdAt, createdAt, orderId);
  await run(env.DB, `INSERT INTO agreements (id,agreement_number,order_id,customer_id,template_id,template_version,status,snapshot_json,rendered_html,html_checksum,unsigned_pdf_document_id,sent_at,expires_at,verification_code,created_at,updated_at)
    VALUES (?,?,?,?,?,?, 'sent',?,?,?,?,?,?,?,?)`, agreementId, agreementNumber, orderId, order.customer_id, template.id, template.version,
    JSON.stringify(snapshot), renderedHtml, htmlChecksum, unsigned.id, createdAt, expiresAt, verificationCode, createdAt, createdAt);
  await run(env.DB, "UPDATE orders SET agreement_status='sent',current_agreement_id=?,updated_at=?,version=version+1 WHERE id=?", agreementId, createdAt, orderId);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "agreement.generated", entityType: "agreement", entityId: agreementId, detail: { agreementNumber, orderId, templateVersion: template.version, unsignedDocumentId: unsigned.id }, ip: ctx.ip });
  return { agreementId, agreementNumber, reused: false };
}

export async function acceptAgreement(env: Env, ctx: AuthContext, agreementId: string, typedName: string) {
  const agreement = await one<{ id: string; order_id: string; customer_id: string; agreement_number: string; rendered_html: string; verification_code: string; html_checksum: string; template_version: number; status: string; expires_at: string | null; snapshot_json: string }>(env.DB, "SELECT id,order_id,customer_id,agreement_number,rendered_html,verification_code,html_checksum,template_version,status,expires_at,snapshot_json FROM agreements WHERE id=?", agreementId);
  if (!agreement) throw new NotFoundError("Agreement");
  if (!ctx.portalCustomerId || ctx.portalCustomerId !== agreement.customer_id) throw new ValidationError("This agreement does not belong to this customer");
  if (agreement.status === "accepted") return { agreementId, alreadyAccepted: true };
  if (!["generated", "sent", "viewed"].includes(agreement.status) || !agreement.rendered_html) throw new ValidationError("This agreement is not available for signature");
  if (agreement.expires_at && agreement.expires_at < nowIso()) throw new ValidationError("This agreement has expired; contact Great Lakes Moving Totes for a new copy");
  const acceptedAt = nowIso();
  const company = await getCompanyInfo(env.DB);
  const pdf = renderAgreementPdf(company, { agreementNumber: agreement.agreement_number, renderedHtml: agreement.rendered_html, verificationCode: agreement.verification_code, verificationUrl: `${env.APP_BASE_URL}/agreements/${agreementId}`, signed: { customerNameTyped: typedName, acceptedAt, ipAddress: ctx.ip, deviceInfo: ctx.user.email, checkboxValues: { rental_terms_accepted: true, electronic_signature_consent: true }, authorityConfirmed: true } });
  const signed = await storeDocument(env, pdf, "application/pdf", { objectKey: `agreements/${agreementId}/${agreement.agreement_number}-signed.pdf`, fileName: `${agreement.agreement_number}-signed-rental-agreement.pdf`, documentType: "agreement_signed", relatedEntityType: "agreement", relatedEntityId: agreementId, templateVersion: agreement.template_version, generatedBy: ctx.user.id, signed: true, accessClassification: "customer" });
  await run(env.DB, `INSERT INTO agreement_acceptances (id,agreement_id,customer_name_typed,signature_document_id,accepted_at,ip_address,device_info,template_version,html_checksum,order_snapshot_json,checkbox_values_json,authority_confirmed,verification_code,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)`, id("acc"), agreementId, typedName, signed.id, acceptedAt, ctx.ip ?? null, ctx.user.email, agreement.template_version, agreement.html_checksum, agreement.snapshot_json, JSON.stringify({ rental_terms_accepted: true, electronic_signature_consent: true, authority_confirmed: true }), agreement.verification_code, acceptedAt);
  await run(env.DB, "UPDATE agreements SET status='accepted',accepted_at=?,acceptance_ip=?,acceptance_device_info=?,signed_pdf_document_id=?,customer_signature_document_id=?,updated_at=? WHERE id=?", acceptedAt, ctx.ip ?? null, ctx.user.email, signed.id, signed.id, acceptedAt, agreementId);
  await run(env.DB, "UPDATE orders SET agreement_status='accepted',current_agreement_id=?,updated_at=?,version=version+1 WHERE id=?", agreementId, acceptedAt, agreement.order_id);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "agreement.accepted", entityType: "agreement", entityId: agreementId, detail: { signedDocumentId: signed.id, typedName }, ip: ctx.ip });
  return { agreementId, signedDocumentId: signed.id, alreadyAccepted: false };
}
