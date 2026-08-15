"use client";

import { useState } from "react";
import { Bug, Database, Lightbulb, Mail } from "lucide-react";
import { EmailSupportDialog } from "@/components/help/email-support-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { helpContactReasons } from "@/lib/help";

const reasonIcons = {
  problem: Bug,
  data: Database,
  feature: Lightbulb,
} as const;

export function HelpContactCard() {
  const [reasonId, setReasonId] = useState<string | null>(null);

  return (
    <>
      <Card className="overflow-hidden lg:sticky lg:top-20 lg:self-start">
        <h2 className="px-5 pt-5 text-[13px] font-semibold tracking-wide text-zinc-500 uppercase">
          Contact us
        </h2>
        <div className="mt-3 divide-y divide-zinc-100 border-y border-zinc-100">
          {helpContactReasons.map((contact) => {
            const Icon =
              reasonIcons[contact.id as keyof typeof reasonIcons] ?? Mail;
            return (
              <Button
                key={contact.id}
                variant="ghost"
                className="h-auto w-full justify-start rounded-none px-5 py-3.5 text-left !whitespace-normal"
                aria-haspopup="dialog"
                aria-expanded={reasonId === contact.id}
                onClick={() => setReasonId(contact.id)}
              >
                <Icon size={17} className="mt-0.5 shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-zinc-900">
                    {contact.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed font-normal !whitespace-normal text-zinc-500">
                    {contact.description}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
        <div className="p-5">
          <Button
            variant="secondary"
            fullWidth
            aria-haspopup="dialog"
            aria-expanded={reasonId === "other"}
            onClick={() => setReasonId("other")}
          >
            <Mail size={15} /> Email support
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Coursemap is a planning aid and does not replace official ANU
            academic advice.
          </p>
        </div>
      </Card>
      {reasonId ? (
        <EmailSupportDialog
          reasonId={reasonId}
          onClose={() => setReasonId(null)}
        />
      ) : null}
    </>
  );
}
