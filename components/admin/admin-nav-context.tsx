"use client";

import { createContext, useContext, type ReactNode } from "react";

type AdminNavValue = {
  /** Catalogue changes still awaiting review, shown on the Changes nav item. */
  openChangeCount: number;
};

const AdminNavContext = createContext<AdminNavValue>({ openChangeCount: 0 });

/**
 * The admin layout resolves the count once per request and hands it down.
 * The sidebar is a client component several levels below, and fetching from
 * there would mean a second round trip on every admin navigation.
 */
export function AdminNavProvider({
  children,
  openChangeCount,
}: {
  children: ReactNode;
  openChangeCount: number;
}) {
  return (
    <AdminNavContext.Provider value={{ openChangeCount }}>
      {children}
    </AdminNavContext.Provider>
  );
}

/** Returns zero outside the admin layout, which is what student pages want. */
export function useAdminNav() {
  return useContext(AdminNavContext);
}
