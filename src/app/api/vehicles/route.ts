import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, run } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";

function optionalInteger(value: unknown, label: string, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new ValidationError(`${label} must be a whole number between ${min} and ${max}`);
  return parsed;
}

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "vehicles.view", "dispatch.view");
  const env = await getEnv();
  const vehicles = await q(env.DB, "SELECT id,unit_number,year,make,model,license_plate,max_tote_capacity,active FROM vehicles ORDER BY active DESC,unit_number");
  return Response.json({ vehicles });
});

export const POST = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "vehicles.manage", "dispatch.manage");
  const env = await getEnv();
  const body = await jsonBody<Record<string, unknown>>(request);
  const unitNumber = requiredString(body.unitNumber, "Unit number", 40).toUpperCase();
  const existing = await one<{ id: string }>(env.DB, "SELECT id FROM vehicles WHERE unit_number=?", unitNumber);
  if (existing) throw new ValidationError("A vehicle with that unit number already exists");
  const vehicleId = id("veh");
  const values = {
    year: optionalInteger(body.year, "Year", 1900, 2100),
    make: optionalString(body.make, "Make", 80),
    model: optionalString(body.model, "Model", 80),
    licensePlate: optionalString(body.licensePlate, "License plate", 30),
    cargoCapacity: optionalInteger(body.cargoCapacityCuft, "Cargo capacity", 1, 100000),
    toteCapacity: optionalInteger(body.maxToteCapacity, "Tote capacity", 1, 10000) ?? 60,
    notes: optionalString(body.notes, "Notes", 4000),
  };
  await run(env.DB, "INSERT INTO vehicles (id,unit_number,year,make,model,license_plate,cargo_capacity_cuft,max_tote_capacity,active,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?,?)", vehicleId, unitNumber, values.year, values.make, values.model, values.licensePlate, values.cargoCapacity, values.toteCapacity, values.notes, nowIso(), nowIso());
  await audit(env.DB, { actorUserId: ctx.user.id, action: "vehicle.created", entityType: "vehicle", entityId: vehicleId, detail: { unitNumber, ...values }, ip: ctx.ip });
  return Response.json({ id: vehicleId, unitNumber }, { status: 201 });
});
