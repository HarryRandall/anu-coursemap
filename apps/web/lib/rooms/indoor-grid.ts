import { INDOOR_METRES_PER_LOCAL_UNIT } from "@/lib/rooms/indoor-map";

/**
 * The metric steps a floor plan grid may snap to, from a hundred millimetres up
 * to fifty metres.
 */
const GRID_STEPS_METRES = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50] as const;

/** Below this the minor grid is too dense to read, so the next step up is used. */
const MINIMUM_MINOR_SPACING_PIXELS = 8;

/** How many minor divisions make up one major division. */
const MAJOR_EVERY = 5;

export type IndoorGridSteps = Readonly<{
  /** Minor spacing in local units. */
  minorUnits: number;
  /** Major spacing in local units. */
  majorUnits: number;
  minorMetres: number;
  /** Fades the minor grid in as it becomes legible, so steps do not pop. */
  minorOpacity: number;
}>;

const unitsPerMetre = 1 / INDOOR_METRES_PER_LOCAL_UNIT;

/**
 * Chooses grid spacing for the current zoom. The snap step follows the minor
 * step, so snapping gets finer exactly as the drawing gets bigger.
 */
export function gridStepsForScale(scale: number): IndoorGridSteps {
  const minorMetres =
    GRID_STEPS_METRES.find(
      (metres) =>
        metres * unitsPerMetre * scale >= MINIMUM_MINOR_SPACING_PIXELS,
    ) ?? GRID_STEPS_METRES.at(-1)!;

  const minorUnits = minorMetres * unitsPerMetre;
  const spacing = minorUnits * scale;
  return {
    minorUnits,
    majorUnits: minorUnits * MAJOR_EVERY,
    minorMetres,
    minorOpacity: Math.min(
      1,
      Math.max(0, (spacing - MINIMUM_MINOR_SPACING_PIXELS) / 8),
    ),
  };
}

/** Rounds a value to the nearest grid line. */
export function snapToGrid(value: number, step: number) {
  if (!Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
}
