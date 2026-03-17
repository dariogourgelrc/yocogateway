"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue: unknown[];
      push: (...args: unknown[]) => void;
      loaded: boolean;
      version: string;
    };
    __fbqInited?: Set<string>;
    __fbqPurchaseSent?: Set<string>;
  }
}

interface SuccessContentProps {
  productName: string;
  pixelIds: string[];
  orderData: {
    orderId: string;
    totalAmount: number;
    currency: string;
    eventId: string | null;
  } | null;
}

export function SuccessContent({
  productName,
  pixelIds,
  orderData,
}: SuccessContentProps) {
  useEffect(() => {
    if (pixelIds.length === 0 || !orderData) return;

    // Avoid firing the same purchase event multiple times (React Strict Mode / remounts)
    const purchaseKey = orderData.eventId || orderData.orderId;
    if (!window.__fbqPurchaseSent) window.__fbqPurchaseSent = new Set();
    if (window.__fbqPurchaseSent.has(purchaseKey)) return;
    window.__fbqPurchaseSent.add(purchaseKey);

    // Ensure FB pixel is loaded (only once per page)
    if (!window.fbq) {
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
      document.head.appendChild(script);
    }

    // Init pixel IDs only once each
    if (!window.__fbqInited) window.__fbqInited = new Set();
    for (const pixelId of pixelIds) {
      if (!window.__fbqInited.has(pixelId)) {
        window.fbq!("init", pixelId);
        window.__fbqInited.add(pixelId);
      }
    }

    // Fire Purchase event
    window.fbq!("track", "Purchase", {
      content_name: productName,
      value: orderData.totalAmount / 100,
      currency: orderData.currency,
      eventID: purchaseKey,
    });
  }, [pixelIds, orderData, productName]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Payment confirmed!
        </h1>
        <p className="mt-2 text-gray-600">
          Thank you for purchasing <strong>{productName}</strong>.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Check your email for access to your product. You will also receive a
          confirmation on WhatsApp.
        </p>
      </div>
    </div>
  );
}
