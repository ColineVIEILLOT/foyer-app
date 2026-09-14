"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

type View = "choice" | "create" | "join";

function LogoMark() {
  return (
    <Image
      src="/logo.png"
      alt="Home"
      width={200}
      height={200}
      priority
      className="h-28 w-28"
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
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark />
          <p className="mt-1 text-[15px] text-text-muted">
            L&apos;espace commun de votre maison
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
                onClick={() => setView("choice")}
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
                className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft"
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
              <h2 className="font-display text-xl font-bold text-text">Rejoindre un foyer</h2>
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
                className="mt-2 w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-soft"
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
// build 1789414939
