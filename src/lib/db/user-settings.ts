import { createServerClient } from "@/lib/supabase/server";
import type {
  UserSettings,
  UserSettingsInsert,
  UserSettingsUpdate,
} from "@/lib/supabase/types";

export async function getUserSettings(
  userId: string
): Promise<UserSettings | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }

  return data as UserSettings | null;
}

export async function upsertUserSettings(
  userId: string,
  updates: UserSettingsUpdate
): Promise<UserSettings> {
  const supabase = createServerClient();

  const payload: UserSettingsInsert = {
    user_id: userId,
    stripe_secret_key: updates.stripe_secret_key ?? "",
    stripe_publishable_key: updates.stripe_publishable_key ?? "",
    stripe_webhook_secret: updates.stripe_webhook_secret ?? "",
  };

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save user settings: ${error.message}`);
  }

  return data as UserSettings;
}