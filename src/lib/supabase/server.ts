import { createServerClient as createSSRClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";

// Service role client — bypasses RLS, used for all DB operations
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Auth-aware client for server components (reads session from cookies)
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Ignore — called from Server Component where cookies can't be set
          }
        },
      },
    }
  );
}

// Auth-aware client for API route handlers (reads session from request cookies)
export function createAuthClientFromRequest(request: NextRequest) {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Can't mutate cookies after headers are sent in route handlers
        },
      },
    }
  );
}

// Get the current logged-in user from a server component
export async function getCurrentUser() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Get the current logged-in user from an API route request
export async function getUserFromRequest(request: NextRequest) {
  const supabase = createAuthClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}