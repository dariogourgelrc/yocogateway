import type {
  ClientTrackerProvider,
  ProductTracker,
  CheckoutData,
  PurchaseData,
} from "@/lib/supabase/types";
import { FacebookPixelTracker } from "./providers/facebook-pixel";

const CLIENT_PROVIDERS: Record<string, ClientTrackerProvider> = {
  facebook: FacebookPixelTracker,
};

function initClientProvider(
  type: string,
  trackerId: string
): ClientTrackerProvider | null {
  const provider = CLIENT_PROVIDERS[type];
  if (!provider) {
    console.warn(`Unknown client tracker type: ${type}`);
    return null;
  }
  provider.init(trackerId);
  return provider;
}

export function createTrackerManager(configs: ProductTracker[]) {
  const clientProviders = configs
    .filter((c) => c.side === "client")
    .map((c) => initClientProvider(c.type, c.tracker_id))
    .filter((p): p is ClientTrackerProvider => p !== null);

  return {
    pageView: () => clientProviders.forEach((p) => p.pageView()),
    initiateCheckout: (data: CheckoutData) =>
      clientProviders.forEach((p) => p.initiateCheckout(data)),
    purchase: (data: PurchaseData) =>
      clientProviders.forEach((p) => p.purchase(data)),
  };
}
