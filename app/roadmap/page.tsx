import { AppShell } from "@/components/shell";
import {
  RoadmapTimeline,
  type RoadmapStage,
} from "@/components/roadmap/roadmap-timeline";

/** Index of the stage in progress. The track is drawn as complete up to here. */
const currentStage = 1;

const stages: RoadmapStage[] = [
  {
    title: "Shipped",
    description: "Available in Coursemap now",
    items: [
      {
        title: "Visual degree planning",
        description:
          "Build a semester-by-semester plan and move courses as it changes.",
      },
      {
        title: "Course and prerequisite discovery",
        description: "Search courses and explore full prerequisite chains.",
      },
      {
        title: "Student workspace",
        description:
          "Home, academic history, requirements, calendar and support pages.",
      },
    ],
  },
  {
    title: "Now",
    description: "The current product focus",
    items: [
      {
        title: "Catalogue coverage",
        description:
          "Broaden degree, major and course data while keeping its source visible.",
      },
      {
        title: "Requirement accuracy",
        description:
          "Improve allocation detail and flag rules that still need review.",
      },
      {
        title: "Account administration",
        description:
          "Make access and support workflows safer for the Coursemap team.",
      },
    ],
  },
  {
    title: "Next",
    description: "Useful additions we want to explore",
    items: [
      {
        title: "Assessment calendar",
        description:
          "Bring assessments and important dates into the study calendar.",
      },
      {
        title: "Credit and exemptions",
        description:
          "Represent recognised prior learning without overstating official status.",
      },
      {
        title: "Room Finder",
        description: "Search campus spaces, facilities and accessible routes.",
      },
    ],
  },
  {
    title: "Later",
    description: "Ideas without a committed delivery date",
    items: [
      {
        title: "Compare degree options",
        description:
          "Try another major or programme without changing your saved plan.",
      },
      {
        title: "Share and export",
        description:
          "Create a clear plan summary for advisers or your own records.",
      },
      {
        title: "Planning reminders",
        description:
          "Choose useful reminders for deadlines and unresolved plan items.",
      },
    ],
  },
  {
    title: "Exploring",
    description: "Directions we are researching with students",
    items: [
      {
        title: "Degree progress insights",
        description:
          "Surface useful milestones and choices while keeping the underlying rules clear.",
      },
      {
        title: "Collaborative planning",
        description:
          "Make it easier to discuss a plan with an adviser or trusted supporter.",
      },
      {
        title: "Import your study record",
        description:
          "Explore a safe way to start from a student's existing academic history.",
      },
    ],
  },
  {
    title: "Horizon",
    description: "Longer-term possibilities for Coursemap",
    items: [
      {
        title: "Personalised pathway suggestions",
        description:
          "Offer clear options based on a student's goals, without replacing academic advice.",
      },
      {
        title: "Multi-year catalogue outlook",
        description:
          "Help plans account for changing course offerings and published catalogue versions.",
      },
      {
        title: "Mobile planning companion",
        description:
          "Keep key plan details and next steps easy to check while on campus.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <AppShell fullBleed>
      <div className="h-[calc(100dvh-3.5rem)] overflow-hidden py-3 sm:py-4">
        <RoadmapTimeline stages={stages} currentStage={currentStage} />
      </div>
    </AppShell>
  );
}
