"use client";

import { useState } from "react";
import { LoadingIndicator } from "@uui/components/application/loading-indicator/loading-indicator";
import { Button } from "@uui/components/base/buttons/button";
import {
  Skeleton,
  SkeletonCourseCard,
  SkeletonMetricCard,
  SkeletonTableRows,
  SkeletonText,
} from "@/components/design-system/coursemap/skeleton";
import { CourseCard } from "@/components/design-system/coursemap/cards";
import { courses } from "../content";
import { Example, FidelityNote, Grid, Stack, Variants } from "../section-frame";

function LoadThenReveal() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <Variants>
        <Button
          size="sm"
          color="secondary"
          onClick={() => setLoading((current) => !current)}
        >
          {loading ? "Finish loading" : "Load again"}
        </Button>
        <p className="text-sm text-tertiary">
          {loading
            ? "Skeletons match the real card geometry, so nothing shifts when the data lands."
            : "Loaded. Toggle back to compare the two states."}
        </p>
      </Variants>

      <Grid cols={3}>
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCourseCard key={index} />
            ))
          : courses
              .slice(0, 3)
              .map((course) => <CourseCard key={course.id} course={course} />)}
      </Grid>
    </div>
  );
}

export function LoadingSection() {
  return (
    <Stack>
      <Example
        title="Loading indicators"
        description="Three types across four sizes, straight from the MIT source."
      >
        <div className="flex flex-col gap-8">
          {(["line-simple", "line-spinner", "dot-circle"] as const).map(
            (type) => (
              <Variants key={type} label={type} className="gap-8">
                {(["sm", "md", "lg", "xl"] as const).map((size) => (
                  <LoadingIndicator key={size} type={type} size={size} />
                ))}
              </Variants>
            ),
          )}
        </div>
      </Example>

      <Example
        title="With a label"
        description="For a whole-panel load, where the reader needs to know what is happening."
      >
        <div className="flex justify-center rounded-lg bg-secondary py-12">
          <LoadingIndicator
            type="line-spinner"
            size="lg"
            label="Importing 1,284 courses"
          />
        </div>
      </Example>

      <FidelityNote>
        Untitled UI has no free skeleton component, so the skeletons below are
        built here from the semantic surface tokens and shaped to match the
        components they stand in for.
      </FidelityNote>

      <Example
        title="Skeleton primitives"
        description="A block and a text run. Both use the quaternary surface and a pulse."
      >
        <div className="flex flex-col gap-6">
          <Variants label="Blocks">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </Variants>
          <div className="max-w-md">
            <SkeletonText lines={4} />
          </div>
        </div>
      </Example>

      <Example
        title="Component-shaped skeletons"
        description="Sized to the real components so the layout does not jump when data arrives."
      >
        <div className="flex flex-col gap-6">
          <Grid cols={3}>
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
          </Grid>
          <SkeletonTableRows rows={4} />
        </div>
      </Example>

      <Example
        title="Loading to loaded"
        description="Toggle between the skeleton and the real cards to check that nothing shifts."
      >
        <LoadThenReveal />
      </Example>
    </Stack>
  );
}
