# 10 — Asset State-Transition Diagram

Implemented in `src/lib/services/assetService.ts` (`ASSET_TRANSITIONS` map). Clients never
write `assets.current_status` directly — they submit **scan events**; the state machine
validates and applies them. Each scan writes an immutable `asset_scan_events` row and an
`asset_status_history` row.

## Statuses

`new, clean_inventory, reserved, staged, loaded, out_for_delivery, delivered, rented,
pickup_scheduled, picked_up, dirty_return, cleaning, inspection_required, quarantine,
repair_required, missing, damaged, retired`

## Transition map

```
new ──► clean_inventory                 (receiving scan / inspection pass)

clean_inventory ──► reserved            (order reservation)
reserved ──► staged                     (STAGE scan)
reserved ──► clean_inventory            (reservation released / order cancelled)
staged ──► loaded                       (LOAD scan onto vehicle)
staged ──► clean_inventory              (unstage)
loaded ──► out_for_delivery             (route departure)
loaded ──► staged                       (unload back to staging)
out_for_delivery ──► delivered          (DELIVERY scan + photo + signature)
delivered ──► rented                    (delivery completion)
rented ──► pickup_scheduled             (pickup assigned)
pickup_scheduled ──► picked_up          (PICKUP scan)
picked_up ──► dirty_return              (WAREHOUSE RETURN scan)
picked_up ──► damaged                   (damage found at pickup)
picked_up ──► missing                   (not returned — via reconciliation)
dirty_return ──► cleaning               (cleaning started)
cleaning ──► inspection_required        (cleaning complete)
inspection_required ──► clean_inventory (inspection PASS)
inspection_required ──► repair_required (inspection: repair)
inspection_required ──► quarantine      (inspection: quarantine)
inspection_required ──► retired         (inspection: retire — requires assets.retire)
repair_required ──► clean_inventory     (repair completed + inspection pass)
repair_required ──► retired
quarantine ──► cleaning                 (cleared for reprocessing)
quarantine ──► retired
missing ──► dirty_return                (recovered)
missing ──► retired                     (written off — requires assets.retire)
damaged ──► repair_required             (damage review: repairable)
damaged ──► retired                     (damage review: write-off)
damaged ──► dirty_return                (damage review: cosmetic only)
any non-final ──► retired               (manager action only)
```

`retired` is terminal.

## Scan modes → transitions

| Scan mode | Typical transition | Extra effects |
|---|---|---|
| `stage` | reserved → staged | validates asset type vs package; duplicate/wrong-order warnings |
| `load` | staged → loaded | validates vehicle + capacity |
| `unload` | loaded → staged | |
| `deliver` | loaded/out_for_delivery → delivered → rented | requires photo + signature/contactless |
| `pickup` | rented/pickup_scheduled → picked_up | captures return condition |
| `warehouse_return` | picked_up → dirty_return | creates cleaning task; contamination → quarantine |
| `clean_start` / `clean_complete` | dirty_return → cleaning → inspection_required | writes `cleaning_records` |
| `inspect` | inspection_required → pass/repair/quarantine/retire | decision recorded |
| `audit` | none (event only) | feeds inventory audit reconciliation |
| `quarantine` / `repair` / `retire` / `mark_missing` / `recover` | per map above | restricted modes |

## Warnings the scanner surfaces (server-computed, returned per scan)

- `duplicate_scan` — same asset scanned in the same mode/batch.
- `invalid_asset` — unknown QR/barcode.
- `wrong_order` — asset reserved for a different order.
- `status_conflict` — requested transition not in the map (event stored with
  `exception_code`, status unchanged).
- `capacity_warning` — vehicle over tote capacity.
