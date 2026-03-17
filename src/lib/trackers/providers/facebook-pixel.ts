import type {
  ClientTrackerProvider,
  CheckoutData,
  PurchaseData,
} from "@/lib/supabase/types";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue: unknown[];
      push: (...args: unknown[]) => void;
      loaded: boolean;
      version: string;
    };
  }
}

export const FacebookPixelTracker: ClientTrackerProvider = {
  type: "facebook",

  init(pixelId: string) {
    if (typeof window === "undefined") return;
    if (window.fbq) return; // already loaded

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n: any = function (...args: unknown[]) {
      if (n.callMethod) {
        n.callMethod(...args);
      } else {
        n.queue.push(args);
      }
    };
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [] as unknown[];
    window.fbq = n;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(script, firstScript);

    window.fbq!("init", pixelId);
  },

  pageView() {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", "PageView");
  },

  initiateCheckout(data: CheckoutData) {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", "InitiateCheckout", {
      content_name: data.product_name,
      value: data.value / 100,
      currency: data.currency,
    });
  },

  purchase(data: PurchaseData) {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", "Purchase", {
      content_name: data.product_name,
      value: data.value / 100,
      currency: data.currency,
      eventID: data.event_id,
    });
  },
};
