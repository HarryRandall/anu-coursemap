"use client";

import { Clock3, MapPin, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { CourseToken } from "@/components/ui/course-token";
import {
  formatClock,
  formatSessionTime,
  sessionKindLabel,
  WEEKDAYS,
  type ClassSession,
} from "@/lib/calendar";
import { sessionSurface } from "@/components/calendar/session-styles";

export function SessionDrawer({
  session,
  onClose,
}: {
  session: ClassSession;
  onClose: () => void;
}) {
  const surface = sessionSurface[session.accent];

  return (
    <Drawer onClose={onClose} labelledBy="session-drawer-title">
      <IconButton
        label="Close class details"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 size-11"
      >
        <X size={18} />
      </IconButton>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <div className="flex items-center gap-3 pr-12">
          <CourseToken
            code={session.courseCode}
            accent={session.accent}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium text-zinc-400">
              {session.courseCode}
            </p>
            <h2
              id="session-drawer-title"
              className="text-xl leading-tight font-bold tracking-tight text-zinc-900"
            >
              {session.courseName}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
              surface.chip,
            )}
          >
            {sessionKindLabel[session.kind]}
          </span>
          <Badge tone="neutral">Illustrative timetable</Badge>
        </div>

        <dl className="mt-5 space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200/70">
            <Clock3 size={16} className="mt-0.5 text-zinc-500" />
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                Time
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                {formatSessionTime(session)}
              </dd>
              <dd className="text-xs text-zinc-500">
                {WEEKDAYS[session.weekday]} {formatClock(session.startMinutes)}{" "}
                to {formatClock(session.startMinutes + session.durationMinutes)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200/70">
            <MapPin size={16} className="mt-0.5 text-zinc-500" />
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                Location
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                {session.location}
              </dd>
              <dd className="text-xs text-zinc-500">
                Sample room only. Confirm with ANU before travelling.
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="flex gap-2 border-t border-zinc-100 px-5 py-4">
        <ButtonLink
          href={`/courses/${session.courseCode}`}
          variant="secondary"
          size="sm"
          className="flex-1"
        >
          View course
        </ButtonLink>
        <ButtonLink href="/plan" size="sm" className="flex-1">
          Edit plan
        </ButtonLink>
      </div>
    </Drawer>
  );
}
