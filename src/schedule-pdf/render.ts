// Renders the printable schedule (scripts/schedule.typ) to PDF on the server,
// with typst.ts's native Node compiler and the Geist font in ./fonts. Used by
// the /schedule.pdf and /scheduler/pdf routes. Server only.
//
// The template and fonts are read from disk at run time, so next.config.ts
// lists them in outputFileTracingIncludes for those routes, and the compiler
// is in serverExternalPackages (it's a native addon).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import type { ScheduleDocument } from "./document";

// Literal paths, so the build's file tracing ships just these files.
const read = () => ({
  template: readFileSync(join(process.cwd(), "scripts/schedule.typ"), "utf8"),
  fonts: [
    readFileSync(join(process.cwd(), "src/schedule-pdf/fonts/Geist-Regular.ttf")),
    readFileSync(join(process.cwd(), "src/schedule-pdf/fonts/Geist-Medium.ttf")),
    readFileSync(join(process.cwd(), "src/schedule-pdf/fonts/Geist-SemiBold.ttf")),
    readFileSync(join(process.cwd(), "src/schedule-pdf/fonts/Geist-Bold.ttf")),
  ],
});

// Made once per server instance and reused: later PDFs take a few ms.
let loaded: { compiler: NodeCompiler; template: string } | null = null;

function load() {
  if (!loaded) {
    const { template, fonts } = read();
    loaded = {
      template,
      // Only Geist, so the PDF looks the same on every machine.
      compiler: NodeCompiler.create({ fontArgs: [{ fontBlobs: fonts }] }),
    };
  }
  return loaded;
}

/** The schedule as PDF bytes. Throws with Typst's messages if it can't. */
export function renderSchedulePdf(doc: ScheduleDocument): Uint8Array {
  const { compiler, template } = load();
  const res = compiler.compile({
    mainFileContent: template,
    inputs: { data: JSON.stringify(doc) },
  });
  const error = res.takeError();
  if (error || !res.result) {
    const messages = (error?.shortDiagnostics ?? []).map(
      (d: { message?: string }) => d.message ?? String(d),
    );
    throw new Error(`Typst couldn't render the schedule: ${messages.join("; ") || "unknown error"}`);
  }
  const pdf = compiler.pdf(res.result);
  // Drop cached layout from older documents so memory doesn't grow.
  compiler.evictCache(10);
  return new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
}
