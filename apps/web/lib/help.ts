export type HelpArticleSection = {
  heading: string;
  body: string;
  /** Short ordered instructions rendered as a numbered list under the body. */
  steps?: string[];
  /** One-line aside rendered as a callout after the body and steps. */
  tip?: string;
  image?: { src: string; alt: string; caption: string };
  videoPlaceholder?: string;
};

export type HelpCategoryId =
  "getting-started" | "planning" | "courses" | "account";

export type HelpCategory = {
  id: HelpCategoryId;
  label: string;
};

export const helpCategories: HelpCategory[] = [
  { id: "getting-started", label: "Getting started" },
  { id: "planning", label: "Plan your degree" },
  { id: "courses", label: "Courses and requirements" },
  { id: "account", label: "Account and record" },
];

export type HelpArticle = {
  slug: string;
  title: string;
  description: string;
  category: HelpCategoryId;
  productHref: string;
  productLabel: string;
  sections: HelpArticleSection[];
};

export const helpArticles: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Get started with Coursemap",
    description:
      "Create an account, skip or finish onboarding and set up a plan.",
    category: "getting-started",
    productHref: "/dashboard",
    productLabel: "Go to home",
    sections: [
      {
        heading: "Create an account",
        body: "Sign up with an email address and password. Social sign-in buttons are shown on the sign-in and sign-up pages but are not active yet; they tell you the provider is coming soon rather than starting a sign-in.",
      },
      {
        heading: "Onboarding is optional",
        body: "After sign-up you land on onboarding, which asks for your programme, major and catalogue year so the plan and requirements views can apply the right rules. Choose Skip for now if you would rather look around first. Home shows an empty state with a link back to onboarding until a plan exists.",
      },
      {
        heading: "Set up your first plan",
        body: "Requirements, Calendar and Academic all read from your plan, so a small, honest plan is more useful than a complete guess.",
        steps: [
          "Open Plan from the sidebar.",
          "Search for a course you have completed or are enrolled in and add it to the matching study period.",
          "Mark it completed or enrolled so Academic and Requirements count it.",
          "Add the courses you intend to take next; leave later years empty until you decide.",
        ],
        tip: "You can change programme, major or catalogue year later from Profile without losing the courses already on your plan.",
      },
    ],
  },
  {
    slug: "quick-find",
    title: "Find a course from anywhere",
    description: "Use the Find shortcut to jump to a course or page.",
    category: "getting-started",
    productHref: "/courses",
    productLabel: "Browse courses",
    sections: [
      {
        heading: "Open Find",
        body: "Press F on any page, or Ctrl K on Windows and Cmd K on a Mac, to open Find from the sidebar. Clicking the Find box does the same.",
        tip: "The F shortcut is ignored while you are typing in a field, so it will not interrupt a form. Ctrl K and Cmd K work everywhere.",
      },
      {
        heading: "Search by code or title",
        body: "Type a course code such as COMP1100 or part of a title. Results show the current catalogue year and open the course page directly. Before you type, Find lists shortcuts to the course catalogue and your plan.",
      },
      {
        heading: "In the admin console",
        body: "The same shortcut works in the admin console, where the default shortcuts point at the course catalogue and course imports instead.",
      },
    ],
  },
  {
    slug: "appearance-and-navigation",
    title: "Personalise the workspace",
    description:
      "Switch theme, collapse the sidebar and use Coursemap on a phone.",
    category: "getting-started",
    productHref: "/dashboard",
    productLabel: "Go to home",
    sections: [
      {
        heading: "Light, dark or system theme",
        body: "The theme control at the top right of every page offers light, dark and system. System follows your operating system setting. The choice is kept on this device.",
      },
      {
        heading: "Collapse the sidebar",
        body: "Use the toggle at the top left to collapse the sidebar to icons. Hover an icon to see its label. The collapsed state is remembered as you move between pages.",
        tip: "The breadcrumb at the top of each page uses the same icon as its sidebar entry, so a collapsed sidebar is still easy to read.",
      },
      {
        heading: "On a phone",
        body: "On narrow screens the sidebar opens as a drawer from the same toggle and closes when you pick a page. Plan, Courses and Requirements work on a phone, but the plan board and prerequisite graph are easier to read on a larger screen.",
      },
    ],
  },
  {
    slug: "build-your-plan",
    title: "Build your plan",
    description: "Add, move and record courses across study periods.",
    category: "planning",
    productHref: "/plan",
    productLabel: "Open your plan",
    sections: [
      {
        heading: "What the plan is for",
        body: "The plan is a working view of your degree. Add courses to a study period, move them as your ideas change, and record completed or enrolled work so the rest of Coursemap can keep up.",
      },
      {
        heading: "Choose a study period",
        body: "The board groups your plan by year and study period. Each period shows its courses and unit total. Start with the period you want to plan, then use Add course in an empty slot or the plus button beside its heading.",
        image: {
          src: "/help/plan-study-period.png",
          alt: "An empty semester with its unit total, Add course slots and a plus button beside its heading.",
          caption:
            "An empty study period. Use an Add course slot or the plus button beside the heading. Dates and units depend on your plan.",
        },
      },
      {
        heading: "Find and add a course",
        body: "The Find a course dialog keeps your chosen study period visible while you search. It searches published courses for the selected year.",
        steps: [
          "Select Add course in the period you want to use.",
          "Enter at least two characters of a course code or name.",
          "Select a result and review its course details before adding it to your plan.",
        ],
        tip: "If a course is missing, check the catalogue year and try its code. A missing search result does not establish whether ANU offers the course.",
        videoPlaceholder: "Walkthrough: find and add a course",
      },
      {
        heading: "Move courses between periods",
        body: "Drag a planned or enrolled course using its reorder handle to change where it sits in your plan. Completed and failed attempts cannot move between periods. Check the destination period's unit total and review any prerequisite warnings after the move.",
        steps: [
          "Find the course on the board and use its reorder handle.",
          "Move it to the destination study period.",
          "Review the new sequence before adding more courses.",
        ],
        tip: "A course tied to one catalogue year cannot move into another year. Remove it and add the destination year's course instead.",
      },
      {
        heading: "Record completed and enrolled work",
        body: "Keep an attempt's status aligned with your actual study. Planned work represents an intention; enrolled work represents a current enrolment. Completed and failed attempts record past study. Open a course on the board to review or change its attempt details.",
        tip: "Updating Coursemap does not enrol you in or withdraw you from a course at ANU.",
      },
      {
        heading: "Review prerequisites and progress",
        body: "Revisit Requirements after changing your plan to see how your courses contribute to programme rules. Check prerequisite warnings against the course details, especially when moving a course earlier in your degree.",
        steps: [
          "Review warnings on the courses you added or moved.",
          "Open Requirements to check completed, planned and missing work.",
          "Confirm uncertain rules with the ANU handbook or an academic adviser before relying on the sequence.",
        ],
      },
      {
        heading: "Where are class times and rooms?",
        body: "Calendar currently shows your plan and catalogue study periods only. Verified timetable and room data are planned, but Coursemap does not generate class details. Use official ANU timetable sources when you need times and locations.",
      },
    ],
  },
  {
    slug: "study-calendar",
    title: "Use the study calendar",
    description: "See planned courses by study period, without class times.",
    category: "planning",
    productHref: "/calendar",
    productLabel: "Open calendar",
    sections: [
      {
        heading: "What the calendar shows",
        body: "Calendar shows your plan's study periods with course counts alongside published ANU key dates. Switch between month and agenda views, and use the category filters to choose what appears. It is not a live timetable.",
      },
      {
        heading: "Class times and rooms",
        body: "Coursemap does not generate class times or room bookings. Use official ANU timetable sources when you need when and where to attend. Room finder is a separate, still-limited view.",
      },
      {
        heading: "Change what appears",
        body: "Add, move or remove courses on the plan. Calendar updates from that plan, so keep the plan current if you want the calendar to stay useful.",
      },
    ],
  },
  {
    slug: "key-dates",
    title: "Check key dates",
    description:
      "Semester starts, census dates and exam periods from the ANU calendar.",
    category: "planning",
    productHref: "/key-dates",
    productLabel: "Open key dates",
    sections: [
      {
        heading: "Where the dates come from",
        body: "Key dates are imported from the official ANU university calendar and published by the Coursemap team once they have been checked. Each list links back to the ANU calendar so you can confirm a date at the source.",
      },
      {
        heading: "Switch year and period",
        body: "When more than one year has been published, use the year control to move between them. The page opens on the most recent published year and separates dates that have already passed from upcoming ones.",
        tip: "Key dates are university-wide. Course-specific deadlines such as assessment due dates are not imported.",
      },
      {
        heading: "If nothing is listed",
        body: "A year that has not been imported yet shows an empty state with a link to the ANU calendar. Nothing is missing from your plan; the dates simply have not been published in Coursemap.",
      },
    ],
  },
  {
    slug: "room-finder",
    title: "Find a room on campus",
    description:
      "Search buildings and rooms on the Acton campus. Preview feature.",
    category: "planning",
    productHref: "/rooms",
    productLabel: "Open room finder",
    sections: [
      {
        heading: "Search the campus",
        body: "Type a building name, room number or service into the search box to see matching places on the map. Pick a result to centre the map on it.",
        steps: [
          "Open Room finder from the Resources section of the sidebar.",
          "Type at least part of a building name, room code or service name.",
          "Choose a result. Buildings are listed first, then rooms and services within them.",
        ],
      },
      {
        heading: "Layers and directions",
        body: "Layers switch map detail on and off. Directions draw a route between two places you choose as a start and end point.",
        tip: "Indoor detail exists only for buildings the Coursemap team has mapped, so many rooms still resolve to their building entrance.",
      },
      {
        heading: "Why it is marked preview",
        body: "Room finder is still being filled in. Coverage is uneven and it does not know your timetable, so it cannot tell you where a class is. Treat it as a map, and use the official ANU timetable for class locations.",
      },
    ],
  },
  {
    slug: "understand-a-course",
    title: "Understand a course",
    description: "Search details, prerequisites and catalogue information.",
    category: "courses",
    productHref: "/courses",
    productLabel: "Browse courses",
    sections: [
      {
        heading: "Find a course",
        body: "Use search from the header or the course catalogue. You can look up a code, title or subject and open the course page for units, offering session, delivery and a short description.",
      },
      {
        heading: "Read prerequisites",
        body: "Each course page shows the prerequisite chain as a graph and as text. Completed, planned and still-needed courses are labelled, so you can see the path without relying on colour alone.",
      },
      {
        heading: "Treat catalogue data as a starting point",
        body: "Coursemap keeps the source year and parse state visible. If a rule looks incomplete or a course looks wrong, use Help to flag it rather than treating the page as the official handbook.",
      },
    ],
  },
  {
    slug: "prerequisite-graph",
    title: "Read a prerequisite graph",
    description: "What the nodes, labels and warnings on a course chain mean.",
    category: "courses",
    productHref: "/courses",
    productLabel: "Browse courses",
    sections: [
      {
        heading: "Columns, left to right",
        body: "Each node is a course code. The columns read in study order: Then requires, Requires, This course and Unlocks. Lines join a prerequisite to the course that needs it, and the course you opened sits in the middle column so you can see both what leads to it and what it opens up.",
      },
      {
        heading: "Completed, planned and still needed",
        body: "A tick marks a course recorded as completed. A course already on your plan appears as a plain node, and a course you still need is highlighted. A padlock means the code was referenced in the catalogue but has not been imported yet, so it cannot be opened. The Requisites tab lists the same rules as text with your progress against each condition.",
      },
      {
        heading: "When the graph is empty",
        body: "The graph only draws course codes it could map from the catalogue wording. If a course has prerequisite text but the column reads No mapped course references yet, read the original wording on the Requisites tab. An imported reference is descriptive; it is not a verified enrolment rule until its source has been reviewed.",
      },
    ],
  },
  {
    slug: "read-requirements",
    title: "Read requirements",
    description: "Understand completed, planned and still-needed units.",
    category: "courses",
    productHref: "/requirements",
    productLabel: "Open requirements",
    sections: [
      {
        heading: "What the page shows",
        body: "Requirements groups the rules for your selected programme, major, minors and specialisations. Each group shows the imported rules and which courses are possible matches.",
      },
      {
        heading: "Why the same course can appear twice",
        body: "A course can be a candidate for more than one rule group. Coursemap shows possible matches, while final allocation follows the official programme rules. Seeing a course in two places does not mean it will count twice.",
      },
      {
        heading: "Use it to plan, then confirm",
        body: "The coverage view is there to help you choose what to add next. Confirm enrolment, substitutions and graduation eligibility with ANU before you treat a group as finished.",
      },
    ],
  },
  {
    slug: "catalogue-accuracy",
    title: "Why Coursemap can differ from the handbook",
    description:
      "How catalogue data is imported and what to do when it looks wrong.",
    category: "courses",
    productHref: "/courses",
    productLabel: "Browse courses",
    sections: [
      {
        heading: "Every record has a source",
        body: "Courses, programmes, majors and requirement rules are imported from published ANU catalogue pages for a specific year. Coursemap records the year, the source and when the import ran, and shows the year on each course page.",
      },
      {
        heading: "Rules are parsed, not retyped",
        body: "Prerequisite and requirement text is read by an import step that turns it into structured rules. When the wording is ambiguous the record is marked for review rather than guessed, and the original text is kept so you can read it yourself.",
      },
      {
        heading: "Report something that looks wrong",
        body: "A corrected record is re-imported and published, so a fix reaches every plan that uses it.",
        steps: [
          "Open the Help centre and choose Correct course data.",
          "Name the course or rule, the catalogue year shown on the page and what you expected to see.",
          "Link the ANU page you compared it against if you have it.",
        ],
      },
    ],
  },
  {
    slug: "account-and-degree",
    title: "Account and degree",
    description: "Update your profile, academic structures and rules year.",
    category: "account",
    productHref: "/profile",
    productLabel: "Open your profile",
    sections: [
      {
        heading: "Keep your details in one place",
        body: "Open Profile from the bottom of the navigation. Name, student ID, programme, major, minors, specialisations and catalogue year are kept together so plan and requirements views use the same rules.",
      },
      {
        heading: "How to change your degree or catalogue year",
        body: "Changing the catalogue year updates which course and requirement data Coursemap applies to your plan.",
        steps: [
          "Open Profile and switch to the Course of study tab.",
          "Choose the programme, then the major, minors or specialisations that apply.",
          "Set the catalogue year that matches the rules you are enrolled under.",
          "Save. Requirements and Academic recalculate on the next load.",
        ],
        tip: "Your ANU offer letter or enrolment record states which year's rules apply to you. Use that year rather than the current one.",
      },
      {
        heading: "Does Coursemap replace official academic advice?",
        body: "No. Coursemap is a planning aid. Confirm enrolment, programme rules, credit decisions and graduation eligibility with the relevant ANU service or academic adviser.",
      },
    ],
  },
  {
    slug: "academic-record",
    title: "Read your academic record",
    description: "Review completed work, marks and units earned.",
    category: "account",
    productHref: "/academic",
    productLabel: "Open academic record",
    sections: [
      {
        heading: "What the overview covers",
        body: "Academic shows completed courses, recorded mark average, units earned and failed attempts for the catalogue year on your profile. Open a course from the list to see how it sits in your plan.",
      },
      {
        heading: "Keep the record aligned",
        body: "Completed and planned work is recorded from your plan and profile. If a mark or status looks wrong, update it there or flag the data from Help rather than treating the overview as an official transcript.",
      },
      {
        heading: "Degree settings still live on profile",
        body: "Programme, major and catalogue year are edited on your profile. Academic reads those settings; it does not replace the official academic statement from ANU.",
      },
    ],
  },
  {
    slug: "sign-in-and-access",
    title: "Sign in and account access",
    description: "Email sign-in, social sign-in status and signing out.",
    category: "account",
    productHref: "/profile",
    productLabel: "Open your profile",
    sections: [
      {
        heading: "Email and password",
        body: "Sign in with the email address and password you registered. Your session is kept on this device until you sign out, so you will not be asked again on every visit.",
      },
      {
        heading: "Social sign-in is not available yet",
        body: "The Google and other provider buttons are placeholders. Choosing one tells you the provider is coming soon and does not start a sign-in, so nothing is created against that account.",
      },
      {
        heading: "Sign out and shared devices",
        body: "Protected pages such as Plan and Profile redirect to sign-in once the session has ended.",
        steps: [
          "Open Profile from the bottom of the sidebar.",
          "Switch to the Account tab and choose Sign out.",
        ],
        tip: "Sign out before leaving a shared or lab computer. Closing the browser tab does not end the session.",
      },
    ],
  },
];

export type HelpContactReason = {
  id: string;
  label: string;
  description: string;
};

export const helpContactReasons: HelpContactReason[] = [
  {
    id: "problem",
    label: "Report a problem",
    description:
      "Tell us what happened, what you expected and which page you were using.",
  },
  {
    id: "data",
    label: "Correct course data",
    description:
      "Flag a course, prerequisite or requirement that looks incorrect.",
  },
  {
    id: "feature",
    label: "Request a feature",
    description: "Share the planning task you want Coursemap to make easier.",
  },
];

export const helpEmailReasons: HelpContactReason[] = [
  ...helpContactReasons,
  {
    id: "other",
    label: "Something else",
    description: "Ask a question that does not fit the options above.",
  },
];

export function helpArticleBySlug(slug: string): HelpArticle | undefined {
  return helpArticles.find((article) => article.slug === slug);
}

export function helpCategoryById(id: HelpCategoryId): HelpCategory {
  return (
    helpCategories.find((category) => category.id === id) ?? {
      id,
      label: id,
    }
  );
}

export type HelpCategoryGroup = {
  category: HelpCategory;
  articles: HelpArticle[];
};

/** Guides grouped in category order. Empty categories are omitted. */
export function groupHelpArticles(
  articles: HelpArticle[] = helpArticles,
): HelpCategoryGroup[] {
  return helpCategories
    .map((category) => ({
      category,
      articles: articles.filter((article) => article.category === category.id),
    }))
    .filter((group) => group.articles.length > 0);
}

/**
 * Case-insensitive match across title, description and section headings.
 * Every whitespace-separated term must appear somewhere in the guide.
 */
export function searchHelpArticles(query: string): HelpArticle[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return helpArticles;
  return helpArticles.filter((article) => {
    const haystack = [
      article.title,
      article.description,
      ...article.sections.map((section) => section.heading),
      ...article.sections.map((section) => section.body),
      ...article.sections.flatMap((section) => section.steps ?? []),
      ...article.sections.map((section) => section.tip ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Guides in the same category as the given one, excluding it. */
export function relatedHelpArticles(slug: string, limit = 3): HelpArticle[] {
  const article = helpArticleBySlug(slug);
  if (!article) return [];
  return helpArticles
    .filter(
      (candidate) =>
        candidate.category === article.category && candidate.slug !== slug,
    )
    .slice(0, limit);
}

export function helpSectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export type AdjacentHelpArticles = {
  previous: HelpArticle | undefined;
  next: HelpArticle | undefined;
};

export function adjacentHelpArticles(slug: string): AdjacentHelpArticles {
  const index = helpArticles.findIndex((article) => article.slug === slug);
  if (index === -1) return { previous: undefined, next: undefined };
  return {
    previous: index > 0 ? helpArticles[index - 1] : undefined,
    next: index < helpArticles.length - 1 ? helpArticles[index + 1] : undefined,
  };
}
