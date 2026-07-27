import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The adapter supplies Workers-safe defaults for the server wrapper, converter,
// request proxy, cache and queue implementations. An empty hand-written config
// is rejected by current OpenNext releases.
export default defineCloudflareConfig();
