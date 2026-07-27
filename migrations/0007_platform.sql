-- 0007_platform.sql — documents, notifications, jobs, sync, webhooks, audit
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  bucket TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'agreement_unsigned','agreement_signed','agreement_template','invoice','quote','receipt',
    'refund_receipt','credit_memo','statement','delivery_photo','pickup_photo','damage_photo',
    'customer_signature','employee_signature','tax_exemption','vehicle_document',
    'asset_label_sheet','report_export','customer_upload','preview')),
  related_entity_type TEXT,
  related_entity_id TEXT,
  template_version INTEGER,
  generated_by TEXT,
  generated_at TEXT NOT NULL,
  signed INTEGER NOT NULL DEFAULT 0,
  retention_category TEXT NOT NULL DEFAULT 'operational_2y' CHECK (retention_category IN ('permanent','financial_7y','operational_2y','temporary_30d')),
  access_classification TEXT NOT NULL DEFAULT 'internal' CHECK (access_classification IN ('internal','customer','financial','restricted')),
  verification_code TEXT UNIQUE,
  deleted_at TEXT
);
CREATE INDEX idx_documents_entity ON documents(related_entity_type, related_entity_id);
CREATE INDEX idx_documents_type ON documents(document_type);

CREATE TABLE notification_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','push','in_app')),
  subject TEXT,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  template_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','push','in_app')),
  recipient TEXT NOT NULL,
  recipient_customer_id TEXT,
  recipient_user_id TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','cancelled')),
  scheduled_at TEXT,
  sent_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notifications_status ON notifications(status, scheduled_at);
CREATE INDEX idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

CREATE TABLE job_records (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','dead_lettered','requeued')),
  requested_by TEXT,
  requested_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  completed_at TEXT,
  payload_json TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_jobs_type_status ON job_records(job_type, status);

CREATE TABLE offline_mutations (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  client_mutation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  device_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_version INTEGER,
  mutation_type TEXT NOT NULL,
  device_timestamp TEXT NOT NULL,
  received_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','duplicate','conflict','error','rejected','force_applied')),
  error_code TEXT,
  resolved_by TEXT,
  resolved_at TEXT
);
CREATE INDEX idx_offline_user ON offline_mutations(user_id, status);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  outcome TEXT NOT NULL,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,           -- NULL = system
  actor_label TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  detail_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id, created_at);
