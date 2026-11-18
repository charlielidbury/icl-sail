// Competitions and the hostnames that serve them.
//
// Every competition is served at <id>.isail.site (a wildcard domain on
// Vercel). A competition can also have custom domains, which work alongside
// its isail.site address. There is no default competition: on isail.site
// itself, www, an unknown subdomain or plain localhost, the visitor is asked
// to pick a competition (the landing page).
//
// This is a plain module, not "use client", so server components (page.tsx
// files, page titles) can use it as well as the client.

export type CompetitionId =
  | "topgun"
  | "icicle"
  | "bathrobe"
  | "badger"
  | "icicle2026"
  | "sixpack";

export type CompetitionBasic = {
  id: CompetitionId;
  accentColour: string;
  logo: string;
  name: string;
};

/** In the order they were held, oldest first. */
export const allCompetitions: Record<CompetitionId, CompetitionBasic> = {
  topgun: {
    id: "topgun",
    accentColour: "#004a79",
    logo: "/topgun/logo.png",
    name: "Oxford Top Gun",
  },
  icicle: {
    id: "icicle",
    accentColour: "#004a79",
    logo: "/icicle/logo_transparent.png",
    name: "Imperial Icicle 2025",
  },
  bathrobe: {
    id: "bathrobe",
    accentColour: "#004a79",
    logo: "/bathrobe/logo.png",
    name: "Bath Robe",
  },
  badger: {
    id: "badger",
    accentColour: "#004a79",
    logo: "/badger/small-logo.jpg",
    name: "Badger",
  },
  icicle2026: {
    id: "icicle2026",
    accentColour: "#004a79",
    logo: "/icicle/logo_transparent.png",
    name: "Imperial Icicle 2026",
  },
  sixpack: {
    id: "sixpack",
    accentColour: "#542079",
    logo: "/sixpack/logo_transparent.png",
    name: "Sixpack",
  },
};

export const ISAIL_DOMAIN = "isail.site";

/**
 * Domains bought for a competition, served as well as <id>.isail.site. Each
 * must also be added to the Vercel project and pointed at it in DNS.
 */
const customDomains: Record<string, CompetitionId> = {
  "imperialicicle.com": "icicle2026",
  "badger.brunelsailing.co.uk": "badger",
};

/**
 * On hosts that can't name a competition, such as Vercel preview URLs, the
 * competition someone picked is remembered in this cookie instead.
 */
export const COMPETITION_COOKIE = "competition";

/**
 * Hosts that name competitions by address: isail.site and its subdomains,
 * localhost and *.localhost, and custom domains. Anything else (e.g. a
 * Vercel preview URL) uses COMPETITION_COOKIE.
 */
function namesCompetitions(host: string): boolean {
  return (
    host === ISAIL_DOMAIN ||
    host.endsWith(`.${ISAIL_DOMAIN}`) ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    Object.hasOwn(customDomains, host)
  );
}

/**
 * Link to `path` on a competition's site, from a page served at `fromHost`
 * (the Host header, port included): http://<id>.localhost:<port> when
 * developing locally, otherwise https://<id>.isail.site. Null on hosts that
 * can't name a competition: there, set COMPETITION_COOKIE and stay put.
 */
export function competitionUrl(
  competition: CompetitionBasic,
  fromHost: string | undefined,
  path = "/",
): string | null {
  const [name, port] = (fromHost ?? "").toLowerCase().split(":");
  if (name === "localhost" || name.endsWith(".localhost")) {
    return `http://${competition.id}.localhost${port ? `:${port}` : ""}${path}`;
  }
  if (namesCompetitions(normalise(name))) {
    return `https://${competition.id}.${ISAIL_DOMAIN}${path}`;
  }
  return null;
}

function normalise(hostname: string | undefined): string {
  return (hostname ?? "")
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/**
 * The first label of <label>.isail.site, or of <label>.localhost so that
 * http://sixpack.localhost:3000 works in development (Chromium resolves
 * *.localhost to this machine).
 */
function subdomain(host: string): string | null {
  for (const base of [ISAIL_DOMAIN, "localhost"]) {
    if (host.endsWith(`.${base}`)) {
      return host.slice(0, -(base.length + 1));
    }
  }
  return null;
}

/** The competition a hostname serves, or null if it doesn't name one. */
export function competitionForHost(
  hostname: string | undefined,
): CompetitionBasic | null {
  const host = normalise(hostname);
  const custom = customDomains[host];
  if (custom) {
    return allCompetitions[custom];
  }
  const sub = subdomain(host);
  return sub !== null && Object.hasOwn(allCompetitions, sub)
    ? allCompetitions[sub as CompetitionId]
    : null;
}

/**
 * The competition a request is for: named by its host, or on hosts that can't
 * name one, picked earlier and remembered in COMPETITION_COOKIE. Null means
 * no competition was specified, so the visitor is asked to pick one.
 */
export function competitionForRequest(
  hostname: string | undefined,
  cookie: string | undefined,
): CompetitionBasic | null {
  const fromHost = competitionForHost(hostname);
  if (fromHost !== null || namesCompetitions(normalise(hostname))) {
    return fromHost;
  }
  return cookie !== undefined && Object.hasOwn(allCompetitions, cookie)
    ? allCompetitions[cookie as CompetitionId]
    : null;
}
