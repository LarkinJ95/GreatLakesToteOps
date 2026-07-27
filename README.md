# Great Lakes ToteOps

Internal rental-inventory, dispatch, and field-operations system for Great Lakes Moving Totes LLC. It runs on Next.js App Router with the Cloudflare OpenNext adapter, D1, R2, and Queues.

## Local operation

1. Install dependencies with `npm ci`.
2. Apply the committed D1 schema and reference data:

   ```sh
   npm run db:migrate:local
   ```

3. Copy `dev.vars.example` to `.dev.vars`, then set a long, random `BOOTSTRAP_TOKEN` and `DOC_LINK_SECRET`. `.dev.vars` is ignored by Git.
4. Start the Worker-aware local server:

   ```sh
   npm run dev
   ```

5. Create the only initial owner. This endpoint closes permanently after it creates the first user:

   ```sh
   curl -X POST http://localhost:3000/api/auth/bootstrap \
     -H 'content-type: application/json' \
     -H 'x-bootstrap-token: YOUR_BOOTSTRAP_TOKEN' \
     --data '{"name":"Operations Owner","email":"owner@example.com","password":"use-a-unique-12-plus-character-password"}'
   ```

6. Sign in at `POST /api/auth/login`. The response sets the secure session cookie used by the authenticated API. `GET /api/auth/me` confirms the active role and permissions.

The dashboard shell is available at `http://localhost:3000`; live data is available from `GET /api/dashboard` after sign-in. Health is `GET /api/health`.

## Working API slice

- Authentication: bootstrap, login, logout, and current-session endpoints with PBKDF2 password hashing, HTTP-only sessions, Turnstile support, login audit records, and five-attempt lockouts.
- Customers: authenticated list/search and create endpoints.
- Assets: authenticated list/create endpoints; assets enter the state machine as `new`.
- Scanning: authenticated, idempotent scan endpoint; the asset state machine records immutable scan and status history.
- Dashboard: authenticated operational totals and today’s assignments.

All mutations require a role permission and append audit records.

## Validation

```sh
npm run typecheck
npm run build
```

## Cloudflare environment setup

The checked-in Wrangler configuration intentionally contains placeholder database IDs. Before a preview/staging/production deployment, create separate D1 databases and R2 buckets, then replace each placeholder `database_id` in `wrangler.jsonc` with the IDs returned by Wrangler. Configure the queues named in the same file and set secrets per environment:

```sh
wrangler secret put DOC_LINK_SECRET --env staging
wrangler secret put BOOTSTRAP_TOKEN --env staging
```

Use a unique bootstrap token in each environment and rotate it after the initial owner is created. Do not commit `.dev.vars`, production secrets, or Cloudflare credentials.

### Worker Builds configuration

Cloudflare Workers Builds must compile OpenNext before it invokes Wrangler. Set the deployment command for the production branch to:

```sh
npm run deploy:production
```

For a preview branch use `npm run deploy:preview`; for a staging branch use `npm run deploy:staging`. Do **not** use `npx wrangler deploy` directly: OpenNext correctly detects the project but it cannot deploy until `opennextjs-cloudflare build` has written `.open-next`.

As a compatibility fallback for Workers Builds projects that still use `npx wrangler deploy`, the `postinstall` hook runs the same Worker build during `npm ci`. Update the dashboard command anyway so the target environment remains explicit.
