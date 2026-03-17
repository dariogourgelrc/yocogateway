import type { TrackingParams } from "@/lib/supabase/types";

export function extractUtmParams(
  searchParams: URLSearchParams
): TrackingParams {
  return {
    src: searchParams.get("src"),
    sck: searchParams.get("sck"),
    utm_source: searchParams.get("utm_source"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_medium: searchParams.get("utm_medium"),
    utm_content: searchParams.get("utm_content"),
    utm_term: searchParams.get("utm_term"),
  };
}
