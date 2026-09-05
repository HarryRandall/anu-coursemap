"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { IsolatedCataloguePreviewFrame } from "@reui/catalogue-preview-frame";
import {
  ComponentReviewProvider,
  useComponentReview,
} from "../review/review-context";
import {
  shortlist,
  type ShortlistOption,
  type ShortlistRound,
} from "./catalogue";
import { useLabTheme } from "../lab/lab-theme-provider";
import styles from "./review.module.css";

function Review() {
  const [active, setActive] = useState(0);
  const { resolved, setTheme } = useLabTheme();
  const { decisions, saveStatus, error, setDecision } = useComponentReview();
  const round = shortlist[active];
  const available = (r: ShortlistRound) =>
    r.options.filter(
      (o) =>
        !o.examples.some(
          (e) => decisions[`reui:${r.category}:${e}`]?.decision === "remove",
        ),
    );
  const chosen = (r: ShortlistRound) => {
    const explicit = decisions[`coursemap:shortlist:${r.id}`]?.description;
    if (explicit) return available(r).find((o) => o.id === explicit);
    return available(r).find((o) =>
      o.examples.some(
        (e) => decisions[`reui:${r.category}:${e}`]?.decision === "preferred",
      ),
    );
  };
  const choose = (
    r: ShortlistRound,
    option: ShortlistOption,
    alternative = false,
  ) =>
    setDecision(
      {
        id: `coursemap:shortlist:${r.id}${alternative ? "-alternative" : ""}`,
        family: "shortlist",
        source: "coursemap",
        title: `${r.name}${alternative ? " alternative" : ""}: ${option.name}`,
        description: option.id,
      },
      alternative ? "keep" : "preferred",
    );
  const count = shortlist.filter((r) => chosen(r)).length;
  return (
    <main className={styles.page} data-theme={resolved}>
      <header>
        <Link href="/design-system/compare">← Your foundation</Link>
        <Link href="/design-system/review">
          Full catalogue & saved decisions
        </Link>
        <div className={styles.theme} aria-label="Review colour theme">
          {(["light", "dark"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={resolved === mode}
              onClick={() => setTheme(mode)}
            >
              {mode === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </header>
      <div className={styles.intro}>
        <span>COURSEMAP / THE SHORTLIST</span>
        <h1>A few good choices.</h1>
        <p>
          Ten rounds. Pick a favourite, keep an alternative if useful, then move
          on.
        </p>
        <small>
          Your earlier decisions are preserved. Removed examples are hidden.
        </small>
      </div>
      <nav aria-label="Component rounds">
        {shortlist.map((r, i) => (
          <button
            type="button"
            key={r.id}
            aria-current={i === active ? "step" : undefined}
            onClick={() => setActive(i)}
          >
            {chosen(r) && <Check size={14} />} {r.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActive(shortlist.length)}
          aria-current={active === shortlist.length ? "step" : undefined}
        >
          Your kit
        </button>
      </nav>
      <div className={styles.status} role="status">
        {saveStatus === "loading"
          ? "Loading your saved decisions..."
          : error
            ? `${error}. Select your choice again to retry.`
            : saveStatus === "saving"
              ? "Saving..."
              : `${count} of ${shortlist.length} families picked · Saved locally`}
      </div>
      {round ? (
        <>
          <div className={styles.round}>
            <div>
              <h2>{round.name}</h2>
              <p>{round.purpose}</p>
            </div>
            <button type="button" onClick={() => setActive(active + 1)}>
              {" "}
              {active === shortlist.length - 1
                ? "See your kit"
                : "Next round"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className={styles.options}>
            {saveStatus !== "loading" &&
              available(round).map((option) => (
                <article
                  key={option.id}
                  data-picked={chosen(round)?.id === option.id}
                >
                  <div className={styles.optionTitle}>
                    <h3>{option.name}</h3>
                    <p>{option.reason}</p>
                    {option.examples.some(
                      (e) =>
                        decisions[`reui:${round.category}:${e}`]?.decision ===
                        "keep",
                    ) && <small>Includes an example you kept</small>}
                  </div>
                  <IsolatedCataloguePreviewFrame
                    src={`/design-system/shortlist/preview/${option.id}`}
                    title={`${round.name}: ${option.name}`}
                    height={round.id === "tables" ? 540 : 390}
                    interactive
                  />
                  <div className={styles.actions}>
                    <button
                      type="button"
                      aria-pressed={chosen(round)?.id === option.id}
                      onClick={() => choose(round, option)}
                    >
                      {chosen(round)?.id === option.id
                        ? "✓ Favourite"
                        : round.options.length === 1
                          ? "Use this set"
                          : "Make favourite"}
                    </button>
                    <button
                      type="button"
                      aria-pressed={
                        decisions[`coursemap:shortlist:${round.id}-alternative`]
                          ?.description === option.id
                      }
                      onClick={() => {
                        const id = `coursemap:shortlist:${round.id}-alternative`;
                        if (decisions[id]?.description === option.id)
                          setDecision(decisions[id], null);
                        else choose(round, option, true);
                      }}
                    >
                      {decisions[`coursemap:shortlist:${round.id}-alternative`]
                        ?.description === option.id
                        ? "✓ Alternative"
                        : "Keep as alternative"}
                    </button>
                  </div>
                  {option.states && (
                    <details>
                      <summary>Included states, no extra decisions</summary>
                      <IsolatedCataloguePreviewFrame
                        src={`/design-system/shortlist/preview/${option.id}?states=1`}
                        title={`${option.name} supporting states`}
                        height={480}
                        interactive
                      />
                    </details>
                  )}
                </article>
              ))}
          </div>
          {saveStatus !== "loading" && available(round).length === 0 && (
            <p>
              You&apos;ve already removed the shortlisted examples in this
              family. Skip it for now or browse the full catalogue.
            </p>
          )}
          <p className={styles.browse}>
            <Link href={`/design-system/review/${round.id}`}>
              None feel right? Browse the full {round.name.toLowerCase()}{" "}
              catalogue →
            </Link>
          </p>
        </>
      ) : (
        <section className={styles.kit}>
          <h2>Your component kit</h2>
          <p>
            These are your review choices. They haven&apos;t replaced components
            in the app.
          </p>
          {shortlist.map((r, i) => (
            <button type="button" key={r.id} onClick={() => setActive(i)}>
              <span>{r.name}</span>
              <strong>{chosen(r)?.name ?? "Not picked yet"}</strong>
              <ArrowRight size={16} />
            </button>
          ))}
          <p>
            Avatars, badges, breadcrumbs and other details remain in the full
            catalogue. Your earlier selections are still available there.
          </p>
        </section>
      )}
    </main>
  );
}
export function ShortlistReview() {
  return (
    <ComponentReviewProvider items={[]}>
      <Review />
    </ComponentReviewProvider>
  );
}
