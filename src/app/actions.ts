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
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("households")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      return { ok: false, error: `Supabase: ${error.message}` };
    }

    return { ok: true, households: data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur inconnue.",
    };
  }
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


export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
};

export type ListShoppingItemsResult =
  | { ok: true; items: ShoppingItem[] }
  | { ok: false; error: string };

export type ShoppingItemActionResult =
  | { ok: true; item: ShoppingItem }
  | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function listShoppingItems(
  householdId: string,
): Promise<ListShoppingItemsResult> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("shopping_items")
    .select("id, name, quantity, checked")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: "Impossible de charger la liste." };
  }

  return { ok: true, items: data ?? [] };
}

export async function addShoppingItem(
  householdId: string,
  formData: FormData,
): Promise<ShoppingItemActionResult> {
  const name = (formData.get("item-name") as string | null)?.trim() ?? "";
  const quantity =
    (formData.get("item-quantity") as string | null)?.trim() || null;

  if (!name) {
    return { ok: false, error: "Entrez un article." };
  }

  const supabase = getSupabaseServerClient();

  const { data: inserted, error } = await supabase
    .from("shopping_items")
    .insert({ household_id: householdId, name, quantity })
    .select("id, name, quantity, checked")
    .single();

  if (error || !inserted) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true, item: inserted };
}

export async function toggleShoppingItem(
  itemId: string,
  checked: boolean,
): Promise<SimpleResult> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("shopping_items")
    .update({ checked })
    .eq("id", itemId);

  if (error) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true };
}

export async function deleteShoppingItem(
  itemId: string,
): Promise<SimpleResult> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true };
}

export async function clearCheckedItems(
  householdId: string,
): Promise<SimpleResult> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("household_id", householdId)
    .eq("checked", true);

  if (error) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true };
}

export type Ingredient = { name: string; category: string };

export const INGREDIENT_CATEGORIES = [
  "Viande/Poisson",
  "Légume",
  "Fruit",
  "Féculent",
  "Produit laitier",
  "Épicerie",
  "Autre",
] as const;

export type Recipe = {
  id: string;
  name: string;
  ingredients: Ingredient[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  photoUrl: string | null;
};

type RecipeRow = {
  id: string;
  name: string;
  ingredients: Ingredient[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  photo_url: string | null;
};

function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    ingredients: row.ingredients ?? [],
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    photoUrl: row.photo_url,
  };
}

export type ListRecipesResult =
  | { ok: true; recipes: Recipe[] }
  | { ok: false; error: string };

export type RecipeActionResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; error: string };

export async function listRecipes(
  householdId: string,
): Promise<ListRecipesResult> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, name, ingredients, prep_time_minutes, cook_time_minutes, photo_url",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: "Impossible de charger les recettes." };
  }

  return { ok: true, recipes: (data ?? []).map(mapRecipeRow) };
}

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (!value) return null;
  const n = parseInt(value as string, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createRecipe(
  householdId: string,
  formData: FormData,
): Promise<RecipeActionResult> {
  const name = (formData.get("recipe-name") as string | null)?.trim() ?? "";
  const ingredientsRaw =
    (formData.get("recipe-ingredients-json") as string | null) ?? "[]";
  const prepTimeMinutes = parseOptionalInt(formData.get("recipe-prep-time"));
  const cookTimeMinutes = parseOptionalInt(formData.get("recipe-cook-time"));
  const photo = formData.get("recipe-photo") as File | null;

  let ingredients: Ingredient[] = [];
  try {
    ingredients = JSON.parse(ingredientsRaw);
  } catch {
    ingredients = [];
  }
  ingredients = ingredients
    .map((i) => ({ name: (i.name ?? "").trim(), category: i.category || "Autre" }))
    .filter((i) => i.name.length > 0);

  if (!name) {
    return { ok: false, error: "Entrez un nom de recette." };
  }
  if (ingredients.length === 0) {
    return { ok: false, error: "Ajoute au moins un ingrédient." };
  }

  const supabase = getSupabaseServerClient();

  let photoUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("recipe-photos")
      .upload(path, photo, { contentType: photo.type });
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from("recipe-photos")
        .getPublicUrl(path);
      photoUrl = publicUrlData.publicUrl;
    }
  }

  const { data: inserted, error } = await supabase
    .from("recipes")
    .insert({
      household_id: householdId,
      name,
      ingredients,
      prep_time_minutes: prepTimeMinutes,
      cook_time_minutes: cookTimeMinutes,
      photo_url: photoUrl,
    })
    .select(
      "id, name, ingredients, prep_time_minutes, cook_time_minutes, photo_url",
    )
    .single();

  if (error || !inserted) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true, recipe: mapRecipeRow(inserted) };
}

export async function deleteRecipe(recipeId: string): Promise<SimpleResult> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

  if (error) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true };
}

export async function addRecipeToShoppingList(
  householdId: string,
  recipeId: string,
): Promise<SimpleResult> {
  const supabase = getSupabaseServerClient();

  const { data: recipe, error: fetchError } = await supabase
    .from("recipes")
    .select("ingredients")
    .eq("id", recipeId)
    .maybeSingle();

  if (fetchError || !recipe) {
    return { ok: false, error: "Recette introuvable." };
  }

  const rows = (recipe.ingredients as Ingredient[]).map((ingredient) => ({
    household_id: householdId,
    name: ingredient.name,
    quantity: null,
    checked: false,
  }));

  if (rows.length === 0) return { ok: true };

  const { error: insertError } = await supabase
    .from("shopping_items")
    .insert(rows);

  if (insertError) {
    return { ok: false, error: "Une erreur est survenue, réessayez." };
  }

  return { ok: true };
}
