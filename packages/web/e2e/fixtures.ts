import { test as base } from "@playwright/test";

/**
 * Shared fixture: unregister service workers so SPA navigations are not
 * interrupted by PWA controller updates during E2E.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
    });
    await use(context);
  },
});

export { expect } from "@playwright/test";
