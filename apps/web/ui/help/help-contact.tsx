"use client";

import { Button } from "@coursemap/ui/primitives/button";
import { useState } from "react";
import { Bug, Database, Lightbulb, Mail } from "lucide-react";
import { EmailSupportDialog } from "@/ui/help/email-support-dialog";

import { helpContactReasons } from "@/lib/help";

const reasonIcons = {
  problem: Bug,
  data: Database,
  feature: Lightbulb,
} as const;

/**
 * Contact band at the foot of the help centre. Each reason opens the email
 * dialog with that reason preselected; the footer button opens it blank.
 */
export function HelpContact() {
  const [reasonId, setReasonId] = useState<string | null>(null);

  return (
    <>
      <section
        id="contact"
        aria-labelledby="help-contact-heading"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="help-contact-heading"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Contact us
          </h2>
          <Button
            variant="outline"
            aria-haspopup="dialog"
            aria-expanded={reasonId === "other"}
            onClick={() => setReasonId("other")}
            type="button"
          >
            <Mail size={15} aria-hidden="true" />
            Email support
          </Button>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {helpContactReasons.map((contact) => {
            const Icon =
              reasonIcons[contact.id as keyof typeof reasonIcons] ?? Mail;
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={reasonId === contact.id}
                  onClick={() => setReasonId(contact.id)}
                  className="flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-input hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-foreground">
                      {contact.label}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                      {contact.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {reasonId ? (
        <EmailSupportDialog
          reasonId={reasonId}
          onClose={() => setReasonId(null)}
        />
      ) : null}
    </>
  );
}
