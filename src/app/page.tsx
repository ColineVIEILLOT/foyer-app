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
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark />
          <p className="mt-1 text-[15px] text-text-muted">
            {view === "profiles" || view === "new-profile" || view === "home"
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

          {view === "home" && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <h2 className="font-display text-xl font-bold text-text">
                Salut {activeProfile} 👋
              </h2>
              <p className="text-[15px] text-text-muted">
                L&apos;accueil du foyer (courses, budget, calendrier…) arrive
                à la prochaine étape.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
