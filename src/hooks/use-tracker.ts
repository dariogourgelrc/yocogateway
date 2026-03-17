"use client";

import { useEffect, useRef } from "react";
import { createTrackerManager } from "@/lib/trackers/client-registry";
import type {
  ProductTracker,
  CheckoutData,
  PurchaseData,
} from "@/lib/supabase/types";

export function useTracker(trackers: ProductTracker[]) {
  const managerRef = useRef<ReturnType<typeof createTrackerManager> | null>(
    null
  );

  useEffect(() => {
    const manager = createTrackerManager(trackers);
    managerRef.current = manager;
    manager.pageView();
  }, [trackers]);

  return {
    initiateCheckout: (data: CheckoutData) =>
      managerRef.current?.initiateCheckout(data),
    purchase: (data: PurchaseData) => managerRef.current?.purchase(data),
  };
}
