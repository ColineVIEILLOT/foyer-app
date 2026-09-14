"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { createHousehold, joinHousehold } from "./actions";

type View = "choice" | "create" | "join" | "success";

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

function CodeField({
  id,
  autoComplete,
}: {
  id: string;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      name={id}
      type="text"
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      placeholder="000000"
      autoComplete={autoComplete}
      required
      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-[20px] tracking-[0.5em] text-text placeholder:text-text-muted/40 outline-none transition-colors focus:border-accent"
    />
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-danger">{message}</p>;
}

export default function Home() {
  const [view, setView] = useState<View>("choice");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await createHousehold(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setView("success");
    } else {
      setError(result.error);
    }
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await joinHousehold(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setView("success");
    } else {
      setError(result.error);
    }
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
                <CodeField id="create-code" autoComplete="off" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="create-code-confirm">Confirmer le code</FieldLabel>
                <CodeField id="create-code-confirm" autoComplete="off" />
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
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={backToChoice}
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
                <FieldLabel htmlFor="join-code">Code à 6 chiffres</FieldLabel>
                <CodeField id="join-code" autoComplete="off" />
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

          {view === "success" && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <h2 className="font-display text-xl font-bold text-text">
                C&apos;est fait !
              </h2>
              <p className="text-[15px] text-text-muted">
                Le foyer est enregistré. La suite (profils, accueil commun)
                arrive à la prochaine étape.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
