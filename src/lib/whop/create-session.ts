import { getWhopClient } from "./sdk";

// Subset of Whop's supported currencies relevant to this integration.
// Notably: Whop supports NAD directly (unlike Yoco), but not BWP.
export type WhopCurrency = "usd" | "eur" | "gbp" | "zar" | "nad" | "aud" | "brl" | "cad";

interface CreateWhopSessionParams {
  apiKey: string;
  companyId: string;
  amountInCents: number;
  currency: WhopCurrency;
  // Only needed for the hosted-checkout redirect flow, or as a fallback for
  // redirect-based payment methods (3DS, bank redirects) inside the embed.
  // Whop rejects non-public URLs here, so omit it for plain local testing.
  redirectUrl?: string;
  productTitle: string;
  externalIdentifier: string; // unique per order — used to find-or-create the Whop product
  metadata?: Record<string, unknown>;
}

interface WhopCheckoutSession {
  id: string;
  purchaseUrl: string;
}

const SUPPORTED_CURRENCIES: WhopCurrency[] = ["usd", "eur", "gbp", "zar", "nad", "aud", "brl", "cad"];

// Unlike Yoco, Whop supports NAD directly — no ZAR conversion needed. This just
// validates the currency is one Whop accepts (e.g. BWP is not supported).
export function resolveWhopCurrency(currency: string): WhopCurrency {
  const normalized = currency.toLowerCase();
  if (!SUPPORTED_CURRENCIES.includes(normalized as WhopCurrency)) {
    throw new Error(`Currency ${currency} is not supported by Whop`);
  }
  return normalized as WhopCurrency;
}

export async function createWhopSession(
  params: CreateWhopSessionParams
): Promise<WhopCheckoutSession> {
  const client = getWhopClient(params.apiKey);

  const config = await client.checkoutConfigurations.create({
    mode: "payment",
    redirect_url: params.redirectUrl || null,
    metadata: params.metadata,
    plan: {
      company_id: params.companyId,
      currency: params.currency,
      plan_type: "one_time",
      initial_price: params.amountInCents / 100,
      product: {
        external_identifier: params.externalIdentifier,
        title: params.productTitle,
      },
    },
  });

  return { id: config.id, purchaseUrl: config.purchase_url };
}
