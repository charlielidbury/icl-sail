// Hosts whose home route shows the iSail landing page instead of a
// competition. Kept out of src/shared.tsx ("use client") so server
// components such as page.tsx and layout.tsx can call it.
const landingHosts = new Set(["isail.site", "www.isail.site"]);

export function isLandingHost(hostname: string | undefined): boolean {
  if (hostname === undefined) return false;
  if (landingHosts.has(hostname)) return true;
  // Chromium resolves *.localhost to 127.0.0.1, so in development
  // http://isail.localhost:<port>/ previews the landing page.
  return (
    process.env.NODE_ENV === "development" && hostname === "isail.localhost"
  );
}
