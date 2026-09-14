"use server";

import bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CODE_PATTERN = /^\d{6}$/;

export async function createHousehold(
  formData: FormData,
): Promise<ActionResult> {
  const name = (formData.get("create-name") as string | null)?.trim() ?? "";
  const code = (formData.get("create-code") as string | null)?.trim() ?? "";
  const codeConfirm =
    (formData.get("create-code-confirm") as string | null)?.trim() ?? "";

  if (!name) {
    return { ok: false, error: "Entrez un nom de foyer." };
  }
  if (!CODE_PATTERN.test(code)) {
    return { ok: false, error: "Le code doit contenir exactement 6 chiffres." };
  }
  if (code !== codeConfirm) {
    return { ok: false, error: "Les deux codes ne correspondent pas." };
  }

  const supabase = getSupabaseServerClient();

  const { data: existing, error: lookupError } = await supabase
    .from("households")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }
  if (existing) {
    return { ok: false, error: "Ce nom de foyer existe déjà." };
  }

  const passwordHash = await bcrypt.hash(code, 10);
  const { error: insertError } = await supabase
    .from("households")
    .insert({ name, password_hash: passwordHash });

  if (insertError) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true };
}

export async function joinHousehold(
  formData: FormData,
): Promise<ActionResult> {
  const name = (formData.get("join-name") as string | null)?.trim() ?? "";
  const code = (formData.get("join-code") as string | null)?.trim() ?? "";

  if (!name || !CODE_PATTERN.test(code)) {
    return {
      ok: false,
      error: "Vérifiez le nom du foyer et le code à 6 chiffres.",
    };
  }

  const supabase = getSupabaseServerClient();

  const { data: household, error } = await supabase
    .from("households")
    .select("password_hash")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }
  if (!household) {
    return { ok: false, error: "Aucun foyer ne porte ce nom." };
  }

  const valid = await bcrypt.compare(code, household.password_hash);
  if (!valid) {
    return { ok: false, error: "Code incorrect." };
  }

  return { ok: true };
}
