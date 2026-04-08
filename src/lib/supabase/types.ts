// ============================================
// DATABASE ROW TYPES (match schema exactly)
// ============================================

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number; // cents
  currency: string; // "NAD", "ZAR"
  image_url: string;
  delivery_url: string;
  upsell_url: string | null;
  back_redirect_url: string | null;
  regional_pricing: Record<string, number>; // e.g. {"ZAR": 9700, "BWP": 8500}
  remarketing_enabled: boolean;
  remarketing_offer_1: string | null; // product_offers.id
  remarketing_offer_2: string | null;
  remarketing_offer_3: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderBump {
  id: string;
  product_id: string;
  name: string;
  description: string;
  price: number; // cents, same currency as parent product
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ProductTracker {
  id: string;
  product_id: string;
  type: TrackerType;
  tracker_id: string;
  side: "client" | "server";
  config: Record<string, unknown> | null;
  created_at: string;
}

export type TrackerType = "facebook" | "utmify" | "google_ads" | "tiktok";

export interface ProductOffer {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  price: number; // cents
  back_redirect_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  product_id: string;
  yoco_payment_id: string | null;
  status: "pending" | "paid" | "failed";
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_amount: number; // cents
  currency: string;
  tracking_params: TrackingParams;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  type: "product" | "order_bump";
  reference_id: string;
  name: string;
  price: number; // cents (snapshot)
  created_at: string;
}

export interface TrackingParams {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

// ============================================
// INSERT TYPES (omit auto-generated fields)
// ============================================

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at">;
export type ProductUpdate = Partial<ProductInsert>;

export type OrderBumpInsert = Omit<OrderBump, "id" | "created_at">;
export type OrderBumpUpdate = Partial<Omit<OrderBumpInsert, "product_id">>;

export type ProductTrackerInsert = Omit<ProductTracker, "id" | "created_at">;

export type ProductOfferInsert = Omit<ProductOffer, "id" | "created_at">;
export type ProductOfferUpdate = Partial<Omit<ProductOfferInsert, "product_id">>;

export type OrderInsert = Omit<Order, "id" | "created_at" | "updated_at">;
export type OrderItemInsert = Omit<OrderItem, "id" | "created_at">;

// ============================================
// COMPOSITE TYPES (for queries with joins)
// ============================================

export interface ProductWithBumps extends Product {
  order_bumps: OrderBump[];
}

export interface ProductWithBumpsAndTrackers extends ProductWithBumps {
  product_trackers: ProductTracker[];
}

export interface ProductWithOffers extends Product {
  product_offers: ProductOffer[];
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOrderRequest {
  product_id: string;
  offer_id?: string; // if purchasing via an offer slug
  currency?: string; // regional pricing override (e.g. "ZAR", "BWP")
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  selected_bump_ids: string[]; // which order bumps the buyer checked
  tracking_params: TrackingParams;
}

export interface CreateOrderResponse {
  order_id: string;
  yoco_checkout_id: string; // returned by Yoco to init embedded payment
}

// ============================================
// TRACKER INTERFACES
// ============================================

export interface CheckoutData {
  product_name: string;
  value: number; // total in cents
  currency: string;
}

export interface PurchaseData extends CheckoutData {
  order_id: string;
  event_id: string; // for FB Pixel <-> CAPI dedup
}

export interface ClientTrackerProvider {
  type: string;
  init(trackerId: string): void;
  pageView(): void;
  initiateCheckout(data: CheckoutData): void;
  purchase(data: PurchaseData): void;
}

export interface ServerTrackerProvider {
  type: string;
  onOrderCreated(
    order: OrderWithItems,
    config: ProductTracker
  ): Promise<void>;
  onOrderPaid(order: OrderWithItems, config: ProductTracker): Promise<void>;
}

export interface TrackerConfig {
  tracker_id: string;
  config: Record<string, unknown> | null;
}
