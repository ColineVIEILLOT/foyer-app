import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Variables Supabase manquantes (URL ou clé secrète).");
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false },
  });
}
