-- 0008_seed_reference.sql — idempotent reference data (roles, permissions, packages, zones, taxes, settings)
-- All rows use stable IDs so re-running is safe (INSERT OR IGNORE).

INSERT OR IGNORE INTO branches (id, name, code, street, city, state, zip, phone, email, active, created_at, updated_at)
VALUES ('branch_midland', 'Midland HQ', 'MID', '3400 Bay City Rd', 'Midland', 'MI', '48642', '(989) 555-0142', 'ops@greatlakesmovingtotes.com', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO storage_locations (id, branch_id, name, code, active, created_at, updated_at) VALUES
('loc_mid_warehouse_a', 'branch_midland', 'Warehouse A - Clean Inventory', 'WH-A', 1, datetime('now'), datetime('now')),
('loc_mid_warehouse_b', 'branch_midland', 'Warehouse B - Returns & Cleaning', 'WH-B', 1, datetime('now'), datetime('now')),
('loc_mid_yard', 'branch_midland', 'Outdoor Yard - Trailers', 'YARD', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at) VALUES
('role_owner', 'Owner', 'Full access to all branches, settings, users, and audit records', 1, datetime('now'), datetime('now')),
('role_administrator', 'Administrator', 'Manages customers, orders, agreements, invoices, inventory, documents, pricing, reports', 1, datetime('now'), datetime('now')),
('role_dispatcher', 'Dispatcher', 'Manages assignments, routes, drivers, vehicles, and customer communication', 1, datetime('now'), datetime('now')),
('role_driver', 'Driver', 'Field delivery and pickup execution via mobile PWA', 1, datetime('now'), datetime('now')),
('role_warehouse', 'Warehouse Staff', 'Staging, loading, returns, cleaning, inspection, audits', 1, datetime('now'), datetime('now')),
('role_accountant', 'Accountant', 'Invoices, payments, refunds, credit memos, statements, accounting reports', 1, datetime('now'), datetime('now')),
('role_readonly', 'Read-Only Manager', 'View-only access to dashboards, reports, orders, assets, documents', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO permissions (id, permission_key, description) VALUES
('perm_dashboard.view', 'dashboard.view', 'View the operations dashboard'),
('perm_customers.view', 'customers.view', 'View customers'), ('perm_customers.create', 'customers.create', 'Create customers'),
('perm_customers.edit', 'customers.edit', 'Edit customers'), ('perm_customers.delete', 'customers.delete', 'Delete customers (owner only)'),
('perm_orders.view', 'orders.view', 'View orders'), ('perm_orders.create', 'orders.create', 'Create orders'),
('perm_orders.edit', 'orders.edit', 'Edit orders and run transitions'), ('perm_orders.cancel', 'orders.cancel', 'Cancel orders'),
('perm_quotes.view', 'quotes.view', 'View quotes'), ('perm_quotes.create', 'quotes.create', 'Create quotes'), ('perm_quotes.edit', 'quotes.edit', 'Edit quotes'),
('perm_agreements.view', 'agreements.view', 'View agreements and evidence'),
('perm_agreements.manage_templates', 'agreements.manage_templates', 'Create and version agreement templates'),
('perm_agreements.void', 'agreements.void', 'Void unsigned agreements'), ('perm_agreements.resend', 'agreements.resend', 'Resend agreement links'),
('perm_invoices.view', 'invoices.view', 'View invoices'), ('perm_invoices.create', 'invoices.create', 'Create invoices'),
('perm_invoices.finalize', 'invoices.finalize', 'Finalize invoices'), ('perm_invoices.void', 'invoices.void', 'Void invoices (owner only)'),
('perm_payments.record', 'payments.record', 'Record payments'), ('perm_payments.refund', 'payments.refund', 'Issue refunds'),
('perm_credit_memos.create', 'credit_memos.create', 'Create credit memos'), ('perm_credit_memos.approve', 'credit_memos.approve', 'Approve credit memos (owner only)'),
('perm_dispatch.view', 'dispatch.view', 'View dispatch calendar'), ('perm_dispatch.manage', 'dispatch.manage', 'Manage dispatch, routes, scheduling'),
('perm_assignments.view', 'assignments.view', 'View assignments'), ('perm_assignments.manage', 'assignments.manage', 'Manage assignments'),
('perm_assignments.complete_own', 'assignments.complete_own', 'Complete own field assignments'),
('perm_assets.view', 'assets.view', 'View assets'), ('perm_assets.manage', 'assets.manage', 'Manage assets'), ('perm_assets.retire', 'assets.retire', 'Retire assets'),
('perm_scans.create', 'scans.create', 'Submit asset scans'),
('perm_cleaning.manage', 'cleaning.manage', 'Manage cleaning and inspection'),
('perm_damage.report', 'damage.report', 'File damage reports'), ('perm_damage.approve', 'damage.approve', 'Approve damage charges'),
('perm_vehicles.view', 'vehicles.view', 'View vehicles'), ('perm_vehicles.manage', 'vehicles.manage', 'Manage vehicles'),
('perm_inventory.audit', 'inventory.audit', 'Run inventory audits'), ('perm_inventory.reconcile', 'inventory.reconcile', 'Approve audit reconciliation'),
('perm_reports.view', 'reports.view', 'View reports'), ('perm_reports.export', 'reports.export', 'Export reports'),
('perm_users.manage', 'users.manage', 'Manage users (owner only)'),
('perm_settings.manage', 'settings.manage', 'Manage application settings (owner only)'),
('perm_pricing.manage', 'pricing.manage', 'Manage packages and pricing rules'),
('perm_documents.view', 'documents.view', 'View documents'), ('perm_documents.download', 'documents.download', 'Download documents'),
('perm_audit.view', 'audit.view', 'View audit logs (owner only)'),
('perm_sync.review_conflicts', 'sync.review_conflicts', 'Review offline sync conflicts');

-- Owner: everything
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_owner', id FROM permissions;
-- Administrator: everything except owner-only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_administrator', id FROM permissions
  WHERE permission_key NOT IN ('users.manage','settings.manage','invoices.void','credit_memos.approve','customers.delete','audit.view');
-- Dispatcher
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_dispatcher', id FROM permissions
  WHERE permission_key IN ('dashboard.view','customers.view','orders.view','agreements.view','invoices.view',
    'dispatch.view','dispatch.manage','assignments.view','assignments.manage','assets.view','scans.create',
    'damage.report','vehicles.view','vehicles.manage','reports.view','documents.view','documents.download','sync.review_conflicts');
-- Driver
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_driver', id FROM permissions
  WHERE permission_key IN ('dashboard.view','assignments.view','assignments.complete_own','scans.create','damage.report','vehicles.view');
-- Warehouse
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_warehouse', id FROM permissions
  WHERE permission_key IN ('dashboard.view','customers.view','orders.view','assignments.view','assignments.complete_own',
    'assets.view','assets.manage','scans.create','cleaning.manage','damage.report','inventory.audit','documents.view','documents.download');
-- Accountant
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_accountant', id FROM permissions
  WHERE permission_key IN ('dashboard.view','customers.view','orders.view','quotes.view','agreements.view',
    'invoices.view','invoices.create','invoices.finalize','payments.record','payments.refund','credit_memos.create',
    'reports.view','reports.export','documents.view','documents.download');
-- Read-only manager
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT 'role_readonly', id FROM permissions
  WHERE permission_key IN ('dashboard.view','customers.view','orders.view','quotes.view','agreements.view','invoices.view',
    'dispatch.view','assignments.view','assets.view','vehicles.view','reports.view','documents.view','documents.download');

-- Rental packages (launch pricing; cents)
INSERT OR IGNORE INTO rental_packages (id, name, description, tote_quantity, dolly_quantity, included_rental_days,
  launch_price_cents, standard_price_cents, extra_day_price_cents, extra_week_price_cents, effective_date, active, is_custom, created_at, updated_at) VALUES
('pkg_quick_pack', 'Quick Pack', 'Studio or dorm move: 12 totes and 1 dolly for 7 days', 12, 1, 7, 9900, 12900, 1000, 4900, '2026-01-01', 1, 0, datetime('now'), datetime('now')),
('pkg_apartment', 'Apartment', 'One to two bedroom apartment: 20 totes and 1 dolly for 14 days', 20, 1, 14, 14900, 18900, 1200, 5900, '2026-01-01', 1, 0, datetime('now'), datetime('now')),
('pkg_home', 'Home', 'Two to three bedroom home: 40 totes and 2 dollies for 14 days', 40, 2, 14, 22900, 28900, 1500, 7900, '2026-01-01', 1, 0, datetime('now'), datetime('now')),
('pkg_large_home', 'Large Home', 'Four plus bedroom home: 60 totes and 3 dollies for 14 days', 60, 3, 14, 31900, 39900, 1900, 9900, '2026-01-01', 1, 0, datetime('now'), datetime('now')),
('pkg_estate_office', 'Estate or Office', 'Large estate or office relocation: 100 totes and 5 dollies for 14 days', 100, 5, 14, 49900, 62900, 2900, 14900, '2026-01-01', 1, 0, datetime('now'), datetime('now')),
('pkg_custom', 'Custom Package', 'Custom tote and equipment mix priced per order', 0, 0, 14, 0, 0, 1500, 7900, '2026-01-01', 1, 1, datetime('now'), datetime('now'));

-- Service zones (Great Lakes Bay Region)
INSERT OR IGNORE INTO service_zones (id, name, cities, zone_fee_cents, active, created_at, updated_at) VALUES
('zone_1_midland', 'Zone 1 - Midland Area', 'Midland,Auburn,Sanford,Coleman', 0, 1, datetime('now'), datetime('now')),
('zone_2_saginaw_bay', 'Zone 2 - Saginaw & Bay City', 'Saginaw,Bay City,Freeland,University Center,Essexville', 2500, 1, datetime('now'), datetime('now')),
('zone_3_glbr', 'Zone 3 - Greater GLBR', 'Zilwaukee,Frankenmuth,Birch Run,Bridgeport,Carrollton,Pinconning,Standish,Kawkawlin,Linwood,Merrill,Hemlock,St. Charles', 4500, 1, datetime('now'), datetime('now'));

-- Michigan sales tax 6%
INSERT OR IGNORE INTO tax_jurisdictions (id, name, state, county, rate_percent, applies_to_rental, applies_to_delivery, active, created_at, updated_at) VALUES
('tax_mi_6', 'Michigan Sales Tax', 'MI', NULL, 6.0, 1, 1, 1, datetime('now'), datetime('now'));

-- App settings
INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at) VALUES
('company.legal_name', 'Great Lakes Moving Totes LLC', datetime('now')),
('company.app_name', 'Great Lakes ToteOps', datetime('now')),
('company.tagline', 'Pack. Stack. Move. Done.', datetime('now')),
('company.street', '3400 Bay City Rd', datetime('now')),
('company.city', 'Midland', datetime('now')),
('company.state', 'MI', datetime('now')),
('company.zip', '48642', datetime('now')),
('company.phone', '(989) 555-0142', datetime('now')),
('company.email', 'ops@greatlakesmovingtotes.com', datetime('now')),
('numbering.order', 'GLMT-ORD-{year}-{seq:6}', datetime('now')),
('numbering.quote', 'GLMT-QTE-{year}-{seq:6}', datetime('now')),
('numbering.invoice', 'GLMT-INV-{year}-{seq:6}', datetime('now')),
('numbering.credit_memo', 'GLMT-CRM-{year}-{seq:6}', datetime('now')),
('numbering.receipt', 'GLMT-RCT-{year}-{seq:6}', datetime('now')),
('numbering.agreement', 'GLMT-AGR-{year}-{seq:6}', datetime('now')),
('numbering.assignment', 'GLMT-ASN-{year}-{seq:6}', datetime('now')),
('agreement.expiration_days', '7', datetime('now')),
('rental.grace_period_hours', '24', datetime('now'));

-- Document counters (rows for several years ahead; numbering uses the row for the current year)
INSERT OR IGNORE INTO document_counters (doc_type, year, next_value) VALUES
('order', 2026, 1), ('quote', 2026, 1), ('invoice', 2026, 1), ('credit_memo', 2026, 1),
('receipt', 2026, 1), ('agreement', 2026, 1), ('assignment', 2026, 1), ('audit', 2026, 1),
('order', 2027, 1), ('quote', 2027, 1), ('invoice', 2027, 1), ('credit_memo', 2027, 1),
('receipt', 2027, 1), ('agreement', 2027, 1), ('assignment', 2027, 1), ('audit', 2027, 1),
('order', 2028, 1), ('quote', 2028, 1), ('invoice', 2028, 1), ('credit_memo', 2028, 1),
('receipt', 2028, 1), ('agreement', 2028, 1), ('assignment', 2028, 1), ('audit', 2028, 1);

-- Notification templates
INSERT OR IGNORE INTO notification_templates (id, template_key, channel, subject, body, active, updated_at) VALUES
('ntpl_quote_created', 'quote_created', 'email', 'Your Great Lakes Moving Totes quote {{quote_number}}', 'Hi {{customer_name}}, your quote {{quote_number}} for {{package_name}} is ready. Review and approve it here: {{portal_link}}. It expires on {{expiration_date}}. — Great Lakes Moving Totes, Pack. Stack. Move. Done.', 1, datetime('now')),
('ntpl_quote_approved', 'quote_approved', 'email', 'Quote {{quote_number}} approved', 'Thanks {{customer_name}} — your quote {{quote_number}} is approved. Your rental agreement is on its way for review and signature.', 1, datetime('now')),
('ntpl_quote_expiring', 'quote_expiring', 'email', 'Your quote {{quote_number}} expires soon', 'Hi {{customer_name}}, quote {{quote_number}} expires on {{expiration_date}}. Approve it here to keep your dates: {{portal_link}}.', 1, datetime('now')),
('ntpl_agreement_ready', 'agreement_ready', 'email', 'Your rental agreement is ready to review', 'Hi {{customer_name}}, your rental agreement {{agreement_number}} for order {{order_number}} is ready. Review and sign securely: {{portal_link}}. This link expires on {{expiration_date}}.', 1, datetime('now')),
('ntpl_agreement_viewed', 'agreement_viewed', 'in_app', 'Agreement viewed', 'Agreement {{agreement_number}} was viewed by the customer.', 1, datetime('now')),
('ntpl_agreement_accepted', 'agreement_accepted', 'email', 'Agreement {{agreement_number}} signed', 'Thanks {{customer_name}} — your signed agreement {{agreement_number}} is complete. A copy is attached and available in your portal.', 1, datetime('now')),
('ntpl_agreement_declined', 'agreement_declined', 'email', 'Agreement {{agreement_number}} declined', 'Agreement {{agreement_number}} was declined. Reason: {{decline_reason}}. Our team will follow up.', 1, datetime('now')),
('ntpl_agreement_reminder', 'agreement_reminder', 'email', 'Reminder: sign your rental agreement', 'Hi {{customer_name}}, your agreement {{agreement_number}} is still waiting for signature and expires {{expiration_date}}: {{portal_link}}.', 1, datetime('now')),
('ntpl_reservation_confirmation', 'reservation_confirmation', 'email', 'Reservation confirmed for {{delivery_date}}', 'Your tote rental is confirmed! Delivery is scheduled for {{delivery_date}} between {{window_start}} and {{window_end}} at {{delivery_address}}.', 1, datetime('now')),
('ntpl_deposit_invoice', 'deposit_invoice', 'email', 'Deposit invoice {{invoice_number}}', 'Your deposit invoice {{invoice_number}} for {{amount}} is ready: {{portal_link}}.', 1, datetime('now')),
('ntpl_payment_reminder', 'payment_reminder', 'email', 'Payment reminder for invoice {{invoice_number}}', 'A friendly reminder that invoice {{invoice_number}} for {{amount}} is due {{due_date}}: {{portal_link}}.', 1, datetime('now')),
('ntpl_payment_receipt', 'payment_receipt', 'email', 'Payment receipt {{receipt_number}}', 'Thank you! We received your payment of {{amount}}. Receipt {{receipt_number}} is attached.', 1, datetime('now')),
('ntpl_delivery_reminder', 'delivery_reminder', 'sms', NULL, 'Great Lakes Moving Totes: your totes arrive {{delivery_date}} {{window_start}}-{{window_end}} at {{delivery_address}}. Questions? (989) 555-0142.', 1, datetime('now')),
('ntpl_driver_en_route', 'driver_en_route', 'sms', NULL, 'Great Lakes Moving Totes: your driver is on the way to {{delivery_address}}.', 1, datetime('now')),
('ntpl_delivery_completed', 'delivery_completed', 'email', 'Your totes were delivered', 'Your {{package_name}} was delivered today to {{delivery_address}}. Photos and details are in your portal: {{portal_link}}.', 1, datetime('now')),
('ntpl_pickup_reminder', 'pickup_reminder', 'sms', NULL, 'Great Lakes Moving Totes: pickup is scheduled {{pickup_date}} {{window_start}}-{{window_end}}. Please have totes empty and stacked.', 1, datetime('now')),
('ntpl_pickup_completed', 'pickup_completed', 'email', 'Your totes were picked up', 'Pickup is complete for order {{order_number}}. Your pickup reconciliation is in your portal: {{portal_link}}.', 1, datetime('now')),
('ntpl_pickup_reconciliation', 'pickup_reconciliation', 'email', 'Pickup reconciliation for order {{order_number}}', 'Returned: {{returned_count}} of {{expected_count}} totes. {{exception_summary}}', 1, datetime('now')),
('ntpl_failed_delivery', 'failed_delivery', 'email', 'We could not complete your delivery', 'We were unable to complete your delivery today ({{failed_reason}}). Please contact us to reschedule: (989) 555-0142.', 1, datetime('now')),
('ntpl_failed_pickup', 'failed_pickup', 'email', 'We could not complete your pickup', 'We were unable to complete your pickup today ({{failed_reason}}). Please contact us to reschedule: (989) 555-0142.', 1, datetime('now')),
('ntpl_extension_approved', 'extension_approved', 'email', 'Your rental extension is approved', 'Your rental for order {{order_number}} is extended to {{new_pickup_date}}.', 1, datetime('now')),
('ntpl_extension_invoice', 'extension_invoice', 'email', 'Extension invoice {{invoice_number}}', 'Your rental extension invoice {{invoice_number}} for {{amount}} is ready: {{portal_link}}.', 1, datetime('now')),
('ntpl_missing_equipment', 'missing_equipment_notice', 'email', 'Missing equipment notice for order {{order_number}}', 'Our pickup reconciliation shows {{missing_count}} item(s) not returned. Details and invoice: {{portal_link}}.', 1, datetime('now')),
('ntpl_damage_notice', 'damage_notice', 'email', 'Damage notice for order {{order_number}}', 'Damage was documented on returned equipment. Evidence and any approved charges are in your portal: {{portal_link}}.', 1, datetime('now')),
('ntpl_additional_invoice', 'additional_invoice', 'email', 'Additional invoice {{invoice_number}}', 'An additional invoice {{invoice_number}} for {{amount}} has been issued on your account: {{portal_link}}.', 1, datetime('now')),
('ntpl_credit_memo', 'credit_memo', 'email', 'Credit memo {{credit_memo_number}}', 'A credit of {{amount}} has been applied to your account. Credit memo {{credit_memo_number}} is attached.', 1, datetime('now')),
('ntpl_refund_receipt', 'refund_receipt', 'email', 'Refund receipt {{refund_number}}', 'Your refund of {{amount}} has been processed. Receipt {{refund_number}} is attached.', 1, datetime('now')),
('ntpl_overdue_invoice', 'overdue_invoice', 'email', 'Invoice {{invoice_number}} is overdue', 'Invoice {{invoice_number}} for {{amount}} was due {{due_date}}. Please pay here: {{portal_link}}.', 1, datetime('now')),
('ntpl_monthly_statement', 'monthly_statement', 'email', 'Your {{month}} account statement', 'Your {{month}} statement for account {{account_number}} is attached. Closing balance: {{closing_balance}}.', 1, datetime('now')),
('ntpl_review_request', 'review_request', 'email', 'How was your move?', 'Thanks for choosing Great Lakes Moving Totes! Would you share a quick review? {{review_link}}', 1, datetime('now'));
