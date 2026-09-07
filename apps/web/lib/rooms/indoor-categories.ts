/**
 * What a space is used for.
 *
 * A category is the fine-grained thing an author picks; the coarse `kind` the
 * rest of the model keys on (room, corridor and so on) is derived from it, so
 * legacy documents that only carry a kind keep working and routing never has
 * to know about lecture theatres. Nothing here touches the DOM.
 */
export type IndoorSpaceKind =
  "room" | "corridor" | "open-area" | "service" | "void";

export type IndoorSpaceCategory =
  | "lecture-theatre"
  | "tutorial-room"
  | "computer-lab"
  | "laboratory"
  | "office"
  | "meeting-room"
  | "study-space"
  | "kitchen"
  | "toilets"
  | "plant"
  | "misc"
  | "corridor"
  | "foyer"
  | "stairwell"
  | "lift-shaft"
  | "ramp"
  | "void";

export type IndoorAccessLevel = "public" | "card" | "staff" | "restricted";

export type IndoorCategoryDefinition = Readonly<{
  category: IndoorSpaceCategory;
  label: string;
  kind: IndoorSpaceKind;
  /** Rooms are destinations; circulation is what routes walk through. */
  group: "room" | "circulation";
  /** Whether a route may cross this space on the way somewhere else. */
  walkable: boolean;
  /** Whether a fresh space of this category is searchable by default. */
  searchable: boolean;
}>;

export const INDOOR_CATEGORY_DEFINITIONS: readonly IndoorCategoryDefinition[] =
  [
    {
      category: "lecture-theatre",
      label: "Lecture theatre",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "tutorial-room",
      label: "Tutorial or seminar room",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "computer-lab",
      label: "Computer lab",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "laboratory",
      label: "Laboratory",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "office",
      label: "Office",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "meeting-room",
      label: "Meeting room",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "study-space",
      label: "Study or common space",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "kitchen",
      label: "Kitchen",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: false,
    },
    {
      category: "toilets",
      label: "Toilets",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "plant",
      label: "Storage or plant",
      kind: "service",
      group: "room",
      walkable: false,
      searchable: false,
    },
    {
      category: "misc",
      label: "Other room",
      kind: "room",
      group: "room",
      walkable: false,
      searchable: true,
    },
    {
      category: "corridor",
      label: "Corridor",
      kind: "corridor",
      group: "circulation",
      walkable: true,
      searchable: false,
    },
    {
      category: "foyer",
      label: "Foyer or open area",
      kind: "open-area",
      group: "circulation",
      walkable: true,
      searchable: false,
    },
    {
      category: "stairwell",
      label: "Stairwell",
      kind: "service",
      group: "circulation",
      walkable: true,
      searchable: false,
    },
    {
      category: "lift-shaft",
      label: "Lift shaft",
      kind: "service",
      group: "circulation",
      walkable: true,
      searchable: false,
    },
    {
      category: "ramp",
      label: "Ramp",
      kind: "corridor",
      group: "circulation",
      walkable: true,
      searchable: false,
    },
    {
      category: "void",
      label: "Void (open to below)",
      kind: "void",
      group: "circulation",
      walkable: false,
      searchable: false,
    },
  ];

export const INDOOR_SPACE_CATEGORIES: readonly IndoorSpaceCategory[] =
  INDOOR_CATEGORY_DEFINITIONS.map((definition) => definition.category);

export const INDOOR_ACCESS_LEVELS: readonly IndoorAccessLevel[] = [
  "public",
  "card",
  "staff",
  "restricted",
];

const definitionsByCategory = new Map(
  INDOOR_CATEGORY_DEFINITIONS.map((definition) => [
    definition.category,
    definition,
  ]),
);

export function indoorCategoryDefinition(
  category: IndoorSpaceCategory,
): IndoorCategoryDefinition {
  const definition = definitionsByCategory.get(category);
  if (!definition) {
    throw new RangeError(`Unknown indoor space category '${category}'.`);
  }
  return definition;
}

export function isIndoorSpaceCategory(
  value: unknown,
): value is IndoorSpaceCategory {
  return (
    typeof value === "string" &&
    definitionsByCategory.has(value as IndoorSpaceCategory)
  );
}

/** The coarse kind a category collapses to. */
export function indoorKindForCategory(
  category: IndoorSpaceCategory,
): IndoorSpaceKind {
  return indoorCategoryDefinition(category).kind;
}

export function indoorCategoryLabel(category: IndoorSpaceCategory) {
  return indoorCategoryDefinition(category).label;
}

/**
 * Whether a route may pass through a space. Categorised spaces answer from
 * their definition; legacy spaces fall back to the coarse kind, where
 * corridors and open areas have always been the walkable ones.
 */
export function isIndoorSpaceWalkable(
  space: Readonly<{ kind: IndoorSpaceKind; category?: IndoorSpaceCategory }>,
) {
  if (space.category) return indoorCategoryDefinition(space.category).walkable;
  return space.kind === "corridor" || space.kind === "open-area";
}

/** The category a connector placed inside a face implies for that face. */
export function indoorCategoryForConnector(
  kind: "stairs" | "lift" | "escalator" | "ramp",
): IndoorSpaceCategory {
  if (kind === "lift") return "lift-shaft";
  if (kind === "ramp") return "ramp";
  return "stairwell";
}
