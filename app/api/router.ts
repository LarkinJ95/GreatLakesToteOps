import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { dashboardRouter, leadsRouter, customersRouter, ordersRouter } from "./routers/coreOps";
import {
  dispatchRouter, billingRouter, inventoryRouter, catalogRouter,
  contentRouter, auditRouter,
} from "./routers/fieldOps";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  dashboard: dashboardRouter,
  leads: leadsRouter,
  customers: customersRouter,
  orders: ordersRouter,
  dispatch: dispatchRouter,
  billing: billingRouter,
  inventory: inventoryRouter,
  catalog: catalogRouter,
  content: contentRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
