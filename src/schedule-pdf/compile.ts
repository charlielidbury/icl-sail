// Compiles the printable schedule (scripts/schedule.typ) to a PDF in the
// browser with typst.ts, the Typst compiler built for WebAssembly, using the
// same Geist font as the command line (scripts/schedule-pdf.ts).
//
// The compiler is big (about 7-11 MB compressed, then cached), so import this
// module dynamically, when a PDF is actually wanted:
//   const { compileSchedulePdf } = await import("@/schedule-pdf/compile");
import {
  CompileFormatEnum,
  createTypstCompiler,
  type TypstCompiler,
} from "@myriaddreamin/typst.ts/compiler";
import { loadFonts } from "@myriaddreamin/typst.ts/dist/esm/options.init.mjs";
import type { ScheduleDocument } from "./document";

// Served by the bundler with hashed, cacheable URLs.
const COMPILER_WASM = new URL(
  "../../node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
  import.meta.url,
);
const TEMPLATE = new URL("../../scripts/schedule.typ", import.meta.url);
// Geist (SIL Open Font License), in the weights the template uses.
const FONTS = [
  new URL("../../node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf", import.meta.url),
  new URL("../../node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf", import.meta.url),
  new URL("../../node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf", import.meta.url),
  new URL("../../node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf", import.meta.url),
];

const MAIN = "/schedule.typ";

async function fetchOk(url: URL) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url.pathname} (${res.status})`);
  return res;
}

let compiler: Promise<TypstCompiler> | null = null;

/** The compiler, loaded once and kept for later PDFs. */
function getCompiler(): Promise<TypstCompiler> {
  compiler ??= (async () => {
    const [template, ...fonts] = await Promise.all([
      fetchOk(TEMPLATE).then((r) => r.text()),
      ...FONTS.map((u) => fetchOk(u).then(async (r) => new Uint8Array(await r.arrayBuffer()))),
    ]);
    const cc = createTypstCompiler();
    await cc.init({
      getModule: () => fetchOk(COMPILER_WASM),
      // Only Geist: no default fonts fetched from a CDN.
      beforeBuild: [loadFonts(fonts, { assets: false })],
    });
    cc.addSource(MAIN, template);
    return cc;
  })();
  // Let a failed load (e.g. offline) be retried on the next click.
  compiler.catch(() => (compiler = null));
  return compiler;
}

type Diagnostic = { message?: string; path?: string; range?: string; severity?: string };

/** Compiles a schedule to PDF bytes. Rejects with Typst's errors if it fails. */
export async function compileSchedulePdf(doc: ScheduleDocument): Promise<Uint8Array> {
  const cc = await getCompiler();
  const { result, diagnostics } = await cc.compile({
    mainFilePath: MAIN,
    format: CompileFormatEnum.pdf,
    inputs: { data: JSON.stringify(doc) },
    diagnostics: "full",
  });
  if (!result) {
    const errors = ((diagnostics ?? []) as Diagnostic[])
      .filter((d) => d.severity !== "warning")
      .map((d) => d.message ?? String(d));
    throw new Error(errors.join("\n") || "Typst couldn't compile the schedule.");
  }
  return result;
}
