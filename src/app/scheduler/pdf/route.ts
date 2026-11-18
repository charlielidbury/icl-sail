// POST /scheduler/pdf: the /scheduler page's generated schedule as a PDF. The
// page submits a form (target="_blank") whose `data` field is the template
// data (see src/app/scheduler/pdf.ts), and the PDF opens in the new tab.
import { renderSchedulePdf } from "@/schedule-pdf/render";
import { messageResponse, pdfResponse } from "@/schedule-pdf/response";
import { InputError, LIMITS, parseScheduleDocument } from "@/schedule-pdf/validate";

export const runtime = "nodejs";

const bad = (message: string) =>
  messageResponse(400, "Couldn't make the PDF", `${message}. Go back to the schedule generator and try again.`);

export async function POST(request: Request) {
  // Form encoding can triple the size of the JSON; refuse anything bigger.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 3 * LIMITS.bytes) return bad("The schedule is too big");

  let data: FormDataEntryValue | null;
  try {
    data = (await request.formData()).get("data");
  } catch {
    return bad("The request wasn't a form");
  }
  if (typeof data !== "string") return bad("The schedule is missing");

  let doc;
  try {
    doc = parseScheduleDocument(data);
  } catch (e) {
    if (e instanceof InputError) return bad(e.message);
    throw e;
  }

  try {
    const start = performance.now();
    const pdf = renderSchedulePdf(doc);
    return pdfResponse(pdf, doc.title, "no-store", { pdf: performance.now() - start });
  } catch (e) {
    console.error(e);
    return messageResponse(500, "Couldn't make the PDF", "Something went wrong making the PDF. Please try again.");
  }
}
