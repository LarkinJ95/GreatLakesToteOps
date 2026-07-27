// Shared domain types — mirrors migrations/. Money is always integer cents.

export type OrderStatus =
  | "inquiry" | "quote" | "awaiting_customer_approval" | "awaiting_agreement"
  | "awaiting_payment" | "confirmed" | "equipment_reserved" | "staged"
  | "delivery_assigned" | "out_for_delivery" | "delivered" | "active_rental"
  | "pickup_scheduled" | "pickup_assigned" | "picked_up" | "equipment_reconciliation"
  | "cleaning" | "final_invoice_review" | "completed" | "closed"
  | "cancelled" | "rescheduled" | "delivery_failed" | "pickup_failed" | "late_rental"
  | "missing_equipment" | "damage_review" | "agreement_declined" | "agreement_expired"
  | "payment_dispute";

export type AssetStatus =
  | "new" | "clean_inventory" | "reserved" | "staged" | "loaded" | "out_for_delivery"
  | "delivered" | "rented" | "pickup_scheduled" | "picked_up" | "dirty_return"
  | "cleaning" | "inspection_required" | "quarantine" | "repair_required"
  | "missing" | "damaged" | "retired";

export type ScanMode =
  | "receive" | "stage" | "unstage" | "load" | "unload" | "deliver" | "pickup"
  | "warehouse_return" | "clean_start" | "clean_complete" | "inspect" | "audit"
  | "quarantine" | "repair" | "retire" | "mark_missing" | "recover";

export type AssetType = "tote" | "dolly" | "hand_truck" | "blanket_pack" | "trailer" | "vehicle" | "other";

export type AssignmentType =
  | "delivery" | "pickup" | "swap" | "redelivery" | "failed_pickup_followup"
  | "inventory_transfer" | "warehouse_task" | "cleaning_task" | "repair_task";

export type AssignmentStatus = "scheduled" | "en_route" | "arrived" | "in_progress" | "completed" | "failed" | "cancelled";

export type AgreementStatus =
  | "draft" | "generated" | "sent" | "viewed" | "accepted"
  | "declined" | "expired" | "superseded" | "voided";

export type TemplateType =
  | "standard_residential" | "business_account" | "custom_project" | "equipment_amendment"
  | "extension_amendment" | "damage_acknowledgment" | "contactless_authorization";

export type InvoiceType =
  | "standard" | "deposit" | "final_rental" | "business_account" | "damage"
  | "missing_equipment" | "extension" | "failed_pickup" | "monthly_consolidated"
  | "credit_memo" | "receipt" | "refund_receipt";

export type InvoiceStatus =
  | "draft" | "pending_approval" | "finalized" | "sent" | "partially_paid"
  | "paid" | "overdue" | "disputed" | "voided" | "written_off";

export type LineItemType =
  | "package_rental" | "extra_tote" | "extra_day" | "extra_week" | "delivery_zone"
  | "access_fee" | "hand_truck_rental" | "blanket_rental" | "qr_label_kit"
  | "failed_pickup" | "redelivery" | "cleaning" | "repair" | "missing_equipment"
  | "damaged_equipment" | "discount" | "credit" | "custom";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "refunded" | "terms";

export type DocumentType =
  | "agreement_unsigned" | "agreement_signed" | "agreement_template" | "invoice" | "quote"
  | "receipt" | "refund_receipt" | "credit_memo" | "statement" | "delivery_photo"
  | "pickup_photo" | "damage_photo" | "customer_signature" | "employee_signature"
  | "tax_exemption" | "vehicle_document" | "asset_label_sheet" | "report_export"
  | "customer_upload" | "preview";

export type JobType =
  | "agreement_pdf.generate" | "agreement_pdf.generate_signed" | "invoice_pdf.generate"
  | "quote_pdf.generate" | "receipt.generate" | "credit_memo_pdf.generate"
  | "statement.generate_monthly" | "report.export" | "email.send" | "sms.send"
  | "push.send" | "review_request.send" | "photo.process" | "retention.process";

// ---- Row interfaces (subset of columns used by services) ----

export interface UserRow {
  id: string; name: string; email: string; phone: string | null;
  password_hash: string; role_id: string; branch_id: string | null;
  active: number; last_login_at: string | null; failed_login_count: number;
  locked_until: string | null; created_at: string; updated_at: string; deleted_at: string | null;
}

export interface CustomerRow {
  id: string; customer_number: string; customer_type: "residential" | "business";
  first_name: string | null; last_name: string | null; business_name: string | null;
  primary_phone: string | null; secondary_phone: string | null; email: string | null;
  billing_address_id: string | null; notes: string | null;
  marketing_consent: number; referral_source: string | null; referral_partner_id: string | null;
  tax_exempt: number; tax_exemption_document_id: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

export interface AddressRow {
  id: string; customer_id: string; label: string; street: string; unit: string | null;
  city: string; state: string; zip: string; county: string | null;
  latitude: number | null; longitude: number | null;
  gate_code: string | null; parking_instructions: string | null; stair_info: string | null;
  elevator_info: string | null; delivery_notes: string | null; contactless_allowed: number;
  created_at: string; updated_at: string;
}

export interface PackageRow {
  id: string; name: string; description: string | null;
  tote_quantity: number; dolly_quantity: number; included_rental_days: number;
  launch_price_cents: number; standard_price_cents: number;
  extra_day_price_cents: number; extra_week_price_cents: number;
  effective_date: string; expiration_date: string | null; active: number; is_custom: number;
}

export interface OrderRow {
  id: string; order_number: string; customer_id: string; business_account_id: string | null;
  order_status: OrderStatus; package_id: string | null;
  rental_start_date: string | null; scheduled_delivery_date: string | null;
  scheduled_pickup_date: string | null; actual_delivery_at: string | null; actual_pickup_at: string | null;
  delivery_address_id: string | null; pickup_address_id: string | null;
  sales_channel: string | null; referral_code: string | null; purchase_order_number: string | null;
  base_rental_cents: number; zone_fee_cents: number; access_fee_cents: number;
  add_on_cents: number; discount_cents: number; tax_cents: number; total_cents: number;
  amount_paid_cents: number; amount_credited_cents: number; balance_due_cents: number;
  pricing_snapshot_json: string | null;
  payment_status: PaymentStatus;
  agreement_status: string; current_agreement_id: string | null; requires_agreement: number;
  internal_notes: string | null; customer_notes: string | null;
  created_by: string | null; created_at: string; updated_at: string;
  deleted_at: string | null; version: number;
}

export interface AssetRow {
  id: string; asset_number: string; qr_code_value: string; barcode_value: string | null;
  asset_type: AssetType; manufacturer: string | null; model: string | null; color: string | null;
  purchase_date: string | null; purchase_cost_cents: number | null; replacement_cost_cents: number;
  branch_id: string | null; storage_location_id: string | null;
  current_status: AssetStatus; current_condition: string;
  current_order_id: string | null; current_customer_id: string | null;
  current_assignment_id: string | null; current_vehicle_id: string | null;
  last_scan_at: string | null; last_cleaned_at: string | null; last_inspected_at: string | null;
  total_rental_count: number; total_days_rented: number; notes: string | null;
  retired_at: string | null; created_at: string; updated_at: string; version: number;
}

export interface AssignmentRow {
  id: string; assignment_number: string; assignment_type: AssignmentType;
  order_id: string | null; assigned_employee_id: string | null; vehicle_id: string | null;
  scheduled_date: string; window_start: string | null; window_end: string | null;
  route_id: string | null; route_order: number | null; priority: number;
  status: AssignmentStatus; address_id: string | null;
  arrival_at: string | null; departure_at: string | null;
  arrival_latitude: number | null; arrival_longitude: number | null;
  completion_latitude: number | null; completion_longitude: number | null;
  completion_notes: string | null; customer_signature_document_id: string | null;
  failed_reason: string | null; branch_id: string | null;
  created_by: string | null; created_at: string; updated_at: string; version: number;
}

export interface AgreementRow {
  id: string; agreement_number: string; order_id: string; customer_id: string;
  template_id: string; template_version: number; status: AgreementStatus;
  snapshot_json: string; rendered_html: string | null; html_checksum: string;
  unsigned_pdf_document_id: string | null; signed_pdf_document_id: string | null;
  sent_at: string | null; viewed_at: string | null; accepted_at: string | null;
  declined_at: string | null; expires_at: string | null; superseded_at: string | null;
  voided_at: string | null; decline_reason: string | null;
  acceptance_ip: string | null; acceptance_device_info: string | null;
  customer_signature_document_id: string | null; company_signature_document_id: string | null;
  verification_code: string; portal_token_hash: string | null; portal_token_expires_at: string | null;
  created_at: string; updated_at: string;
}

export interface InvoiceRow {
  id: string; invoice_number: string; invoice_type: InvoiceType; customer_id: string;
  business_account_id: string | null; order_id: string | null; status: InvoiceStatus;
  issue_date: string; due_date: string | null; service_date: string | null; currency: string;
  subtotal_cents: number; discount_total_cents: number; taxable_subtotal_cents: number;
  tax_total_cents: number; total_cents: number; amount_paid_cents: number;
  credit_total_cents: number; balance_due_cents: number;
  payment_terms: string | null; purchase_order_number: string | null;
  customer_billing_snapshot_json: string; company_snapshot_json: string; tax_snapshot_json: string | null;
  notes: string | null; internal_notes: string | null;
  finalized_at: string | null; voided_at: string | null; superseded_invoice_id: string | null;
  pdf_document_id: string | null; verification_code: string;
  created_by: string | null; created_at: string; updated_at: string; version: number;
}

export interface InvoiceLineRow {
  id: string; invoice_id: string; line_order: number; item_type: LineItemType;
  description: string; service_date: string | null; quantity: number; unit: string;
  unit_price_cents: number; discount_cents: number; taxable: number;
  tax_rate_percent: number; tax_cents: number;
  line_subtotal_cents: number; line_total_cents: number;
  related_asset_id: string | null; related_assignment_id: string | null; related_damage_report_id: string | null;
}

export interface DocumentRow {
  id: string; object_key: string; bucket: string; file_name: string; mime_type: string;
  size_bytes: number; checksum_sha256: string; document_type: DocumentType;
  related_entity_type: string | null; related_entity_id: string | null;
  template_version: number | null; generated_by: string | null; generated_at: string;
  signed: number; retention_category: string; access_classification: string;
  verification_code: string | null; deleted_at: string | null;
}

export interface AuthContext {
  user: UserRow;
  roleName: string;
  permissions: Set<string>;
  sessionId: string;
  portalCustomerId: string | null;
  ip: string | null;
}

export interface OfflineMutation {
  clientMutationId: string; idempotencyKey: string;
  entityType: string; entityId: string | null; entityVersion: number | null;
  mutationType: string; deviceTimestamp: string;
  userId: string; deviceId: string | null;
  payload: Record<string, unknown>; attachmentRefs?: string[]; retryCount?: number;
}

export type SyncOutcome = "applied" | "duplicate" | "conflict" | "error";

export interface SyncResultItem {
  clientMutationId: string; idempotencyKey: string;
  outcome: SyncOutcome; errorCode?: string; serverVersion?: number;
}
