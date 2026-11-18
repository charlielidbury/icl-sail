// Shows a PDF that is still being made in the browser's own PDF viewer, in a
// new tab, where people can print or save it.
//
// Call it straight from a click handler: the tab is opened before anything is
// awaited, so popup blockers allow it, and pointed at the PDF once it's ready.
// If no tab could be opened, the PDF is downloaded instead.

export type PdfOutcome = "opened" | "downloaded" | "tab closed";

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function openPdf(
  make: () => Promise<Uint8Array>,
  filename: string,
): Promise<PdfOutcome> {
  const tab = window.open("", "_blank");
  if (tab) {
    try {
      tab.document.title = "Preparing PDF…";
      const p = tab.document.createElement("p");
      p.textContent = "Preparing PDF…";
      p.style.cssText = "font: 16px system-ui, sans-serif; color: #555; margin: 2rem;";
      tab.document.body.appendChild(p);
    } catch {
      // Not ours to write to; it will still be pointed at the PDF.
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await make();
  } catch (e) {
    tab?.close();
    throw e;
  }

  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  if (tab && !tab.closed) {
    // The tab keeps using the URL (e.g. to save the PDF), so it isn't revoked.
    tab.location.href = url;
    return "opened";
  }
  if (tab?.closed) {
    URL.revokeObjectURL(url);
    return "tab closed";
  }
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
