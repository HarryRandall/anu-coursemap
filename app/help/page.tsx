import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bug,
  CircleUserRound,
  Database,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Mail,
  Map,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const topics = [
  {
    href: "/plan",
    icon: Map,
    title: "Build your plan",
    description: "Add, move and record courses across study periods.",
  },
  {
    href: "/courses",
    icon: BookOpen,
    title: "Understand a course",
    description: "Search details, prerequisites and catalogue information.",
  },
  {
    href: "/requirements",
    icon: ListChecks,
    title: "Read requirements",
    description: "Understand completed, planned and still-needed units.",
  },
  {
    href: "/profile",
    icon: CircleUserRound,
    title: "Account and degree",
    description: "Update your profile, programme, major and rules year.",
  },
];

const contacts = [
  {
    href: "mailto:support@coursemap.app?subject=Coursemap%20bug%20report",
    icon: Bug,
    title: "Report a problem",
    description:
      "Tell us what happened, what you expected and which page you were using.",
  },
  {
    href: "mailto:support@coursemap.app?subject=Coursemap%20data%20correction",
    icon: Database,
    title: "Correct course data",
    description:
      "Flag a course, prerequisite or requirement that looks incorrect.",
  },
  {
    href: "mailto:support@coursemap.app?subject=Coursemap%20feature%20request",
    icon: Lightbulb,
    title: "Request a feature",
    description: "Share the planning task you want Coursemap to make easier.",
  },
];

const questions = [
  {
    question: "Does Coursemap replace official academic advice?",
    answer:
      "No. Coursemap is a planning aid. Confirm enrolment, programme rules, credit decisions and graduation eligibility with the relevant ANU service or academic adviser.",
  },
  {
    question: "Why does a requirement show the same course twice?",
    answer:
      "A course can be a candidate for more than one rule group. Coursemap shows possible matches, while final allocation follows the official programme rules.",
  },
  {
    question: "Where are class times and rooms?",
    answer:
      "Calendar currently shows your plan and catalogue study periods only. Verified timetable and room data are planned, but Coursemap does not generate class details.",
  },
  {
    question: "How do I change my degree or catalogue year?",
    answer:
      "Open your profile from the bottom of the navigation. Degree, major and catalogue year settings are kept together there.",
  },
];

export default function HelpPage() {
  return (
    <AppShell
      title="Help & support"
      subtitle="Answers, corrections and feedback"
    >
      <div className="mx-auto max-w-6xl">
        <section className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/10">
              <HelpCircle size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold text-brand-200">
                Coursemap support
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                How can we help?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Find the right part of Coursemap, report incorrect data or tell
                us what would make degree planning easier.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Browse help topics
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic) => {
              const Icon = topic.icon;
              return (
                <ButtonLink
                  key={topic.href}
                  href={topic.href}
                  variant="secondary"
                  className="h-auto min-h-32 items-start justify-start p-4 text-left !whitespace-normal"
                >
                  <span className="flex w-full min-w-0 flex-col items-start">
                    <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon size={17} />
                    </span>
                    <span className="mt-3 text-[13px] font-semibold text-zinc-900">
                      {topic.title}
                    </span>
                    <span className="mt-1 block w-full text-[11px] leading-relaxed font-normal !whitespace-normal text-zinc-500">
                      {topic.description}
                    </span>
                  </span>
                </ButtonLink>
              );
            })}
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <Card className="overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Common questions
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Quick answers about planning and Coursemap data.
              </p>
            </div>
            <div className="divide-y divide-zinc-100">
              {questions.map((item) => (
                <details key={item.question} className="group px-5 py-4">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-semibold text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">
                    {item.question}
                    <span className="text-zinc-400 transition group-open:rotate-90">
                      <ArrowRight size={15} />
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl pr-8 text-xs leading-relaxed text-zinc-500">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <Badge tone="brand">Contact us</Badge>
              <div className="mt-3 space-y-2">
                {contacts.map((contact) => {
                  const Icon = contact.icon;
                  return (
                    <ButtonLink
                      key={contact.title}
                      href={contact.href}
                      variant="ghost"
                      className="h-auto min-h-16 w-full justify-start px-2 py-2 text-left !whitespace-normal"
                    >
                      <Icon size={17} className="shrink-0 text-brand-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-zinc-800">
                          {contact.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed font-normal !whitespace-normal text-zinc-500">
                          {contact.description}
                        </span>
                      </span>
                    </ButtonLink>
                  );
                })}
              </div>
              <ButtonLink
                href="mailto:support@coursemap.app"
                variant="secondary"
                size="sm"
                fullWidth
                className="mt-3"
              >
                <Mail size={14} /> Email support
              </ButtonLink>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <AlertCircle size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Need official advice?
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    Contact ANU for enrolment decisions, programme variations,
                    credit, graduation checks and personal academic advice.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <GraduationCap size={18} className="text-brand-600" />
              <h2 className="mt-3 text-sm font-semibold text-zinc-900">
                See what is being built
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Follow current priorities and planned improvements.
              </p>
              <ButtonLink
                href="/roadmap"
                variant="ghost"
                size="sm"
                className="mt-2 -ml-2"
              >
                Product roadmap <ArrowRight size={14} />
              </ButtonLink>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
