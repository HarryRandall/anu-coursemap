import {
  Award,
  BookOpen,
  CalendarDays,
  CalendarRange,
  GitCompareArrows,
  GraduationCap,
  House,
  Import,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Map,
  MapPin,
  MapPinned,
  RefreshCw,
  Route,
  Shield,
  Tag,
  Target,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon per route segment, shared by the sidebar, the breadcrumbs and any
 * page that refers to another part of the product. Keeping this in one place
 * is what stops the breadcrumb drifting away from the sidebar entry.
 */
export const routeIcons = {
  dashboard: House,
  plan: Map,
  courses: BookOpen,
  requirements: ListChecks,
  academic: GraduationCap,
  calendar: CalendarDays,
  "key-dates": CalendarRange,
  roadmap: Route,
  rooms: MapPin,
  help: LifeBuoy,
  profile: UserRound,
  admin: Shield,
  "admin-dashboard": LayoutDashboard,
  "admin-rooms": MapPinned,
  programmes: GraduationCap,
  majors: Award,
  minors: Tag,
  specialisations: Target,
  users: UsersRound,
  roles: KeyRound,
  imports: Import,
  sync: RefreshCw,
  changes: GitCompareArrows,
  timetable: CalendarDays,
} satisfies Record<string, LucideIcon>;

export type RouteIconKey = keyof typeof routeIcons;
