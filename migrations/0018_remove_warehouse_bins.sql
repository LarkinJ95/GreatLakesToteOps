-- Warehouse-bin tracking was retired. Remove its assignments and physical-bin
-- catalog after all application queries were removed in the same release.
DROP TABLE IF EXISTS asset_bin_assignments;
DROP TABLE IF EXISTS bin_assignments;
DROP TABLE IF EXISTS warehouse_bins;
