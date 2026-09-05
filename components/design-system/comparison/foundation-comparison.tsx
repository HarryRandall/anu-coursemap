"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  GraduationCap,
} from "lucide-react";
import {
  ComponentReviewProvider,
  useComponentReview,
} from "../review/review-context";
import styles from "./foundation-comparison.module.css";

const steps = [
  {
    id: "font",
    label: "Font",
    question: "Which writing feels right?",
    hint: "Same words, same size. Just a different font.",
    options: [
      { id: "geist", name: "Geist", note: "The font already in Coursemap." },
      {
        id: "inter",
        name: "Inter",
        note: "The font from the Untitled UI examples.",
      },
    ],
  },
  {
    id: "colour",
    label: "Colour",
    question: "Which colour feels like Coursemap?",
    hint: "Look at the button, selected filter and course icon together.",
    options: [
      { id: "violet", name: "Violet", note: "Keep the familiar purple." },
      { id: "blue", name: "Blue", note: "A cooler direction." },
      { id: "teal", name: "Teal", note: "A greener direction." },
    ],
  },
  {
    id: "corners",
    label: "Corners",
    question: "How rounded do you like it?",
    hint: "Compare the edges of the card, search box and button.",
    options: [
      { id: "tight", name: "Subtle", note: "Small, tidy corners." },
      { id: "balanced", name: "Rounded", note: "A little softer." },
      {
        id: "soft",
        name: "Extra rounded",
        note: "A softer, friendlier shape.",
      },
    ],
  },
  {
    id: "spacing",
    label: "Spacing",
    question: "More on screen, or more breathing room?",
    hint: "The text stays the same size. Only the space around it changes.",
    options: [
      { id: "compact", name: "Compact", note: "Fits more courses on screen." },
      {
        id: "comfortable",
        name: "Comfortable",
        note: "A little more room to read.",
      },
      { id: "airy", name: "Spacious", note: "Generous gaps and padding." },
    ],
  },
  {
    id: "finish",
    label: "Card style",
    question: "Which card treatment do you prefer?",
    hint: "Look at how the course card sits against the background.",
    options: [
      {
        id: "border",
        name: "Simple border",
        note: "A fine outline, no shadow.",
      },
      {
        id: "shadow",
        name: "Soft shadow",
        note: "A little depth beneath the card.",
      },
    ],
  },
] as const;

type Choices = Record<(typeof steps)[number]["id"], string>;
const defaults: Choices = {
  font: "geist",
  colour: "violet",
  corners: "balanced",
  spacing: "comfortable",
  finish: "border",
};
const fonts: Record<string, string> = {
  geist: "var(--font-geist-sans), sans-serif",
  inter: '"Inter Variable", sans-serif',
};
const colours: Record<string, [string, string, string]> = {
  violet: ["#6d28d9", "#ede9fe", "#c4b5fd"],
  blue: ["#1d4ed8", "#dbeafe", "#93c5fd"],
  teal: ["#0f766e", "#ccfbf1", "#5eead4"],
};

function Sample({ choices, dark }: { choices: Choices; dark: boolean }) {
  const [accent, tint, light] = colours[choices.colour];
  const radius = { tight: 4, balanced: 10, soft: 20 }[choices.corners] ?? 10;
  const space =
    { compact: 12, comfortable: 20, airy: 28 }[choices.spacing] ?? 20;
  const vars = {
    fontFamily: fonts[choices.font],
    "--sample-accent": accent,
    "--sample-tint": dark ? `${accent}35` : tint,
    "--sample-ink": dark ? light : accent,
    "--sample-radius": `${radius}px`,
    "--sample-space": `${space}px`,
  } as CSSProperties;
  return (
    <div
      className={styles.sample}
      data-dark={dark}
      data-finish={choices.finish}
      style={vars}
      aria-hidden="true"
    >
      <div className={styles.sampleBrand}>
        <GraduationCap size={19} /> coursemap
      </div>
      <h3>Find your next course</h3>
      <p>Make room for something you&apos;re curious about.</p>
      <div className={styles.search}>
        <Search size={16} /> Search courses
      </div>
      <div className={styles.filters}>
        <span>All courses</span>
        <span>Computing</span>
      </div>
      <div className={styles.course}>
        <div className={styles.courseTop}>
          <span className={styles.glyph}>C</span>
          <span>
            COMP2100 <span className={styles.units}>· 6 units</span>
          </span>
        </div>
        <h4>Software Design Methodologies</h4>
        <p>Build software that is easier to understand, extend and maintain.</p>
        <div className={styles.meta}>
          Semester 1 <span>Undergraduate</span>
        </div>
        <div className={styles.eligible}>
          <Check size={14} /> Prerequisites met
        </div>
        <div className={styles.sampleButton}>
          Add to plan <span>+</span>
        </div>
      </div>
      <div className={styles.sampleFooter}>
        Showing 12 courses <span>1 of 3</span>
      </div>
    </div>
  );
}

function Comparison() {
  const [active, setActive] = useState(0);
  const [dark, setDark] = useState(false);
  const { decisions, saveStatus, error, setDecision } = useComponentReview();
  const choices = { ...defaults };
  let count = 0;
  for (const step of steps) {
    const saved = decisions[`coursemap:foundations:${step.id}`]?.description;
    if (saved && step.options.some((option) => option.id === saved)) {
      choices[step.id] = saved;
      count++;
    }
  }
  const step = steps[active];
  const picked =
    step && decisions[`coursemap:foundations:${step.id}`]?.description;
  const loading = saveStatus === "loading";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/design-system/review">
          <ArrowLeft size={16} /> Component review
        </Link>
        <span className={styles.progress}>
          {count} of {steps.length} choices made
        </span>
      </header>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>COURSEMAP / FIND YOUR STYLE</span>
        <h1>Let&apos;s see what you like.</h1>
        <p>
          Pick your favourite in each round. Your choices carry into the next
          comparison.
        </p>
      </div>
      <nav className={styles.steps} aria-label="Style comparisons">
        {steps.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-current={active === index ? "step" : undefined}
            onClick={() => setActive(index)}
          >
            <span>
              {decisions[`coursemap:foundations:${item.id}`] ? (
                <Check size={14} />
              ) : (
                index + 1
              )}
            </span>
            {item.label}
          </button>
        ))}
        <button
          type="button"
          aria-current={active === steps.length ? "step" : undefined}
          onClick={() => setActive(steps.length)}
        >
          Your mix <ArrowRight size={14} />
        </button>
      </nav>
      <div className={styles.roundHeader}>
        <div>
          <h2>{step?.question ?? "Here's your combination."}</h2>
          <p>
            {step?.hint ??
              "Go back to any round to change your mind. These choices don't change the app yet."}
          </p>
        </div>
        <label className={styles.themeToggle}>
          <input
            type="checkbox"
            checked={dark}
            onChange={(event) => setDark(event.target.checked)}
          />{" "}
          Dark preview
        </label>
      </div>
      {step ? (
        <fieldset className={styles.options} disabled={loading} key={step.id}>
          <legend className={styles.srOnly}>{step.question}</legend>
          {step.options.map((option) => (
            <label
              key={option.id}
              className={styles.option}
              data-selected={picked === option.id}
            >
              <div className={styles.optionHeading}>
                <div>
                  <strong>{option.name}</strong>
                  <small>{option.note}</small>
                </div>
                <input
                  type="radio"
                  name={step.id}
                  value={option.id}
                  aria-label={`Choose ${option.name}`}
                  checked={picked === option.id}
                  onChange={() =>
                    setDecision(
                      {
                        id: `coursemap:foundations:${step.id}`,
                        family: "foundations",
                        title: `${step.label}: ${option.name}`,
                        description: option.id,
                        source: "coursemap",
                      },
                      "preferred",
                    )
                  }
                />
              </div>
              <Sample
                dark={dark}
                choices={{ ...choices, [step.id]: option.id }}
              />
              <div className={styles.pick}>
                {picked === option.id ? (
                  <>
                    <Check size={16} /> Your pick
                  </>
                ) : (
                  `Choose ${option.name}`
                )}
              </div>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className={styles.result}>
          <Sample choices={choices} dark={dark} />
          <div className={styles.resultDetails}>
            <h3>Your choices</h3>
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(index)}
              >
                <span>{item.label}</span>
                <strong>
                  {decisions[`coursemap:foundations:${item.id}`]
                    ? item.options.find(
                        (option) => option.id === choices[item.id],
                      )?.name
                    : "Not picked yet"}
                </strong>
                <ArrowRight size={16} />
              </button>
            ))}
            {count < steps.length && (
              <p>Unpicked settings use a starting style for this preview.</p>
            )}
            <Link href="/design-system/shortlist">
              Continue to components <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
      <footer className={styles.footer}>
        <div role="status">
          {loading ? (
            "Loading your choices..."
          ) : error ? (
            <>
              {error}. Your latest choice may not be saved.{" "}
              <button type="button" onClick={() => window.location.reload()}>
                Reload saved choices
              </button>
            </>
          ) : saveStatus === "saving" ? (
            "Saving..."
          ) : count ? (
            "Choices saved locally. Change them whenever you like."
          ) : (
            "Nothing picked yet. Click the version you like."
          )}
        </div>
        {step && (
          <button
            type="button"
            className={styles.next}
            onClick={() => setActive(active + 1)}
          >
            {active === steps.length - 1 ? "See your mix" : "Next comparison"}
            <ArrowRight size={16} />
          </button>
        )}
      </footer>
    </main>
  );
}

export function FoundationComparison() {
  return (
    <ComponentReviewProvider items={[]}>
      <Comparison />
    </ComponentReviewProvider>
  );
}
