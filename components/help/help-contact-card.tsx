"use client";

import { useState } from "react";
import { Bug, Database, Lightbulb, Mail } from "lucide-react";
import { EmailSupportDialog } from "@/components/help/email-support-dialog";
import { Badge } from "@/components/ui/badge";
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
      <Card className="flex h-full flex-col p-6 sm:p-7">
        <Badge tone="brand">Contact us</Badge>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Report a bug, flag catalogue data or ask for a planning improvement.
        </p>
        <div className="mt-4 flex flex-1 flex-col justify-evenly gap-1">
          {helpContactReasons.map((contact) => {
            const Icon =
              reasonIcons[contact.id as keyof typeof reasonIcons] ?? Mail;
            return (
              <Button
                key={contact.id}
                variant="ghost"
                className="h-auto min-h-16 w-full justify-start px-2 py-3 text-left !whitespace-normal"
                aria-haspopup="dialog"
                aria-expanded={reasonId === contact.id}
                onClick={() => setReasonId(contact.id)}
              >
                <Icon size={20} className="shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-800">
                    {contact.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed font-normal !whitespace-normal text-zinc-500">
                    {contact.description}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          className="mt-5"
          aria-haspopup="dialog"
          aria-expanded={reasonId === "other"}
          onClick={() => setReasonId("other")}
        >
          <Mail size={16} /> Email support
        </Button>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Coursemap is a planning aid and does not replace official ANU academic
          advice.
        </p>
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
