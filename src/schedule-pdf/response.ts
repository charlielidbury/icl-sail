// HTTP responses for the schedule PDF routes.

/** "Test Regatta 2026" -> "test-regatta-2026". */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * A PDF the browser shows in its own viewer, saved as `<name>.pdf`. `timings`
 * (in ms) go in a Server-Timing header, visible in the browser's dev tools.
 */
export function pdfResponse(
  pdf: Uint8Array,
  name: string,
  cacheControl: string,
  timings: Record<string, number> = {},
) {
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug(name) || "schedule"}.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": cacheControl,
      "Server-Timing": Object.entries(timings)
        .map(([k, ms]) => `${k};dur=${ms.toFixed(1)}`)
        .join(", "),
    },
  });
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A small page explaining why there's no PDF; it opens in the PDF's tab. */
export function messageResponse(status: number, title: string, message: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title></head>
<body style="font: 16px/1.5 system-ui, sans-serif; color: #222; max-width: 36rem; margin: 3rem auto; padding: 0 1rem">
<h1 style="font-size: 1.3rem">${escape(title)}</h1>
<p>${escape(message)}</p>
</body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    },
  );
}
