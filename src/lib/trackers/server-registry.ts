import type {
  ServerTrackerProvider,
  OrderWithItems,
  ProductTracker,
} from "@/lib/supabase/types";
import { FacebookCAPITracker } from "./providers/facebook-capi";
import { UTMifyTracker } from "./providers/utmify";

const SERVER_PROVIDERS: Record<string, ServerTrackerProvider> = {
  facebook: FacebookCAPITracker,
  utmify: UTMifyTracker,
};

export async function fireServerTrackers(
  event: "orderCreated" | "orderPaid",
  order: OrderWithItems,
  configs: ProductTracker[]
) {
  const serverConfigs = configs.filter((c) => c.side === "server");

  const results = await Promise.allSettled(
    serverConfigs.map((config) => {
      const provider = SERVER_PROVIDERS[config.type];
      if (!provider) {
        console.warn(`Unknown server tracker type: ${config.type}`);
        return Promise.resolve();
      }
      return event === "orderCreated"
        ? provider.onOrderCreated(order, config)
        : provider.onOrderPaid(order, config);
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Server tracker failed:", result.reason);
    }
  }
}
