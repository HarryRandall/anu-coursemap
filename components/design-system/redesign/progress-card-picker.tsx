"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  ArrowRight,
  CalendarDays,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  ComponentReviewProvider,
  useComponentReview,
} from "../review/review-context";
import { useLabTheme } from "../lab/lab-theme-provider";
import { previewPlan } from "./fixtures";
import theme from "./dashboard-preview.module.css";
import styles from "./progress-card-picker.module.css";

const options = [
  {
    id: "compact",
    title: "Compact summary",
    description: "A small headline, a progress bar and the essentials.",
  },
  {
    id: "ring",
    title: "Progress ring",
    description: "Completion at a glance, with the unit breakdown beside it.",
  },
  {
    id: "milestones",
    title: "Year milestones",
    description: "Your progress along the four years of the degree.",
  },
  {
    id: "breakdown",
    title: "Units breakdown",
    description: "Four clear totals, with less emphasis on the percentage.",
  },
  {
    id: "split",
    title: "Split overview",
    description: "A violet summary alongside the remaining work.",
  },
] as const;
type CardId = (typeof options)[number]["id"];
const reviewId = "coursemap:redesign:degree-progress-card";
const segments = [
  { label: "Completed", value: previewPlan.completed, tone: "green" },
  { label: "Enrolled", value: previewPlan.enrolled, tone: "violet" },
  { label: "Planned", value: previewPlan.planned, tone: "lavender" },
  { label: "Unallocated", value: previewPlan.unallocated, tone: "muted" },
];
const completedPercent = Math.round(
  (previewPlan.completed / previewPlan.total) * 100,
);
const remaining = previewPlan.total - previewPlan.completed;

function ProgressBar() {
  return (
    <div
      className={styles.bar}
      role="img"
      aria-label="192 units: 48 completed, 24 enrolled, 90 planned, 30 unallocated"
    >
      {segments.map((segment) => (
        <span
          key={segment.label}
          data-tone={segment.tone}
          style={{ width: `${(segment.value / previewPlan.total) * 100}%` }}
        />
      ))}
    </div>
  );
}
function Breakdown({ tiles = false }: { tiles?: boolean }) {
  return (
    <dl className={tiles ? styles.tiles : styles.breakdown}>
      {segments.map((segment) => (
        <div key={segment.label} data-tone={segment.tone}>
          <dt>
            <i />
            {segment.label}
          </dt>
          <dd>
            {segment.value}
            <span> units</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
function ProgressCard({
  variant,
  onCompare,
  example = false,
}: {
  variant: CardId;
  onCompare?: () => void;
  example?: boolean;
}) {
  return (
    <section className={styles.card} data-variant={variant}>
      <header className={styles.header}>
        <h2>Degree progress</h2>
        {onCompare ? (
          <button
            type="button"
            onClick={onCompare}
            className={styles.compareButton}
            aria-label="Compare five progress cards"
          >
            <SlidersHorizontal size={14.4} />
            Change card
          </button>
        ) : example ? (
          <span className={styles.percentBadge}>
            {completedPercent}% complete
          </span>
        ) : null}
      </header>
      <div className={styles.body}>
        <p className={styles.degree}>Bachelor of Advanced Computing</p>
        {variant === "compact" && (
          <>
            <div className={styles.compactHeadline}>
              <p>
                <strong>{previewPlan.completed}</strong>
                <span> / {previewPlan.total} units completed</span>
              </p>
              <span className={styles.percentBadge}>{completedPercent}%</span>
            </div>
            <ProgressBar />
            <Breakdown />
          </>
        )}
        {variant === "ring" && (
          <div className={styles.ringLayout}>
            <div className={styles.ring}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="51" />
                <circle
                  cx="60"
                  cy="60"
                  r="51"
                  pathLength="100"
                  strokeDasharray={`${completedPercent} 100`}
                />
              </svg>
              <p>
                <strong>{completedPercent}%</strong>
                <span>completed</span>
              </p>
            </div>
            <div>
              <p className={styles.remaining}>
                <strong>{remaining}</strong> units remaining
              </p>
              <Breakdown />
            </div>
          </div>
        )}
        {variant === "milestones" && (
          <>
            <div className={styles.compactHeadline}>
              <p>
                <strong>{previewPlan.completed}</strong>
                <span> / {previewPlan.total} units completed</span>
              </p>
            </div>
            <ol className={styles.milestones}>
              {["Completed", "Current", "Planned", "Target"].map(
                (status, index) => (
                  <li key={status} data-state={status.toLowerCase()}>
                    <span>{index === 0 ? <Check size={15} /> : index + 1}</span>
                    <strong>{previewPlan.commencement + index}</strong>
                    <small>{status}</small>
                  </li>
                ),
              )}
            </ol>
            <ProgressBar />
            <Breakdown />
          </>
        )}
        {variant === "breakdown" && (
          <>
            <Breakdown tiles />
            <div className={styles.breakdownFoot}>
              <span>{completedPercent}% completed</span>
              <span>{previewPlan.total} units in total</span>
            </div>
            <ProgressBar />
          </>
        )}
        {variant === "split" && (
          <div className={styles.splitLayout}>
            <div className={styles.splitSummary}>
              <span>Completed</span>
              <strong>
                {completedPercent}
                <small>%</small>
              </strong>
              <span>
                {previewPlan.completed} of {previewPlan.total} units
              </span>
            </div>
            <div className={styles.splitDetails}>
              <p className={styles.remaining}>
                <strong>{remaining}</strong> units remaining
              </p>
              <Breakdown />
              <ProgressBar />
            </div>
          </div>
        )}
      </div>
      <footer className={styles.footer}>
        <span>
          <CalendarDays size={14.4} />
          Planned completion <strong>Nov {previewPlan.completion}</strong>
        </span>
        {example ? (
          <span className={styles.exampleLink}>
            Open my plan <ArrowRight size={14.4} />
          </span>
        ) : (
          <Link href="/plan">
            Open my plan <ArrowRight size={14.4} />
          </Link>
        )}
      </footer>
    </section>
  );
}
function ProgressChoice() {
  const { resolved } = useLabTheme();
  const { decisions, setDecision, saveStatus, error } = useComponentReview();
  const [open, setOpen] = useState(false);
  const stored = decisions[reviewId]?.description;
  const selected = options.find((option) => option.id === stored)?.id;
  const choose = (id: CardId) => {
    const option = options.find((option) => option.id === id)!;
    setDecision(
      {
        id: reviewId,
        family: "redesign",
        source: "coursemap",
        title: `Degree progress: ${option.title}`,
        description: id,
      },
      "preferred",
    );
    setOpen(false);
  };
  return (
    <div className={styles.review}>
      <ProgressCard
        variant={selected ?? "compact"}
        onCompare={() => setOpen(true)}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}. Open Change card to try again.
        </p>
      )}
      <span className={theme.srOnly} role="status">
        {saveStatus === "saving"
          ? "Saving card choice"
          : selected
            ? `Selected ${options.find((option) => option.id === selected)?.title}`
            : "No progress card selected"}
      </span>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={theme.overlay} />
          <Dialog.Content
            className={`${theme.tokens} ${styles.dialog}`}
            data-theme={resolved}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document
                .querySelector<HTMLButtonElement>(
                  'button[aria-label="Compare five progress cards"]',
                )
                ?.focus();
            }}
          >
            <header className={styles.dialogHeader}>
              <div>
                <Dialog.Title>Choose your progress card</Dialog.Title>
                <Dialog.Description>
                  Five layouts using the same sample degree. Pick one to use in
                  the dashboard.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={theme.iconButton}
                  aria-label="Close card comparison"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </header>
            <div className={styles.options}>
              {options.map((option, index) => (
                <article key={option.id} className={styles.option}>
                  <div className={styles.optionHeading}>
                    <span>{index + 1}</span>
                    <div>
                      <h3>{option.title}</h3>
                      <p>{option.description}</p>
                    </div>
                  </div>
                  <ProgressCard variant={option.id} example />
                  <button
                    type="button"
                    className={styles.useButton}
                    disabled={
                      saveStatus === "loading" || saveStatus === "saving"
                    }
                    onClick={() => choose(option.id)}
                    aria-label={`Use ${option.title}`}
                  >
                    {selected === option.id ? (
                      <>
                        <Check size={15} />
                        Selected
                      </>
                    ) : (
                      <>
                        Use this card
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </article>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
export function DegreeProgressCard({ compare = false }: { compare?: boolean }) {
  if (!compare) return <ProgressCard variant="compact" />;
  return (
    <ComponentReviewProvider items={[]}>
      <ProgressChoice />
    </ComponentReviewProvider>
  );
}
