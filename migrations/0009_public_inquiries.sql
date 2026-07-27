CREATE TABLE public_inquiries (
  id TEXT PRIMARY KEY,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('availability','reservation','contact','business_account')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','contacted','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_public_inquiries_status ON public_inquiries(status, created_at);
