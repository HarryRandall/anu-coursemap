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
      <Card className="p-5">
        <Badge tone="brand">Contact us</Badge>
        <div className="mt-3 space-y-2">
          {helpContactReasons.map((contact) => {
            const Icon =
              reasonIcons[contact.id as keyof typeof reasonIcons] ?? Mail;
            return (
              <Button
                key={contact.id}
                variant="ghost"
                className="h-auto min-h-16 w-full justify-start px-2 py-2 text-left !whitespace-normal"
                aria-haspopup="dialog"
                aria-expanded={reasonId === contact.id}
                onClick={() => setReasonId(contact.id)}
              >
                <Icon size={17} className="shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-zinc-800">
                    {contact.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed font-normal !whitespace-normal text-zinc-500">
                    {contact.description}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
        <Button
          variant="secondary"
          fullWidth
          className="mt-3"
          aria-haspopup="dialog"
          aria-expanded={reasonId === "other"}
          onClick={() => setReasonId("other")}
        >
          <Mail size={14} /> Email support
        </Button>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
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
