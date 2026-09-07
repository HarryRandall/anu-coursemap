const LIGHT_ROUTE_PREFIXES = ["/", "/login", "/signup", "/auth"] as const;

export function forceLightTheme(pathname: string, authenticated: boolean) {
  return (
    !authenticated ||
    LIGHT_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export function themeInitialisationScript(authenticated: boolean) {
  return `(() => {
    const lightRoutes = ${JSON.stringify(LIGHT_ROUTE_PREFIXES)};
    const forceLight = ${!authenticated} || lightRoutes.some(prefix => location.pathname === prefix || location.pathname.startsWith(prefix + "/"));
    let theme = "system";
    try { theme = localStorage.getItem("coursemap.theme") || "system"; } catch {}
    const dark = !forceLight && (theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches));
    const root = document.documentElement;
    root.classList.remove("light", "dark-mode");
    root.classList.add(dark ? "dark-mode" : "light");
    root.style.colorScheme = dark ? "dark" : "light";
  })();`;
}
