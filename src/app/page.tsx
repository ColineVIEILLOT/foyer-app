"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  createHousehold,
  joinHousehold,
  listHouseholds,
  listProfiles,
  createProfile,
  listShoppingItems,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  listRecipes,
  createRecipe,
  deleteRecipe,
  addRecipeToShoppingList,
  updateRecipe,
  listWeeklyMenu,
  setMenuDay,
  addWeeklyMenuToShoppingList,
  listEvents,
  createEvent,
  deleteEvent,
  type Household,
  type Profile,
  type ShoppingItem,
  type Recipe,
  type MenuDay,
  type CalendarEvent,
} from "./actions";
import { INGREDIENT_CATEGORIES, WEEK_DAYS, RECIPE_TAGS, CATEGORY_ICONS } from "@/lib/constants";

type View =
  | "choice"
  | "create"
  | "join"
  | "join-code"
  | "profiles"
  | "new-profile"
  | "home"
  | "courses"
  | "recipes"
  | "new-recipe"
  | "recipe-detail"
  | "weekly-menu"
  | "calendar"
  | "new-event";

type Weather = {
  temperature: number;
  label: string;
  icon: string;
  sunrise: string;
  sunset: string;
};

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Ciel dégagé", icon: "☀️" },
  1: { label: "Plutôt dégagé", icon: "🌤️" },
  2: { label: "Partiellement nuageux", icon: "⛅" },
  3: { label: "Couvert", icon: "☁️" },
  45: { label: "Brouillard", icon: "🌫️" },
  48: { label: "Brouillard givrant", icon: "🌫️" },
  51: { label: "Bruine légère", icon: "🌦️" },
  53: { label: "Bruine", icon: "🌦️" },
  55: { label: "Bruine forte", icon: "🌧️" },
  61: { label: "Pluie légère", icon: "🌧️" },
  63: { label: "Pluie", icon: "🌧️" },
  65: { label: "Forte pluie", icon: "🌧️" },
  71: { label: "Neige légère", icon: "🌨️" },
  73: { label: "Neige", icon: "🌨️" },
  75: { label: "Forte neige", icon: "❄️" },
  80: { label: "Averses", icon: "🌦️" },
  81: { label: "Averses fortes", icon: "🌧️" },
  82: { label: "Averses violentes", icon: "⛈️" },
  95: { label: "Orage", icon: "⛈️" },
};

function describeWeatherCode(code: number) {
  return WEATHER_CODES[code] ?? { label: "Météo indisponible", icon: "🌡️" };
}

const TODAY_LABEL = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

const WEATHER_CACHE_KEY = "foyer-weather-cache-v2";
const WEATHER_CACHE_MAX_AGE_MS = 45 * 60 * 1000; // 45 minutes

type WeatherCache = { weather: Weather; fetchedAt: number };

function readWeatherCache(): Weather | null {
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCache;
    if (Date.now() - parsed.fetchedAt > WEATHER_CACHE_MAX_AGE_MS) return null;
    if (!parsed.weather?.sunrise || !parsed.weather?.sunset) return null;
    return parsed.weather;
  } catch {
    return null;
  }
}

function writeWeatherCache(weather: Weather) {
  try {
    const entry: WeatherCache = { weather, fetchedAt: Date.now() };
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Stockage indisponible (navigation privée, etc.) — tant pis, on refera la demande.
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function formatEventTime(time: string | null) {
  if (!time) return null;
  return time.slice(0, 5);
}

function getDayProgress(sunriseISO: string, sunsetISO: string) {
  const now = Date.now();
  const sunrise = new Date(sunriseISO).getTime();
  const sunset = new Date(sunsetISO).getTime();
  if (now <= sunrise) return 0;
  if (now >= sunset) return 1;
  return (now - sunrise) / (sunset - sunrise);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAILY_FACTS = [
  "Le miel ne périme jamais : on en a retrouvé de comestible dans des tombes égyptiennes vieilles de 3000 ans.",
  "Un escargot peut dormir jusqu'à trois ans d'affilée en cas de conditions trop sèches.",
  "La tour Eiffel grandit d'environ 15 cm en été à cause de la dilatation du métal.",
  "Les poulpes ont trois cœurs et du sang bleu.",
  "Il pleut des diamants sur Neptune et Uranus, selon les modèles des scientifiques.",
  "Le cœur d'une crevette se trouve dans sa tête.",
  "Un jour sur Vénus dure plus longtemps qu'une année vénusienne.",
  "Les bananes sont légèrement radioactives à cause de leur teneur en potassium.",
  "La grande muraille de Chine n'est pas visible à l'œil nu depuis l'espace, contrairement à une idée reçue.",
  "Les empreintes de nez des chiens sont uniques, comme nos empreintes digitales.",
  "Le mot 'OK' est l'un des termes les plus utilisés et compris dans le monde entier.",
  "Une étoile filante n'est en réalité qu'un grain de poussière brûlant dans l'atmosphère.",
  "Les flamants roses doivent leur couleur à leur alimentation riche en crevettes et algues.",
  "Le Mont Everest grandit encore d'environ 4 mm chaque année.",
  "Les koalas ont des empreintes digitales presque impossibles à distinguer de celles des humains.",
  "L'ADN humain est identique à environ 60% à celui d'une banane.",
  "Le premier ordinateur pesait plus de 27 tonnes.",
  "Les hippopotames peuvent courir plus vite qu'un humain sur de courtes distances.",
  "Il existe plus de combinaisons possibles au jeu d'échecs que d'atomes dans l'univers observable.",
  "La tour de Pise penche un peu plus chaque année.",
  "Les manchots empereurs peuvent plonger à plus de 500 mètres de profondeur.",
  "Le Sahara a été une région verdoyante il y a environ 6000 ans.",
  "Un nuage moyen pèse environ 500 tonnes.",
  "La Joconde n'a pas de sourcils, une mode de l'époque à la cour florentine.",
  "Les castors peuvent retenir leur respiration jusqu'à 15 minutes sous l'eau.",
  "Il y a plus d'arbres sur Terre que d'étoiles dans notre galaxie.",
  "Le cerveau humain utilise environ 20% de l'énergie totale du corps.",
  "Les girafes n'ont que sept vertèbres cervicales, comme les humains.",
  "L'orage le plus long jamais mesuré a duré plus de 16 heures.",
  "Le miel de lavande change littéralement de couleur selon la saison de récolte.",
] as const;

function getDailyFact() {
  return DAILY_FACTS[dayOfYear(new Date()) % DAILY_FACTS.length];
}

function IconBasket() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M4 9h16l-1.5 9.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 9V7a4 4 0 0 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <rect
        x="3.5"
        y="6.5"
        width="17"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M15.5 12.5h2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 6.5V6a2.5 2.5 0 0 1 2.5-2.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <rect
        x="4"
        y="5.5"
        width="16"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4 10h16M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M4 11.5 12 4l8 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M4 5.5c0-.6.4-1 1-1h6.5v15H5a1 1 0 0 1-1-1v-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.5c0-.6-.4-1-1-1h-6.5v15H19a1 1 0 0 0 1-1v-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DASHBOARD_CARDS = [
  { title: "Courses", subtitle: "Bientôt disponible", color: "pink", Icon: IconBasket },
  { title: "Recettes", subtitle: "Bientôt disponible", color: "sage", Icon: IconBook },
  { title: "Budget", subtitle: "Bientôt disponible", color: "accent", Icon: IconWallet },
  { title: "Calendrier", subtitle: "Bientôt disponible", color: "calendar", Icon: IconCalendar },
] as const;

const AVATAR_COLORS = ["pink", "calendar", "accent", "sage"] as const;

const BOTTOM_NAV = [
  { key: "home", label: "Accueil", color: "accent", Icon: IconHome },
  { key: "courses", label: "Courses", color: "pink", Icon: IconBasket },
  { key: "recipes", label: "Recettes", color: "sage", Icon: IconBook },
  { key: "budget", label: "Budget", color: "accent", Icon: IconWallet },
  { key: "calendrier", label: "Calendrier", color: "calendar", Icon: IconCalendar },
] as const;

function LogoMark() {
  return (
    <Image
      src="/logo.png"
      alt="Home"
      width={280}
      height={280}
      priority
      className="h-44 w-44"
    />
  );
}

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm text-text-muted">
      {children}
    </label>
  );
}

function TextField({
  id,
  placeholder,
  autoComplete,
  defaultValue,
}: {
  id: string;
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <input
      id={id}
      name={id}
      type="text"
      placeholder={placeholder}
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      required
      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
    />
  );
}

function CodeField({ id }: { id: string }) {
  return (
    <input
      id={id}
      name={id}
      type="text"
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      placeholder="000000"
      autoComplete="off"
      required
      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-[20px] tracking-[0.5em] text-text placeholder:text-text-muted/40 outline-none transition-colors focus:border-accent"
    />
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-danger">{message}</p>;
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

export default function Home() {
  const [view, setView] = useState<View>("choice");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdsError, setHouseholdsError] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<Household | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null);
  const [recipeSort, setRecipeSort] = useState<
    "name" | "prep" | "cook" | "total" | "ingredients"
  >("name");
  const [ingredientRows, setIngredientRows] = useState<
    { name: string; category: string }[]
  >([{ name: "", category: INGREDIENT_CATEGORIES[0] }]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [weeklyMenu, setWeeklyMenu] = useState<MenuDay[]>(
    WEEK_DAYS.map((day) => ({ day, recipeId: null, recipeName: null })),
  );
  const [menuAdded, setMenuAdded] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [viewedMonth, setViewedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [menuPickerOpen, setMenuPickerOpen] = useState(false);
  const [menuPickedDay, setMenuPickedDay] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<
    "idle" | "loaded" | "error"
  >("idle");

  useEffect(() => {
    if (view !== "home" || weatherStatus !== "idle") return;
    let cancelled = false;

    const cached = readWeatherCache();
    if (cached) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setWeather(cached);
          setWeatherStatus("loaded");
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const hasGeolocation = "geolocation" in navigator;
    const position = hasGeolocation
      ? new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        })
      : Promise.reject(new Error("Géolocalisation non disponible."));

    position
      .then(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto`,
        );
        const data = await res.json();
        const { label, icon } = describeWeatherCode(data.current.weather_code);
        const result: Weather = {
          temperature: Math.round(data.current.temperature_2m),
          label,
          icon,
          sunrise: data.daily.sunrise[0],
          sunset: data.daily.sunset[0],
        };
        if (!cancelled) {
          setWeather(result);
          setWeatherStatus("loaded");
          writeWeatherCache(result);
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [view, weatherStatus]);

  useEffect(() => {
    if (view !== "join") return;
    let cancelled = false;
    listHouseholds()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setHouseholdsError(null);
          setHouseholds(result.households);
        } else {
          setHouseholdsError(result.error);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHouseholdsError(
            err instanceof Error ? err.message : "Erreur inconnue.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if ((view !== "profiles" && view !== "home") || !householdId) return;
    let cancelled = false;
    listProfiles(householdId).then((result) => {
      if (!cancelled && result.ok) {
        setProfiles(result.profiles);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view, householdId]);

  useEffect(() => {
    if ((view !== "courses" && view !== "home") || !householdId) return;
    let cancelled = false;
    listShoppingItems(householdId).then((result) => {
      if (!cancelled && result.ok) {
        setShoppingItems(result.items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view, householdId]);

  useEffect(() => {
    if ((view !== "recipes" && view !== "home") || !householdId) return;
    let cancelled = false;
    listRecipes(householdId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setRecipesError(null);
        setRecipes(result.recipes);
      } else {
        setRecipesError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view, householdId]);

  useEffect(() => {
    if (
      (view !== "weekly-menu" && view !== "recipes") ||
      !householdId
    )
      return;
    let cancelled = false;
    listWeeklyMenu(householdId).then((result) => {
      if (!cancelled && result.ok) {
        setWeeklyMenu(result.menu);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view, householdId]);

  useEffect(() => {
    if (
      (view !== "calendar" && view !== "new-event" && view !== "home") ||
      !householdId
    )
      return;
    let cancelled = false;
    listEvents(householdId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setEventsError(null);
        setEvents(result.events);
      } else {
        setEventsError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view, householdId]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await createHousehold(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setHouseholdId(result.householdId);
      setHouseholdName(result.householdName);
      setView("profiles");
    } else {
      setError(result.error);
    }
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinTarget) return;
    setError(null);
    setPending(true);
    const result = await joinHousehold(joinTarget.id, new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setHouseholdId(result.householdId);
      setHouseholdName(result.householdName);
      setView("profiles");
    } else {
      setError(result.error);
    }
  }

  function selectHouseholdToJoin(household: Household) {
    setError(null);
    setJoinTarget(household);
    setView("join-code");
  }

  async function handleNewProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setPending(true);
    const result = await createProfile(householdId, new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setActiveProfile(result.profileName);
      setView("home");
    } else {
      setError(result.error);
    }
  }

  function selectProfile(profile: Profile) {
    setActiveProfile(profile.name);
    setView("home");
  }

  async function handleAddItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!householdId) return;
    const form = e.currentTarget;
    const result = await addShoppingItem(householdId, new FormData(form));
    if (result.ok) {
      setShoppingItems((prev) => [...prev, result.item]);
      form.reset();
    }
  }

  async function handleToggleItem(item: ShoppingItem) {
    setShoppingItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    );
    await toggleShoppingItem(item.id, !item.checked);
  }

  async function handleDeleteItem(item: ShoppingItem) {
    setShoppingItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteShoppingItem(item.id);
  }

  async function handleClearChecked() {
    if (!householdId) return;
    setShoppingItems((prev) => prev.filter((i) => !i.checked));
    await clearCheckedItems(householdId);
  }

  async function handleAddRecipe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    const cleanIngredients = ingredientRows.filter((r) => r.name.trim());
    if (cleanIngredients.length === 0) {
      setError("Ajoute au moins un ingrédient.");
      return;
    }
    setPending(true);
    const formData = new FormData(e.currentTarget);
    formData.set("recipe-ingredients-json", JSON.stringify(cleanIngredients));
    selectedTags.forEach((tag) => formData.append("recipe-tags", tag));

    const result = editingRecipe
      ? await updateRecipe(editingRecipe.id, householdId, formData)
      : await createRecipe(householdId, formData);

    setPending(false);
    if (result.ok) {
      if (editingRecipe) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === result.recipe.id ? result.recipe : r)),
        );
        setSelectedRecipe(result.recipe);
        setView("recipe-detail");
      } else {
        setRecipes((prev) => [...prev, result.recipe]);
        setView("recipes");
      }
      setIngredientRows([{ name: "", category: INGREDIENT_CATEGORIES[0] }]);
      setPhotoPreview(null);
      setSelectedTags([]);
      setCustomTag("");
      setEditingRecipe(null);
    } else {
      setError(result.error);
    }
  }

  function openNewRecipeForm() {
    setError(null);
    setEditingRecipe(null);
    setIngredientRows([{ name: "", category: INGREDIENT_CATEGORIES[0] }]);
    setSelectedTags([]);
    setCustomTag("");
    setPhotoPreview(null);
    setView("new-recipe");
  }

  function openEditRecipeForm(recipe: Recipe) {
    setError(null);
    setEditingRecipe(recipe);
    setIngredientRows(
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((i) => ({ ...i }))
        : [{ name: "", category: INGREDIENT_CATEGORIES[0] }],
    );
    setSelectedTags(recipe.tags);
    setCustomTag("");
    setPhotoPreview(recipe.photoUrl);
    setView("new-recipe");
  }

  function sortedRecipes() {
    const list = [...recipes];
    if (recipeSort === "prep") {
      list.sort((a, b) => (a.prepTimeMinutes ?? 999) - (b.prepTimeMinutes ?? 999));
    } else if (recipeSort === "cook") {
      list.sort((a, b) => (a.cookTimeMinutes ?? 999) - (b.cookTimeMinutes ?? 999));
    } else if (recipeSort === "total") {
      const total = (r: Recipe) =>
        (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
      list.sort((a, b) => total(a) - total(b));
    } else if (recipeSort === "ingredients") {
      list.sort((a, b) => a.ingredients.length - b.ingredients.length);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }

  async function handleDeleteRecipe(recipe: Recipe) {
    if (!window.confirm(`Supprimer la recette "${recipe.name}" ?`)) return;
    setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    await deleteRecipe(recipe.id);
  }

  async function handleAddRecipeToList(recipe: Recipe) {
    if (!householdId) return;
    const result = await addRecipeToShoppingList(householdId, recipe.id);
    if (result.ok) {
      setAddedRecipeId(recipe.id);
      setTimeout(() => setAddedRecipeId(null), 2000);
      const refreshed = await listShoppingItems(householdId);
      if (refreshed.ok) setShoppingItems(refreshed.items);
    }
  }

  async function handleSetMenuDay(day: string, recipeId: string | null) {
    if (!householdId) return;
    const recipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;
    setWeeklyMenu((prev) =>
      prev.map((d) =>
        d.day === day
          ? { day, recipeId, recipeName: recipe?.name ?? null }
          : d,
      ),
    );
    await setMenuDay(householdId, day, recipeId);
  }

  function openRecipeDetail(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setMenuPickerOpen(false);
    setMenuPickedDay(null);
    setView("recipe-detail");
  }

  async function handlePickMenuDayForRecipe(recipe: Recipe, day: string) {
    await handleSetMenuDay(day, recipe.id);
    setMenuPickedDay(day);
    setTimeout(() => {
      setMenuPickedDay(null);
      setMenuPickerOpen(false);
    }, 1500);
  }

  async function handleAddMenuToList() {
    if (!householdId) return;
    const result = await addWeeklyMenuToShoppingList(householdId);
    if (result.ok) {
      setMenuAdded(true);
      setTimeout(() => setMenuAdded(false), 2000);
      const refreshed = await listShoppingItems(householdId);
      if (refreshed.ok) setShoppingItems(refreshed.items);
    }
  }

  async function handleAddEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setPending(true);
    const result = await createEvent(householdId, new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setEvents((prev) =>
        [...prev, result.event].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setView("calendar");
    } else {
      setError(result.error);
    }
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (!window.confirm(`Supprimer "${event.title}" ?`)) return;
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
    await deleteEvent(event.id);
  }

  function openNewEventForm(dateKey?: string) {
    setError(null);
    setSelectedDay(dateKey ?? selectedDay ?? toDateKey(new Date()));
    setView("new-event");
  }

  function backToChoice() {
    setError(null);
    setView("choice");
  }

  const showBottomNav =
    view === "home" ||
    view === "courses" ||
    view === "recipes" ||
    view === "new-recipe" ||
    view === "recipe-detail" ||
    view === "weekly-menu" ||
    view === "calendar" ||
    view === "new-event";

  return (
    <>
      <main
        className="flex min-h-screen flex-1 items-center justify-center px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 2rem)",
          paddingBottom: showBottomNav
            ? "calc(88px + env(safe-area-inset-bottom))"
            : "max(env(safe-area-inset-bottom), 2rem)",
        }}
      >
      {view === "home" ? (
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm capitalize text-text-muted">{TODAY_LABEL}</p>
              <h1 className="font-display text-2xl font-bold text-text">
                {getGreeting()}, {activeProfile}
              </h1>
            </div>
            <Image
              src="/logo.png"
              alt="Home"
              width={140}
              height={140}
              className="h-24 w-24 shrink-0"
            />
          </div>

          <div className="mb-6 -m-1 flex items-center gap-3 overflow-x-auto p-1">
            {profiles.map((profile, i) => {
              const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const isActive = profile.name === activeProfile;
              return (
                <button
                  key={profile.id}
                  onClick={() => selectProfile(profile)}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-semibold transition-all"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--${avatarColor}) 22%, transparent)`,
                      color: `var(--${avatarColor})`,
                      boxShadow: isActive
                        ? `0 0 0 2px var(--${avatarColor})`
                        : "none",
                    }}
                  >
                    {initials(profile.name)}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {profile.name}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => {
                setError(null);
                setView("new-profile");
              }}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border text-text-muted">
                +
              </span>
              <span className="text-[11px] text-text-muted">Ajouter</span>
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface px-4 py-4">
              {weatherStatus === "loaded" && weather ? (
                <>
                  <span className="text-2xl">{weather.icon}</span>
                  <p className="mt-1 text-[15px] font-semibold text-text">
                    {weather.temperature}°C
                  </p>
                  <p className="text-xs text-text-muted">{weather.label}</p>
                  <div className="relative mt-3 h-1.5 rounded-full bg-surface-2">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${getDayProgress(weather.sunrise, weather.sunset) * 100}%`,
                        background:
                          "linear-gradient(90deg, var(--pink), var(--accent))",
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-text-muted">
                    <span>{formatTime(weather.sunrise)}</span>
                    <span>{formatTime(weather.sunset)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  {weatherStatus === "error"
                    ? "Météo indisponible."
                    : "Chargement…"}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface px-4 py-4">
              <p className="text-[15px] font-semibold text-text">
                Le savais-tu ?
              </p>
              <p className="mt-1 line-clamp-5 text-xs italic text-text-muted">
                {getDailyFact()}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-border bg-surface px-5 py-4">
            <p className="mb-1 text-[15px] font-semibold text-text">
              Aujourd&apos;hui
            </p>
            {events.filter((ev) => ev.date === toDateKey(new Date())).length ===
            0 ? (
              <p className="text-sm text-text-muted">
                Rien de prévu pour l&apos;instant.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {events
                  .filter((ev) => ev.date === toDateKey(new Date()))
                  .map((ev) => (
                    <p key={ev.id} className="text-sm text-text">
                      {formatEventTime(ev.time) && (
                        <span className="text-text-muted">
                          {formatEventTime(ev.time)}{" "}
                        </span>
                      )}
                      {ev.title}
                    </p>
                  ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setView("courses")}
              className="rounded-2xl border border-border bg-surface px-5 py-4 text-left transition-colors hover:border-accent"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--pink) 18%, transparent)",
                    color: "var(--pink)",
                  }}
                >
                  <IconBasket />
                </span>
                <span className="flex-1 text-[15px] font-semibold text-text">
                  Courses
                </span>
                <span className="text-sm text-text-muted">
                  {shoppingItems.filter((i) => !i.checked).length} article
                  {shoppingItems.filter((i) => !i.checked).length > 1 ? "s" : ""}
                </span>
              </div>
              {shoppingItems.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Liste vide — ajoute ton premier article.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {shoppingItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: item.checked ? "var(--pink)" : "var(--border)",
                          backgroundColor: item.checked ? "var(--pink)" : "transparent",
                        }}
                      />
                      <span
                        className={`text-sm ${
                          item.checked
                            ? "text-text-muted line-through"
                            : "text-text"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                  ))}
                  {shoppingItems.length > 4 && (
                    <p className="mt-0.5 text-xs text-text-muted">
                      + {shoppingItems.length - 4} autre
                      {shoppingItems.length - 4 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </button>

            {DASHBOARD_CARDS.filter((c) => c.title !== "Courses").map(
              ({ title, subtitle, color, Icon }) => {
                const isRecipes = title === "Recettes";
                const isCalendar = title === "Calendrier";
                const upcoming = events.filter(
                  (ev) => ev.date >= toDateKey(new Date()),
                ).length;
                const badge = isRecipes
                  ? `${recipes.length} recette${recipes.length > 1 ? "s" : ""}`
                  : isCalendar
                    ? upcoming === 0
                      ? "Rien à venir"
                      : `${upcoming} à venir`
                    : subtitle;
                return (
                  <button
                    key={title}
                    onClick={() => {
                      if (isRecipes) setView("recipes");
                      if (isCalendar) setView("calendar");
                    }}
                    disabled={!isRecipes && !isCalendar}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-left transition-colors enabled:hover:border-accent disabled:cursor-default"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--${color}) 18%, transparent)`,
                        color: `var(--${color})`,
                      }}
                    >
                      <Icon />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold text-text">
                      {title}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted">
                      {badge}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4">
            <p className="mb-3 text-[15px] font-semibold text-text">
              Notre foyer en un coup d&apos;œil
            </p>
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="font-display text-xl font-bold text-text">
                  {profiles.length}
                </p>
                <p className="text-xs text-text-muted">
                  membre{profiles.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-display text-xl font-bold text-text">
                  {shoppingItems.filter((i) => !i.checked).length}
                </p>
                <p className="text-xs text-text-muted">à acheter</p>
              </div>
            </div>
          </div>
        </div>
      ) : view === "courses" ? (
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => setView("home")}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              ← Retour
            </button>
          </div>
          <h1 className="mb-5 font-display text-2xl font-bold text-text">
            Courses
          </h1>

          <form
            onSubmit={handleAddItem}
            className="mb-5 flex gap-2 rounded-2xl border border-border bg-surface p-2"
          >
            <input
              name="item-name"
              placeholder="Ajouter un article"
              required
              className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-[15px] text-text outline-none placeholder:text-text-muted/60"
            />
            <input
              name="item-quantity"
              placeholder="Qté"
              className="w-16 rounded-xl bg-surface-2 px-2 py-2 text-center text-[14px] text-text outline-none placeholder:text-text-muted/60"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-accent px-4 py-2 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft"
            >
              +
            </button>
          </form>

          {shoppingItems.length === 0 ? (
            <p className="text-[15px] text-text-muted">
              Liste vide pour l&apos;instant — ajoute ton premier article.
            </p>
          ) : (
            <>
              {[...INGREDIENT_CATEGORIES, null].map((category) => {
                const itemsInCategory = shoppingItems.filter((item) =>
                  category === null
                    ? !item.category
                    : item.category === category,
                );
                if (itemsInCategory.length === 0) return null;
                return (
                  <div key={category ?? "sans-categorie"} className="mb-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <span className="text-sm">
                        {category ? CATEGORY_ICONS[category] : "🧺"}
                      </span>
                      {category ?? "Autres articles"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {itemsInCategory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                        >
                          <button
                            onClick={() => handleToggleItem(item)}
                            aria-label={item.checked ? "Décocher" : "Cocher"}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                            style={{
                              borderColor: item.checked
                                ? "var(--pink)"
                                : "var(--border)",
                              backgroundColor: item.checked
                                ? "var(--pink)"
                                : "transparent",
                            }}
                          >
                            {item.checked && (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-3 w-3"
                              >
                                <path
                                  d="M5 12.5 10 17 19 7"
                                  stroke="var(--surface)"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1">
                            <p
                              className={`text-[15px] ${
                                item.checked
                                  ? "text-text-muted line-through"
                                  : "text-text"
                              }`}
                            >
                              {item.name}
                            </p>
                            {item.recipeName && (
                              <p className="text-xs text-text-muted">
                                Pour {item.recipeName}
                              </p>
                            )}
                          </div>
                          {item.quantity && (
                            <span className="text-sm text-text-muted">
                              {item.quantity}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteItem(item)}
                            aria-label="Supprimer"
                            className="text-text-muted transition-colors hover:text-danger"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {shoppingItems.some((i) => i.checked) && (
                <button
                  onClick={handleClearChecked}
                  className="mt-2 w-full rounded-xl border border-dashed border-border px-5 py-3 text-[15px] font-semibold text-text-muted transition-colors hover:border-accent hover:text-text"
                >
                  Vider les articles cochés
                </button>
              )}
            </>
          )}
        </div>
      ) : view === "recipes" ? (
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setView("home")}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              ← Retour
            </button>
            <button
              onClick={openNewRecipeForm}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent-soft"
            >
              + Nouvelle recette
            </button>
          </div>
          <h1 className="mb-4 font-display text-2xl font-bold text-text">
            Recettes
          </h1>

          <div className="mb-5 rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-text">
                Menu de la semaine
              </p>
              <button
                onClick={() => setView("weekly-menu")}
                className="text-sm font-semibold text-accent"
              >
                Modifier
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weeklyMenu.map(({ day, recipeName }) => (
                <div
                  key={day}
                  className="flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl border border-border px-2 py-2 text-center"
                >
                  <span className="text-[10px] font-semibold uppercase text-text-muted">
                    {day.slice(0, 3)}
                  </span>
                  <span className="line-clamp-2 text-[11px] text-text">
                    {recipeName ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {Array.from(
            new Set([...RECIPE_TAGS, ...recipes.flatMap((r) => r.tags)]),
          ).map((tag) => {
            const tagged = recipes.filter((r) => r.tags.includes(tag));
            if (tagged.length === 0) return null;
            return (
              <div key={tag} className="mb-5">
                <p className="mb-2 text-[15px] font-semibold text-text">
                  {tag}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {tagged.map((recipe) => {
                    const total =
                      (recipe.prepTimeMinutes ?? 0) +
                      (recipe.cookTimeMinutes ?? 0);
                    return (
                      <button
                        key={recipe.id}
                        onClick={() => openRecipeDetail(recipe)}
                        className="w-36 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface text-left"
                      >
                        {recipe.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={recipe.photoUrl}
                            alt={recipe.name}
                            className="h-24 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-full items-center justify-center bg-surface-2 text-text-muted">
                            <IconBook />
                          </div>
                        )}
                        <div className="px-3 py-2">
                          <p className="truncate text-[13px] font-semibold text-text">
                            {recipe.name}
                          </p>
                          {total > 0 && (
                            <p className="text-[11px] text-text-muted">
                              {total} min
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {recipes.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  { key: "name", label: "Nom" },
                  { key: "prep", label: "Préparation" },
                  { key: "cook", label: "Cuisson" },
                  { key: "total", label: "Temps total" },
                  { key: "ingredients", label: "Nb d'ingrédients" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRecipeSort(opt.key)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor:
                      recipeSort === opt.key ? "var(--accent)" : "var(--border)",
                    color:
                      recipeSort === opt.key ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {recipesError ? (
            <p className="text-[15px] text-danger">Erreur : {recipesError}</p>
          ) : recipes.length === 0 ? (
            <p className="text-[15px] text-text-muted">
              Aucune recette pour l&apos;instant — crée la première.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedRecipes().map((recipe) => (
                <div
                  key={recipe.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <button
                    onClick={() => openRecipeDetail(recipe)}
                    className="block w-full text-left"
                  >
                    {recipe.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.photoUrl}
                        alt={recipe.name}
                        className="h-36 w-full object-cover"
                      />
                    )}
                    <div className="px-5 pt-4">
                      <p className="text-[15px] font-semibold text-text">
                        {recipe.name}
                      </p>
                      {(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
                        <div className="mt-1 flex gap-3 text-xs text-text-muted">
                          {recipe.prepTimeMinutes != null && (
                            <span>Prépa {recipe.prepTimeMinutes} min</span>
                          )}
                          {recipe.cookTimeMinutes != null && (
                            <span>Cuisson {recipe.cookTimeMinutes} min</span>
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-xs font-medium text-text-muted">
                        {recipe.ingredients.length} ingrédient
                        {recipe.ingredients.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-2 px-5 pb-4 pt-3">
                    <button
                      onClick={() => handleAddRecipeToList(recipe)}
                      className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent"
                    >
                      {addedRecipeId === recipe.id
                        ? "Ajouté ✓"
                        : "Ajouter aux courses"}
                    </button>
                    <button
                      onClick={() => handleDeleteRecipe(recipe)}
                      aria-label="Supprimer"
                      className="rounded-xl border border-border px-3 text-text-muted transition-colors hover:border-danger hover:text-danger"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === "recipe-detail" && selectedRecipe ? (
        <div className="w-full max-w-[380px]">
          <button
            onClick={() => setView("recipes")}
            className="mb-4 text-sm text-text-muted transition-colors hover:text-text"
          >
            ← Retour
          </button>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {selectedRecipe.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedRecipe.photoUrl}
                alt={selectedRecipe.name}
                className="h-48 w-full object-cover"
              />
            )}
            <div className="px-5 py-4">
              <h1 className="font-display text-xl font-bold text-text">
                {selectedRecipe.name}
              </h1>
              {selectedRecipe.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedRecipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--accent) 15%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {(selectedRecipe.prepTimeMinutes ||
                selectedRecipe.cookTimeMinutes) && (
                <div className="mt-1 flex gap-3 text-sm text-text-muted">
                  {selectedRecipe.prepTimeMinutes != null && (
                    <span>Prépa {selectedRecipe.prepTimeMinutes} min</span>
                  )}
                  {selectedRecipe.cookTimeMinutes != null && (
                    <span>Cuisson {selectedRecipe.cookTimeMinutes} min</span>
                  )}
                </div>
              )}

              <p className="mb-2 mt-4 text-[15px] font-semibold text-text">
                Ingrédients ({selectedRecipe.ingredients.length})
              </p>
              <div className="mb-4 flex flex-col gap-1">
                {selectedRecipe.ingredients.map((ingredient, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text">{ingredient.name}</span>
                    <span className="text-text-muted">
                      {CATEGORY_ICONS[ingredient.category] ?? "🧺"}{" "}
                      {ingredient.category}
                    </span>
                  </div>
                ))}
              </div>

              {selectedRecipe.steps && (
                <>
                  <p className="mb-2 text-[15px] font-semibold text-text">
                    Étapes
                  </p>
                  <p className="mb-4 whitespace-pre-line text-sm text-text-muted">
                    {selectedRecipe.steps}
                  </p>
                </>
              )}

              <button
                onClick={() => handleAddRecipeToList(selectedRecipe)}
                className="mb-2 w-full rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft"
              >
                {addedRecipeId === selectedRecipe.id
                  ? "Ajouté à la liste ✓"
                  : "Ajouter à la liste de courses"}
              </button>

              <button
                onClick={() => setMenuPickerOpen((v) => !v)}
                className="mb-2 w-full rounded-xl border border-border px-5 py-3 text-[15px] font-semibold text-text transition-colors hover:border-accent"
              >
                + Ajouter au menu de la semaine
              </button>

              <button
                onClick={() => openEditRecipeForm(selectedRecipe)}
                className="w-full rounded-xl border border-border px-5 py-3 text-[15px] font-semibold text-text transition-colors hover:border-accent"
              >
                Modifier la recette
              </button>

              {menuPickerOpen && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() =>
                        handlePickMenuDayForRecipe(selectedRecipe, day)
                      }
                      className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor:
                          menuPickedDay === day
                            ? "var(--accent)"
                            : "var(--border)",
                        color:
                          menuPickedDay === day
                            ? "var(--accent)"
                            : "var(--text-muted)",
                      }}
                    >
                      {menuPickedDay === day ? `${day} ✓` : day}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : view === "new-recipe" ? (
        <div className="w-full max-w-[380px]">
          <form onSubmit={handleAddRecipe} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setEditingRecipe(null);
                setView(editingRecipe ? "recipe-detail" : "recipes");
              }}
              className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
            >
              ← Retour
            </button>
            <h1 className="font-display text-2xl font-bold text-text">
              {editingRecipe ? "Modifier la recette" : "Nouvelle recette"}
            </h1>

            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="recipe-name">Nom de la recette</FieldLabel>
              <TextField
                id="recipe-name"
                placeholder="Pâtes tomate mozzarella"
                defaultValue={editingRecipe?.name}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="recipe-tags">Type de recette</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set([...RECIPE_TAGS, ...selectedTags]),
                ).map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSelectedTags((prev) =>
                          active
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        )
                      }
                      className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        backgroundColor: active
                          ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                          : "transparent",
                        color: active ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex gap-2">
                <input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Autre catégorie…"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-[14px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = customTag.trim();
                    if (trimmed && !selectedTags.includes(trimmed)) {
                      setSelectedTags((prev) => [...prev, trimmed]);
                    }
                    setCustomTag("");
                  }}
                  className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-accent"
                >
                  Ajouter
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <FieldLabel htmlFor="recipe-prep-time">Préparation (min)</FieldLabel>
                <input
                  id="recipe-prep-time"
                  name="recipe-prep-time"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="15"
                  defaultValue={editingRecipe?.prepTimeMinutes ?? undefined}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <FieldLabel htmlFor="recipe-cook-time">Cuisson (min)</FieldLabel>
                <input
                  id="recipe-cook-time"
                  name="recipe-cook-time"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="20"
                  defaultValue={editingRecipe?.cookTimeMinutes ?? undefined}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="recipe-photo">Photo (optionnel)</FieldLabel>
              <input
                id="recipe-photo"
                name="recipe-photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhotoPreview(URL.createObjectURL(file));
                  else setPhotoPreview(null);
                }}
                className="w-full text-sm text-text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-text"
              />
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt=""
                  className="mt-2 h-32 w-full rounded-xl object-cover"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="ingredient-0">Ingrédients</FieldLabel>
              {ingredientRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    id={`ingredient-${i}`}
                    value={row.name}
                    onChange={(e) => {
                      const next = [...ingredientRows];
                      next[i] = { ...next[i], name: e.target.value };
                      setIngredientRows(next);
                    }}
                    placeholder="Tomates"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[15px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
                  />
                  <select
                    value={row.category}
                    onChange={(e) => {
                      const next = [...ingredientRows];
                      next[i] = { ...next[i], category: e.target.value };
                      setIngredientRows(next);
                    }}
                    className="w-[9.5rem] shrink-0 rounded-xl border border-border bg-surface-2 px-2 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-accent"
                  >
                    {INGREDIENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_ICONS[cat]} {cat}
                      </option>
                    ))}
                  </select>
                  {ingredientRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setIngredientRows((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      aria-label="Supprimer l'ingrédient"
                      className="shrink-0 text-text-muted transition-colors hover:text-danger"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setIngredientRows((prev) => [
                    ...prev,
                    { name: "", category: INGREDIENT_CATEGORIES[0] },
                  ])
                }
                className="self-start text-sm font-semibold text-accent"
              >
                + Ajouter un ingrédient
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="recipe-steps">
                Étapes de préparation (optionnel)
              </FieldLabel>
              <textarea
                id="recipe-steps"
                name="recipe-steps"
                rows={5}
                placeholder={
                  "Faire bouillir l'eau et cuire les pâtes.\nCouper les tomates et la mozzarella.\nMélanger le tout avec le basilic."
                }
                defaultValue={editingRecipe?.steps ?? undefined}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
              />
            </div>

            <ErrorText message={error} />
            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft disabled:opacity-60"
            >
              {pending
                ? "Enregistrement…"
                : editingRecipe
                  ? "Enregistrer les modifications"
                  : "Créer la recette"}
            </button>
          </form>
        </div>
      ) : view === "weekly-menu" ? (
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setView("recipes")}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              ← Retour
            </button>
          </div>
          <h1 className="mb-5 font-display text-2xl font-bold text-text">
            Menu de la semaine
          </h1>

          <div className="flex flex-col gap-2">
            {weeklyMenu.map(({ day, recipeId }) => (
              <div
                key={day}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="w-24 shrink-0 text-[15px] font-semibold text-text">
                  {day}
                </span>
                <select
                  value={recipeId ?? ""}
                  onChange={(e) =>
                    handleSetMenuDay(day, e.target.value || null)
                  }
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-2 text-[14px] text-text outline-none transition-colors focus:border-accent"
                >
                  <option value="">Aucune recette</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {weeklyMenu.some((d) => d.recipeId) && (
            <button
              onClick={handleAddMenuToList}
              className="mt-5 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft"
            >
              {menuAdded
                ? "Ajouté à la liste ✓"
                : "Ajouter tous les ingrédients de la semaine à la liste"}
            </button>
          )}
        </div>
      ) : view === "calendar" ? (
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setView("home")}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              ← Retour
            </button>
            <button
              onClick={() => openNewEventForm()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent-soft"
            >
              + Rendez-vous
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() =>
                setViewedMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                )
              }
              aria-label="Mois précédent"
              className="rounded-full border border-border px-3 py-1.5 text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              ‹
            </button>
            <p className="font-display text-lg font-bold capitalize text-text">
              {MONTH_LABEL_FORMATTER.format(viewedMonth)}
            </p>
            <button
              onClick={() =>
                setViewedMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                )
              }
              aria-label="Mois suivant"
              className="rounded-full border border-border px-3 py-1.5 text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              ›
            </button>
          </div>

          {eventsError ? (
            <p className="mb-4 text-[15px] text-danger">
              Erreur : {eventsError}
            </p>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-muted">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="mb-5 grid grid-cols-7 gap-1">
                {getMonthGrid(
                  viewedMonth.getFullYear(),
                  viewedMonth.getMonth(),
                ).map((date, i) => {
                  if (!date) return <div key={i} />;
                  const key = toDateKey(date);
                  const isToday = key === toDateKey(new Date());
                  const hasEvents = events.some((ev) => ev.date === key);
                  const isSelected = key === selectedDay;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(key)}
                      className="flex flex-col items-center gap-0.5 rounded-xl py-2 text-[13px] transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                          : "transparent",
                        color: isToday ? "var(--accent)" : "var(--text)",
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {date.getDate()}
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{
                          backgroundColor: hasEvents
                            ? "var(--accent)"
                            : "transparent",
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <div>
                  <p className="mb-2 text-[15px] font-semibold text-text">
                    {new Date(selectedDay + "T00:00:00").toLocaleDateString(
                      "fr-FR",
                      { weekday: "long", day: "numeric", month: "long" },
                    )}
                  </p>
                  {events.filter((ev) => ev.date === selectedDay).length ===
                  0 ? (
                    <p className="mb-3 text-sm text-text-muted">
                      Rien de prévu ce jour-là.
                    </p>
                  ) : (
                    <div className="mb-3 flex flex-col gap-2">
                      {events
                        .filter((ev) => ev.date === selectedDay)
                        .map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                          >
                            <div className="flex-1">
                              <p className="text-[15px] text-text">
                                {ev.title}
                              </p>
                              {(formatEventTime(ev.time) || ev.notes) && (
                                <p className="text-xs text-text-muted">
                                  {[formatEventTime(ev.time), ev.notes]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteEvent(ev)}
                              aria-label="Supprimer"
                              className="text-text-muted transition-colors hover:text-danger"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                  <button
                    onClick={() => openNewEventForm(selectedDay)}
                    className="w-full rounded-xl border border-dashed border-border px-5 py-3 text-[15px] font-semibold text-text-muted transition-colors hover:border-accent hover:text-text"
                  >
                    + Ajouter un rendez-vous ce jour-là
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : view === "new-event" ? (
        <div className="w-full max-w-[380px]">
          <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setView("calendar");
              }}
              className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
            >
              ← Retour
            </button>
            <h1 className="font-display text-2xl font-bold text-text">
              Nouveau rendez-vous
            </h1>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="event-title">Titre</FieldLabel>
              <TextField id="event-title" placeholder="Anniversaire Mamie" />
            </div>
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <FieldLabel htmlFor="event-date">Date</FieldLabel>
                <input
                  id="event-date"
                  name="event-date"
                  type="date"
                  required
                  defaultValue={selectedDay ?? toDateKey(new Date())}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-3 text-[15px] text-text outline-none transition-colors focus:border-accent"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <FieldLabel htmlFor="event-time">Heure (optionnel)</FieldLabel>
                <input
                  id="event-time"
                  name="event-time"
                  type="time"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-3 text-[15px] text-text outline-none transition-colors focus:border-accent"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="event-notes">Notes (optionnel)</FieldLabel>
              <input
                id="event-notes"
                name="event-notes"
                placeholder="Lieu, précisions…"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
              />
            </div>
            <ErrorText message={error} />
            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft disabled:opacity-60"
            >
              {pending ? "Création…" : "Créer le rendez-vous"}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark />
            <p className="mt-1 text-[15px] text-text-muted">
              {view === "profiles" || view === "new-profile"
                ? householdName
                : "L'espace commun de votre maison"}
            </p>
          </div>

          <div className="rounded-[28px] border border-border bg-surface p-7 shadow-[0_1px_0_0_rgba(28,23,18,0.03)]">
            {view === "choice" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setView("create")}
                  className="w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft"
                >
                  Créer un foyer
                </button>
                <button
                  onClick={() => setView("join")}
                  className="w-full rounded-xl border border-border px-5 py-3.5 text-[15px] font-semibold text-text transition-colors hover:border-accent"
                >
                  Rejoindre un foyer
                </button>
              </div>
            )}

            {view === "create" && (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={backToChoice}
                  className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
                >
                  ← Retour
                </button>
                <h2 className="font-display text-xl font-bold text-text">Nouveau foyer</h2>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="create-name">Nom du foyer</FieldLabel>
                  <TextField id="create-name" placeholder="Maison Vieillot" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="create-code">Code à 6 chiffres</FieldLabel>
                  <CodeField id="create-code" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="create-code-confirm">Confirmer le code</FieldLabel>
                  <CodeField id="create-code-confirm" />
                </div>
                <ErrorText message={error} />
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft disabled:opacity-60"
                >
                  {pending ? "Création…" : "Créer le foyer"}
                </button>
              </form>
            )}

            {view === "join" && (
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={backToChoice}
                  className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
                >
                  ← Retour
                </button>
                <h2 className="font-display text-xl font-bold text-text">Rejoindre un foyer</h2>
                {householdsError ? (
                  <p className="text-[15px] text-danger">
                    Erreur : {householdsError}
                  </p>
                ) : households.length === 0 ? (
                  <p className="text-[15px] text-text-muted">
                    Aucun foyer trouvé pour l&apos;instant.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {households.map((household) => (
                      <button
                        key={household.id}
                        onClick={() => selectHouseholdToJoin(household)}
                        className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-accent"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-text">
                          {initials(household.name)}
                        </span>
                        <span className="text-[15px] font-medium text-text">
                          {household.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === "join-code" && joinTarget && (
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("join");
                  }}
                  className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
                >
                  ← Retour
                </button>
                <h2 className="font-display text-xl font-bold text-text">
                  {joinTarget.name}
                </h2>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="join-code">Code à 6 chiffres</FieldLabel>
                  <CodeField id="join-code" />
                </div>
                <ErrorText message={error} />
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft disabled:opacity-60"
                >
                  {pending ? "Vérification…" : "Entrer"}
                </button>
              </form>
            )}

            {view === "profiles" && (
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-xl font-bold text-text">Qui es-tu ?</h2>
                <div className="flex flex-col gap-2">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => selectProfile(profile)}
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-accent"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-text">
                        {initials(profile.name)}
                      </span>
                      <span className="text-[15px] font-medium text-text">
                        {profile.name}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    setView("new-profile");
                  }}
                  className="w-full rounded-xl border border-dashed border-border px-5 py-3.5 text-[15px] font-semibold text-text-muted transition-colors hover:border-accent hover:text-text"
                >
                  + Ajouter un profil
                </button>
              </div>
            )}

            {view === "new-profile" && (
              <form onSubmit={handleNewProfile} className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("profiles");
                  }}
                  className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
                >
                  ← Retour
                </button>
                <h2 className="font-display text-xl font-bold text-text">Nouveau profil</h2>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="profile-name">Prénom</FieldLabel>
                  <TextField id="profile-name" placeholder="Léa" />
                </div>
                <ErrorText message={error} />
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft disabled:opacity-60"
                >
                  {pending ? "Création…" : "Créer le profil"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      </main>

      {showBottomNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-[380px] items-center justify-around px-2 py-2">
            {BOTTOM_NAV.map(({ key, label, color, Icon }) => {
              const isActive =
                view === key || (key === "home" && view === "home");
              const isEnabled =
                key === "home" ||
                key === "courses" ||
                key === "recipes" ||
                key === "calendrier";
              return (
                <button
                  key={key}
                  disabled={!isEnabled}
                  onClick={() => {
                    if (key === "home") setView("home");
                    if (key === "courses") setView("courses");
                    if (key === "recipes") setView("recipes");
                    if (key === "calendrier") setView("calendar");
                  }}
                  className="flex flex-col items-center gap-1 px-3 py-1 disabled:opacity-40"
                >
                  <span
                    style={{
                      color: isActive ? `var(--${color})` : "var(--text-muted)",
                    }}
                  >
                    <Icon />
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: isActive ? `var(--${color})` : "var(--text-muted)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
