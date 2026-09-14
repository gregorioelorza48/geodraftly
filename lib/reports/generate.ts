import { format } from "date-fns";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { CATEGORY_LABELS, ISSUE_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { getFileBuffer } from "@/lib/storage";

type ReportData = Prisma.SiteVisitGetPayload<{
  include: {
    observer: true;
    project: { include: { organization: true } };
    observations: { include: { photos: true; author: true } };
    issues: { include: { assignee: true } };
    photos: true;
  };
}>;

const ink = rgb(0.11, 0.13, 0.12);
const field = rgb(0.18, 0.29, 0.24);
const brass = rgb(0.62, 0.5, 0.27);
const muted = rgb(0.4, 0.42, 0.4);
const rule = rgb(0.82, 0.8, 0.74);
const paper = rgb(0.97, 0.96, 0.93);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;

export async function generateObservationReport(visit: ReportData) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const org = visit.project.organization;
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const drawHeader = (p: PDFPage, pageNumber: number, total: number) => {
    p.drawRectangle({ x: 0, y: PAGE_H - 28, width: PAGE_W, height: 28, color: field });
    p.drawText(org.name.toUpperCase(), {
      x: MARGIN,
      y: PAGE_H - 18,
      size: 9,
      font: bold,
      color: rgb(0.96, 0.94, 0.9),
    });
    p.drawText("SITE OBSERVATION REPORT", {
      x: PAGE_W - MARGIN - 140,
      y: PAGE_H - 18,
      size: 8,
      font: regular,
      color: rgb(0.85, 0.82, 0.74),
    });
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 32, color: paper });
    p.drawLine({ start: { x: MARGIN, y: 32 }, end: { x: PAGE_W - MARGIN, y: 32 }, thickness: 0.5, color: rule });
    p.drawText(`${visit.project.number}  ·  ${visit.project.name}`, {
      x: MARGIN,
      y: 16,
      size: 8,
      font: regular,
      color: muted,
    });
    p.drawText(`Page ${pageNumber} of ${total}`, {
      x: PAGE_W - MARGIN - 70,
      y: 16,
      size: 8,
      font: regular,
      color: muted,
    });
  };

  const ensureSpace = (needed: number) => {
    if (y < MARGIN + 48 + needed) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 48;
    }
  };

  const writeWrapped = (text: string, font: PDFFont, size: number, maxWidth = PAGE_W - MARGIN * 2) => {
    const words = text.replace(/\r/g, "").split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth) {
        ensureSpace(16);
        page.drawText(line, { x: MARGIN, y, size, font, color: ink });
        y -= 14;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      ensureSpace(16);
      page.drawText(line, { x: MARGIN, y, size, font, color: ink });
      y -= 14;
    }
  };

  y = PAGE_H - 64;
  page.drawText("SITE OBSERVATION REPORT", { x: MARGIN, y, size: 18, font: bold, color: field });
  y -= 18;
  page.drawRectangle({ x: MARGIN, y: y + 8, width: 72, height: 2, color: brass });
  y -= 8;
  page.drawText(org.legalName || org.name, { x: MARGIN, y, size: 11, font: italic, color: muted });
  y -= 28;

  const meta: [string, string][] = [
    ["Project", `${visit.project.number} — ${visit.project.name}`],
    ["Client", visit.project.client],
    ["Location", [visit.project.address, visit.project.city, visit.project.state].filter(Boolean).join(", ")],
    ["Visit date", format(visit.visitedAt, "MMMM d, yyyy")],
    ["Time", format(visit.visitedAt, "h:mm a")],
    ["Observer", visit.observer.name],
    ["Weather", [visit.weather, visit.temperatureF != null ? `${visit.temperatureF}°F` : ""].filter(Boolean).join(", ") || "—"],
    ["Status", visit.status.replace("_", " ")],
  ];

  for (const [label, value] of meta) {
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: muted });
    page.drawText(value, { x: MARGIN + 92, y, size: 10, font: regular, color: ink });
    y -= 16;
  }

  y -= 10;
  page.drawText("1.  Executive summary", { x: MARGIN, y, size: 12, font: bold, color: field });
  y -= 18;
  writeWrapped(visit.notes || "No general notes were recorded for this visit.", regular, 10);
  y -= 12;

  page.drawText("2.  Observations", { x: MARGIN, y, size: 12, font: bold, color: field });
  y -= 20;

  if (visit.observations.length === 0) {
    writeWrapped("No observations were recorded.", italic, 10);
  }

  let index = 1;
  for (const obs of visit.observations) {
    ensureSpace(90);
    page.drawText(`${index}.  ${obs.title}`, { x: MARGIN, y, size: 11, font: bold, color: ink });
    y -= 14;
    page.drawText(
      `${CATEGORY_LABELS[obs.category as keyof typeof CATEGORY_LABELS] ?? obs.category}  ·  ${PRIORITY_LABELS[obs.priority as keyof typeof PRIORITY_LABELS] ?? obs.priority}  ·  ${obs.author.name}`,
      { x: MARGIN, y, size: 8, font: italic, color: muted },
    );
    y -= 14;
    if (obs.latitude != null && obs.longitude != null) {
      page.drawText(`Location  ${obs.latitude.toFixed(6)}, ${obs.longitude.toFixed(6)}`, {
        x: MARGIN,
        y,
        size: 8,
        font: regular,
        color: muted,
      });
      y -= 14;
    }
    writeWrapped(obs.description || "No description.", regular, 10);

    for (const photo of obs.photos.slice(0, 3)) {
      try {
        const bytes = await getFileBuffer(photo.fileKey);
        const image = photo.contentType.includes("png")
          ? await doc.embedPng(bytes)
          : await doc.embedJpg(bytes);
        const maxW = 240;
        const maxH = 160;
        const scale = Math.min(maxW / image.width, maxH / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ensureSpace(h + 24);
        page.drawImage(image, { x: MARGIN, y: y - h, width: w, height: h });
        y -= h + 8;
        if (photo.caption) {
          page.drawText(photo.caption, { x: MARGIN, y, size: 8, font: italic, color: muted });
          y -= 12;
        }
      } catch {
        // Photo missing from storage — skip rather than failing the report.
      }
    }
    y -= 10;
    index += 1;
  }

  ensureSpace(40);
  page.drawText("3.  Issues / punch list", { x: MARGIN, y, size: 12, font: bold, color: field });
  y -= 18;

  if (visit.issues.length === 0) {
    writeWrapped("No punch-list items were opened during this visit.", italic, 10);
  } else {
    for (const issue of visit.issues) {
      ensureSpace(28);
      page.drawText(`•  ${issue.title}`, { x: MARGIN, y, size: 10, font: bold, color: ink });
      y -= 13;
      page.drawText(
        `${PRIORITY_LABELS[issue.priority as keyof typeof PRIORITY_LABELS] ?? issue.priority}  ·  ${ISSUE_STATUS_LABELS[issue.status as keyof typeof ISSUE_STATUS_LABELS] ?? issue.status}${
          issue.assignee ? `  ·  ${issue.assignee.name}` : ""
        }${issue.dueDate ? `  ·  due ${format(issue.dueDate, "MMM d, yyyy")}` : ""}`,
        { x: MARGIN + 12, y, size: 8, font: regular, color: muted },
      );
      y -= 16;
    }
  }

  y -= 6;
  ensureSpace(40);
  page.drawText("4.  Recommendations", { x: MARGIN, y, size: 12, font: bold, color: field });
  y -= 18;
  writeWrapped(visit.recommendations || "No recommendations recorded.", regular, 10);

  y -= 20;
  ensureSpace(90);
  page.drawText("5.  Certification", { x: MARGIN, y, size: 12, font: bold, color: field });
  y -= 18;
  writeWrapped(
    "The observations in this report reflect conditions visible at the time of the site visit and do not constitute a comprehensive inspection of hidden or inaccessible work.",
    italic,
    9,
  );
  y -= 28;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 200, y }, thickness: 0.75, color: ink });
  page.drawLine({ start: { x: MARGIN + 230, y }, end: { x: MARGIN + 380, y }, thickness: 0.75, color: ink });
  y -= 14;
  page.drawText("Observer signature", { x: MARGIN, y, size: 8, font: regular, color: muted });
  page.drawText("Date", { x: MARGIN + 230, y, size: 8, font: regular, color: muted });
  y -= 20;
  page.drawText(visit.observer.name, { x: MARGIN, y, size: 10, font: italic, color: ink });

  const pages = doc.getPages();
  pages.forEach((p, i) => drawHeader(p, i + 1, pages.length));

  return Buffer.from(await doc.save());
}
