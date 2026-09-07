/**
 * Cookie written by the ReUI `SidebarProvider` whenever the rail is toggled.
 * Kept in a plain module so server components can import the literal value;
 * exports from a "use client" module arrive in server components as client
 * references rather than strings.
 */
export const SIDEBAR_STATE_COOKIE = "sidebar_state";
