-- Default approved agreement template used by the order workspace generator.
-- The generated agreement stores an immutable order/customer snapshot and PDF;
-- edits to a future template never alter an already-issued agreement.
INSERT OR IGNORE INTO agreement_templates
  (id, name, description, template_type, jurisdiction, customer_type, active, created_at, updated_at)
VALUES
  ('tmpl_standard_rental', 'Standard Tote Rental Agreement', 'Great Lakes Moving Totes residential rental agreement', 'standard_residential', 'MI', 'any', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO agreement_template_versions
  (id, template_id, version, status, effective_date, html_body, print_css, created_at)
VALUES
  ('tmpl_standard_rental_v1', 'tmpl_standard_rental', 1, 'active', '2026-07-29',
   '<h1>Great Lakes Moving Totes Rental Agreement</h1><p>Order-specific terms are merged at generation time and retained as an immutable agreement snapshot.</p>',
   NULL, datetime('now'));
