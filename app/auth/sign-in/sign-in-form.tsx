"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/browser";

export function SignInForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          error.message.toLowerCase().includes("invalid login credentials")
            ? "Email or password is incorrect."
            : "Coursemap could not sign you in. Wait a moment and try again.",
        );
        return;
      }

      window.location.assign(next);
    } catch {
      setErrorMessage(
        "Coursemap could not sign you in. Check the Supabase service and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email address">
        <span className="relative block">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
            placeholder="name@anu.edu.au"
            required
            disabled={!configured || submitting}
            className="min-h-11 pl-10"
          />
        </span>
      </Field>

      <Field label="Password">
        <span className="relative block">
          <LockKeyhole
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            required
            disabled={!configured || submitting}
            className="min-h-11 pl-10"
          />
        </span>
      </Field>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700 ring-1 ring-rose-200"
        >
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!configured || submitting}
        className="min-h-11 !rounded-xl"
      >
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
