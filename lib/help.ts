export type HelpArticleSection = {
  heading: string;
  body: string;
};

export type HelpArticle = {
  slug: string;
  title: string;
  description: string;
  productHref: string;
  productLabel: string;
  sections: HelpArticleSection[];
};

export const helpArticles: HelpArticle[] = [
  {
    slug: "build-your-plan",
    title: "Build your plan",
    description: "Add, move and record courses across study periods.",
    productHref: "/plan",
    productLabel: "Open your plan",
    sections: [
      {
        heading: "What the plan is for",
        body: "The plan is a working view of your degree. Add courses to a study period, move them as your ideas change, and record completed or enrolled work so the rest of Coursemap can keep up.",
      },
      {
        heading: "Add and arrange courses",
        body: "Search from the plan or the course catalogue, then place a course in a study period. Drag a course to another term when the sequence changes. Keep prerequisite warnings in view as you move things around; they are a planning signal, not an enrolment decision.",
      },
      {
        heading: "Where are class times and rooms?",
        body: "Calendar currently shows your plan and catalogue study periods only. Verified timetable and room data are planned, but Coursemap does not generate class details. Use official ANU timetable sources when you need times and locations.",
      },
    ],
  },
  {
    slug: "understand-a-course",
    title: "Understand a course",
    description: "Search details, prerequisites and catalogue information.",
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
    slug: "read-requirements",
    title: "Read requirements",
    description: "Understand completed, planned and still-needed units.",
    productHref: "/requirements",
    productLabel: "Open requirements",
    sections: [
      {
        heading: "What the page shows",
        body: "Requirements groups the rules for your selected programme and major. Each group shows how many units are completed, planned or still needed, and which courses are possible matches.",
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
    slug: "account-and-degree",
    title: "Account and degree",
    description: "Update your profile, programme, major and rules year.",
    productHref: "/profile",
    productLabel: "Open your profile",
    sections: [
      {
        heading: "Keep your details in one place",
        body: "Open Profile from the bottom of the navigation. Name, student ID, programme, major and catalogue year are kept together so plan and requirements views use the same rules.",
      },
      {
        heading: "How to change your degree or catalogue year",
        body: "Edit the programme, major and rules year on your profile, then save. Changing the catalogue year updates which course and requirement data Coursemap applies to your plan.",
      },
      {
        heading: "Does Coursemap replace official academic advice?",
        body: "No. Coursemap is a planning aid. Confirm enrolment, programme rules, credit decisions and graduation eligibility with the relevant ANU service or academic adviser.",
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

export function otherHelpArticles(slug: string): HelpArticle[] {
  return helpArticles.filter((article) => article.slug !== slug);
}
