"use client";

import { useState, type FormEvent } from "react";

type View = "choice" | "create" | "join";

function HearthMark() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-60"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="relative h-9 w-9"
        aria-hidden
      >
        <path
          d="M24 6C24 6 14 17 14 26.5C14 33.4 18.5 38 24 38C29.5 38 34 33.4 34 26.5C34 22.7 31.8 19.2 29.6 16.6C29.9 19 29 21 27.4 22C27.7 19 26.4 15.8 24 12.5C24 15.3 22.6 17.4 21 19.3C19.1 21.6 17.8 23.9 17.8 26.5C17.8 30.3 20.4 32.8 24 32.8"
          stroke="var(--bg)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="var(--bg)"
        />
      </svg>
    </div>
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
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required
      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent"
    />
  );
}

export default function Home() {
  const [view, setView] = useState<View>("choice");

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // La création du foyer sera branchée à la base de données à l'étape suivante.
  }

  function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // La connexion au foyer sera branchée à la base de données à l'étape suivante.
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
        <div className="mb-9 flex flex-col items-center text-center">
          <HearthMark />
          <h1 className="mt-5 font-display text-[2.25rem] italic leading-none text-text">
            Foyer
          </h1>
          <p className="mt-2 text-[15px] text-text-muted">
            L&apos;espace commun de votre maison
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-surface p-7">
          {view === "choice" && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setView("create")}
                className="w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-bg transition-colors hover:bg-accent-soft"
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
                onClick={() => setView("choice")}
                className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
              >
                ← Retour
              </button>
              <h2 className="font-display text-xl text-text">Nouveau foyer</h2>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="create-name">Nom du foyer</FieldLabel>
                <TextField id="create-name" placeholder="Maison Vieillot" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="create-password">Mot de passe</FieldLabel>
                <TextField id="create-password" type="password" autoComplete="new-password" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="create-password-confirm">
                  Confirmer le mot de passe
                </FieldLabel>
                <TextField id="create-password-confirm" type="password" autoComplete="new-password" />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-bg transition-colors hover:bg-accent-soft"
              >
                Créer le foyer
              </button>
            </form>
          )}

          {view === "join" && (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setView("choice")}
                className="mb-1 self-start text-sm text-text-muted transition-colors hover:text-text"
              >
                ← Retour
              </button>
              <h2 className="font-display text-xl text-text">Rejoindre un foyer</h2>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="join-name">Nom du foyer</FieldLabel>
                <TextField id="join-name" placeholder="Maison Vieillot" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="join-password">Mot de passe</FieldLabel>
                <TextField id="join-password" type="password" autoComplete="current-password" />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-bg transition-colors hover:bg-accent-soft"
              >
                Entrer
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
