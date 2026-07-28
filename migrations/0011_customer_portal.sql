-- Dedicated principal for customer-only sessions. It has no staff permissions.
INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at)
VALUES ('role_customer_portal', 'Customer Portal', 'Restricted customer self-service sessions', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, name, email, password_hash, role_id, active, created_at, updated_at)
VALUES ('usr_customer_portal', 'Customer Portal', 'portal@internal.invalid', 'portal-session-only', 'role_customer_portal', 1, datetime('now'), datetime('now'));
