"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  createHousehold,
  joinHousehold,
  listHouseholds,
  listProfiles,
  createProfile,
  type Household,
  type Profile,
} from "./actions";

type View =
  | "choice"
  | "create"
  | "join"
  | "join-code"
  | "profiles"
  | "new-profile"
  | "home";

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

const DASHBOARD_CARDS = [
  { title: "Courses", subtitle: "Bientôt disponible", color: "pink", Icon: IconBasket },
  { title: "Budget", subtitle: "Bientôt disponible", color: "accent", Icon: IconWallet },
  { title: "Calendrier", subtitle: "Bientôt disponible", color: "calendar", Icon: IconCalendar },
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
}: {
  id: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      name={id}
      type="text"
      placeholder={placeholder}
      autoComplete={autoComplete}
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
  const [joinTarget, setJoinTarget] = useState<Household | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
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
    listHouseholds().then((result) => {
      if (!cancelled && result.ok) {
        setHouseholds(result.households);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (view !== "profiles" || !householdId) return;
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

  function backToChoice() {
    setError(null);
    setView("choice");
  }

  return (
    <main
      className="flex min-h-screen flex-1 items-center justify-center px-6"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 2rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
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
              width={112}
              height={112}
              className="h-11 w-11 shrink-0"
            />
          </div>

          <div className="mb-4 rounded-2xl border border-border bg-surface px-5 py-4">
            {weatherStatus === "loaded" && weather ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{weather.icon}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-text">
                      {weather.temperature}°C
                    </p>
                    <p className="text-sm text-text-muted">{weather.label}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="relative h-1.5 rounded-full bg-surface-2">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${getDayProgress(weather.sunrise, weather.sunset) * 100}%`,
                        background:
                          "linear-gradient(90deg, var(--pink), var(--accent))",
                      }}
                    />
                    <span
                      className="absolute top-1/2 flex h-4 w-4 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-[10px]"
                      style={{
                        left: `${getDayProgress(weather.sunrise, weather.sunset) * 100}%`,
                      }}
                    >
                      ☀️
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-text-muted">
                    <span>{formatTime(weather.sunrise)}</span>
                    <span>{formatTime(weather.sunset)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                {weatherStatus === "error"
                  ? "Météo indisponible pour le moment."
                  : "Chargement de la météo…"}
              </p>
            )}
          </div>

          <div className="mb-4 rounded-2xl border border-border bg-surface px-5 py-4">
            <p className="mb-1 text-[15px] font-semibold text-text">
              Le savais-tu ?
            </p>
            <p className="text-sm italic text-text-muted">{getDailyFact()}</p>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-surface px-5 py-4">
            <p className="mb-1 text-[15px] font-semibold text-text">
              Aujourd&apos;hui
            </p>
            <p className="text-sm text-text-muted">
              Rien de prévu pour l&apos;instant — l&apos;agenda du foyer
              arrive avec l&apos;onglet Calendrier.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {DASHBOARD_CARDS.map(({ title, subtitle, color, Icon }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4"
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
                  {subtitle}
                </span>
              </div>
            ))}
          </div>
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
                {households.length === 0 ? (
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
  );
}
