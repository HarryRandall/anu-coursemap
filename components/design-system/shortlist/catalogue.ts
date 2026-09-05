export type ShortlistOption = {
  id: string;
  name: string;
  reason: string;
  examples: string[];
  states?: string[];
  comparison?:
    "reui-buttons" | "untitled-buttons" | "reui-inputs" | "untitled-inputs";
};
export type ShortlistRound = {
  id: string;
  category: string;
  name: string;
  purpose: string;
  options: ShortlistOption[];
};
export const shortlist: ShortlistRound[] = [
  {
    id: "buttons",
    category: "button",
    name: "Buttons",
    purpose:
      "Actions such as adding a course and saving a plan. Approve the set once, including its supporting states.",
    options: [
      {
        id: "button-set",
        name: "ReUI: compact and flat",
        reason:
          "Tighter controls and a lighter weight. Compare the same actions in both sets.",
        comparison: "reui-buttons",
        examples: ["c-button-1", "c-button-3", "c-button-4"],
        states: ["c-button-5", "c-button-10", "c-button-11"],
      },
      {
        id: "button-untitled",
        name: "Untitled UI: stronger and raised",
        reason:
          "More padding, stronger labels and subtle depth. Same font, colour and actions.",
        comparison: "untitled-buttons",
        examples: [],
        states: [],
      },
    ],
  },
  {
    id: "inputs",
    category: "input",
    name: "Form fields",
    purpose:
      "Search and data entry. Labels, help and errors are included in one decision.",
    options: [
      {
        id: "input-set",
        name: "ReUI: compact fields",
        reason:
          "Compact height and a simple border. Try the same course search in either set.",
        comparison: "reui-inputs",
        examples: ["c-input-2", "c-input-3"],
        states: ["c-input-4", "c-input-5"],
      },
      {
        id: "input-untitled",
        name: "Untitled UI: roomier fields",
        reason:
          "More space inside each field, with the same labels, hints and validation examples.",
        comparison: "untitled-inputs",
        examples: [],
        states: [],
      },
    ],
  },
  {
    id: "tabs",
    category: "tabs",
    name: "Tabs",
    purpose: "Switch between related views without leaving the page.",
    options: [
      {
        id: "tabs-line",
        name: "Underlined",
        reason: "A quiet indicator beneath the active view.",
        examples: ["c-tabs-2"],
      },
      {
        id: "tabs-segment",
        name: "Segmented",
        reason: "A contained switch with a filled active option.",
        examples: ["c-tabs-9"],
      },
    ],
  },
  {
    id: "cards",
    category: "card",
    name: "Cards",
    purpose: "Group course information and its actions.",
    options: [
      {
        id: "card-divided",
        name: "Header badge and actions",
        reason:
          "A status badge and visible actions, from the examples you kept.",
        examples: ["c-card-16"],
      },
      {
        id: "card-footer",
        name: "Icon, title and link",
        reason:
          "An identifiable card with a direct next step. Previously kept.",
        examples: ["c-card-17"],
      },
      {
        id: "card-menu",
        name: "Header label and link",
        reason: "A quieter labelled card you previously kept.",
        examples: ["c-card-18"],
      },
    ],
  },
  {
    id: "alerts",
    category: "alert",
    name: "Alerts",
    purpose: "Show a prerequisite problem or something that needs attention.",
    options: [
      {
        id: "alert-compact",
        name: "Compact notice",
        reason: "An icon and message with minimal interruption.",
        examples: ["c-alert-2"],
        states: ["c-alert-6", "c-alert-7", "c-alert-8"],
      },
      {
        id: "alert-actions",
        name: "Notice with an action",
        reason: "Put the next step alongside the explanation.",
        examples: ["c-alert-11"],
        states: ["c-alert-4", "c-alert-5"],
      },
    ],
  },
  {
    id: "accordion",
    category: "accordion",
    name: "Expandable sections",
    purpose:
      "Reveal degree requirements a section at a time. Your earlier favourite is retained.",
    options: [
      {
        id: "accordion-rich",
        name: "Icons and badges",
        reason:
          "Your earlier preferred example, with more context before expanding.",
        examples: ["c-accordion-6"],
      },
      {
        id: "accordion-bordered",
        name: "Simple bordered rows",
        reason: "A quieter alternative you previously kept.",
        examples: ["c-accordion-3"],
      },
    ],
  },
  {
    id: "dropdown-menus",
    category: "dropdown-menu",
    name: "Action menus",
    purpose: "Secondary actions for a course or plan.",
    options: [
      {
        id: "menu-icons",
        name: "Simple icon list",
        reason: "Quickly scan a small number of actions.",
        examples: ["c-dropdown-menu-3"],
      },
      {
        id: "menu-sections",
        name: "Grouped actions",
        reason: "Separate related actions in a longer menu.",
        examples: ["c-dropdown-menu-8"],
      },
    ],
  },
  {
    id: "dialogs",
    category: "dialog",
    name: "Dialogs",
    purpose: "Make an edit or confirm a decision without losing your place.",
    options: [
      {
        id: "dialog-basic",
        name: "Simple dialog",
        reason: "A focused space for a short task.",
        examples: ["c-dialog-1"],
        states: ["c-dialog-7"],
      },
      {
        id: "dialog-footer",
        name: "Fixed action footer",
        reason: "Keep actions visible while longer content scrolls.",
        examples: ["c-dialog-3"],
        states: ["c-dialog-7"],
      },
    ],
  },
  {
    id: "tables",
    category: "table",
    name: "Tables",
    purpose: "Compare several courses and their status at once.",
    options: [
      {
        id: "table-status",
        name: "Status at a glance",
        reason: "A compact table with clear status badges.",
        examples: ["c-table-3"],
      },
      {
        id: "table-actions",
        name: "Actions on each row",
        reason: "Keep row-specific actions immediately available.",
        examples: ["c-table-4"],
      },
    ],
  },
  {
    id: "selects",
    category: "select",
    name: "Selection menus",
    purpose: "Choose a semester, level or other filter.",
    options: [
      {
        id: "select-simple",
        name: "Simple list",
        reason: "Best for a short list of choices.",
        examples: ["c-select-1"],
        states: ["c-select-9", "c-select-10"],
      },
      {
        id: "select-grouped",
        name: "Grouped list",
        reason: "Add headings when choices need organising.",
        examples: ["c-select-3"],
        states: ["c-select-9", "c-select-10"],
      },
    ],
  },
];

export function findShortlistOption(id: string) {
  for (const round of shortlist) {
    const option = round.options.find((candidate) => candidate.id === id);
    if (option) return { round, option };
  }
}
