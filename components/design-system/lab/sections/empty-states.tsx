"use client";

import { SearchLg, UploadCloud02, Users01 } from "@untitledui/icons";
import { EmptyState } from "@uui/components/application/empty-state/empty-state";
import { Button } from "@uui/components/base/buttons/button";
import { Example, Stack } from "../section-frame";

export function EmptyStatesSection() {
  return (
    <Stack>
      <Example
        title="No search results"
        description="The state a filtered catalogue reaches. The action clears the filter rather than restating it."
      >
        <EmptyState size="sm" className="relative isolate overflow-hidden py-4">
          <EmptyState.Header pattern="circle">
            <EmptyState.FeaturedIcon color="gray" icon={SearchLg} />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>No courses found</EmptyState.Title>
            <EmptyState.Description>
              No 2026 course matches &ldquo;quantum origami&rdquo; in the
              College of Science. Try a broader search or clear the college
              filter.
            </EmptyState.Description>
          </EmptyState.Content>
          <EmptyState.Footer>
            <Button color="secondary">Clear filters</Button>
            <Button>Browse all courses</Button>
          </EmptyState.Footer>
        </EmptyState>
      </Example>

      <Example
        title="Nothing imported yet"
        description="A first-run state with a primary action."
      >
        <EmptyState size="md" className="relative isolate overflow-hidden py-4">
          <EmptyState.Header pattern="grid">
            <EmptyState.FeaturedIcon color="brand" icon={UploadCloud02} />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>No catalogue for 2027</EmptyState.Title>
            <EmptyState.Description>
              Import the 2027 handbook to start planning next year. The 2026
              catalogue stays available while the import runs.
            </EmptyState.Description>
          </EmptyState.Content>
          <EmptyState.Footer>
            <Button color="secondary">Read the import guide</Button>
            <Button iconLeading={UploadCloud02}>Import 2027 catalogue</Button>
          </EmptyState.Footer>
        </EmptyState>
      </Example>

      <Example
        title="No permission"
        description="A dead end that still tells the reader what to do next."
      >
        <EmptyState size="sm" className="relative isolate overflow-hidden py-4">
          <EmptyState.Header pattern="circle">
            <EmptyState.FeaturedIcon color="warning" icon={Users01} />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>Adviser access required</EmptyState.Title>
            <EmptyState.Description>
              Approval queues are visible to staff with the adviser role. Ask
              your college administrator to grant it.
            </EmptyState.Description>
          </EmptyState.Content>
          <EmptyState.Footer>
            <Button color="secondary">Back to my plan</Button>
          </EmptyState.Footer>
        </EmptyState>
      </Example>

      <Example
        title="With a file type icon"
        description="For an empty upload or export list."
      >
        <EmptyState size="sm" className="relative isolate overflow-hidden py-4">
          <EmptyState.Header pattern="circle">
            <EmptyState.FileTypeIcon type="pdf" />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>No transcripts uploaded</EmptyState.Title>
            <EmptyState.Description>
              Upload an official transcript and Coursemap will match your
              completed courses automatically.
            </EmptyState.Description>
          </EmptyState.Content>
          <EmptyState.Footer>
            <Button iconLeading={UploadCloud02}>Upload a transcript</Button>
          </EmptyState.Footer>
        </EmptyState>
      </Example>
    </Stack>
  );
}
