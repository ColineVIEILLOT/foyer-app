"use server";

import bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export type ActionResult =
  | { ok: true; householdId: string; householdName: string }
  | { ok: false; error: string };

export type Household = { id: string; name: string };

export type ListHouseholdsResult =
  | { ok: true; households: Household[] }
  | { ok: false; error: string };

export type ProfileActionResult =
  | { ok: true; profileId: string; profileName: string }
  | { ok: false; error: string };

export type Profile = { id: string; name: string };

export type ListProfilesResult =
  | { ok: true; profiles: Profile[] }
  | { ok: false; error: string };

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
  const { data: inserted, error: insertError } = await supabase
    .from("households")
    .insert({ name, password_hash: passwordHash })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true, householdId: inserted.id, householdName: name };
}

export async function listHouseholds(): Promise<ListHouseholdsResult> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("households")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return { ok: false, error: "Impossible de charger les foyers." };
  }

  return { ok: true, households: data ?? [] };
}

export async function joinHousehold(
  householdId: string,
  formData: FormData,
): Promise<ActionResult> {
  const code = (formData.get("join-code") as string | null)?.trim() ?? "";

  if (!CODE_PATTERN.test(code)) {
    return { ok: false, error: "Le code doit contenir 6 chiffres." };
  }

  const supabase = getSupabaseServerClient();

  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, password_hash")
    .eq("id", householdId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }
  if (!household) {
    return { ok: false, error: "Foyer introuvable." };
  }

  const valid = await bcrypt.compare(code, household.password_hash);
  if (!valid) {
    return { ok: false, error: "Code incorrect." };
  }

  return { ok: true, householdId: household.id, householdName: household.name };
}

export async function listProfiles(
  householdId: string,
): Promise<ListProfilesResult> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: "Impossible de charger les profils." };
  }

  return { ok: true, profiles: data ?? [] };
}

export async function createProfile(
  householdId: string,
  formData: FormData,
): Promise<ProfileActionResult> {
  const name = (formData.get("profile-name") as string | null)?.trim() ?? "";

  if (!name) {
    return { ok: false, error: "Entrez un prénom." };
  }

  const supabase = getSupabaseServerClient();

  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("household_id", householdId)
    .eq("name", name)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }
  if (existing) {
    return { ok: false, error: "Ce prénom existe déjà dans ce foyer." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ household_id: householdId, name })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true, profileId: inserted.id, profileName: name };
}

