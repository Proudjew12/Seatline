import type { jsPDF } from "jspdf";

import { translate } from "@/shared/i18n/translate";
import type { Locale } from "@/shared/i18n/types";

export type PdfColor = [number, number, number];
export type PdfWeight = "normal" | "bold";

export const PDF_PAGE = { left: 18, right: 192, width: 174, bottom: 273 };
export const PDF_COLORS = {
  ink: [48, 58, 64] as PdfColor,
  muted: [103, 117, 124] as PdfColor,
  accent: [50, 192, 204] as PdfColor,
  line: [216, 226, 230] as PdfColor,
  soft: [244, 247, 248] as PdfColor,
};

export function cleanPdfText(value: string): string {
  return Array.from(value.replaceAll("\r\n", "\n").replaceAll("\t", " "))
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return character === "\n" || (code >= 32 && code !== 127);
    }).join("");
}

export function cleanPdfField(value: string): string {
  return cleanPdfText(value).replace(/\s+/gu, " ").trim();
}

function isRtl(value: string): boolean {
  const firstLetter = Array.from(value).find((character) => /\p{Letter}/u.test(character));
  return firstLetter !== undefined && /[\u0590-\u08ff]/u.test(firstLetter);
}

export class QuotePdfLayout {
  y = 20;

  constructor(
    readonly document: jsPDF,
    private readonly reference: string,
    private readonly logo: Uint8Array,
    readonly locale: Locale = "en",
  ) {}

  t(message: string, values?: Record<string, string | number>): string {
    return translate(this.locale, message, values);
  }

  // Coordinates describe the English document; Hebrew reflects whole blocks, never glyphs.
  private blockX(x: number, width: number): number {
    return this.locale === "he" ? PDF_PAGE.left + PDF_PAGE.right - x - width : x;
  }

  font(size: number, weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    this.document.setFont("DejaVuSans", weight);
    this.document.setFontSize(size);
    this.document.setTextColor(...color);
  }

  text(value: string, x: number, y: number, width: number, size = 9,
    weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    this.drawText(value, x, y, width, size, weight, color, this.locale === "he" ? "right" : "left");
  }

  // Amounts stay right aligned inside their reflected column and retain USD/LTR ordering.
  right(value: string, x: number, y: number, width: number, size = 9,
    weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    this.drawText(value, x, y, width, size, weight, color, "right");
  }

  end(value: string, x: number, y: number, width: number, size = 9,
    weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    this.drawText(value, x, y, width, size, weight, color, this.locale === "he" ? "left" : "right");
  }

  // The brand header has fixed physical sides in both document languages.
  headerText(value: string, x: number, y: number, width: number, size = 9,
    weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    this.drawText(value, x, y, width, size, weight, color, "right", { mirror: false });
  }

  private drawText(value: string, x: number, y: number, width: number, size: number,
    weight: PdfWeight, color: PdfColor, align: "left" | "right",
    options: { rtl?: boolean; mirror?: boolean } = {}): void {
    const text = cleanPdfText(value);
    this.font(size, weight, color);
    const textWidth = this.document.getTextWidth(text);
    if (textWidth > width) this.document.setFontSize(size * width / textWidth);
    // Content direction controls bidi only. A Hebrew customer in an English quote still
    // begins at the left edge of the customer block; mixed English/numbers are not reversed.
    const start = options.mirror === false ? x : this.blockX(x, width);
    this.document.text(text, start + (align === "right" ? width : 0), y, {
      align,
      isInputVisual: false, isOutputVisual: true, isInputRtl: options.rtl ?? isRtl(text), isOutputRtl: false,
      isSymmetricSwapping: true,
    });
  }

  wrap(value: string, width = PDF_PAGE.width, size = 9, weight: PdfWeight = "normal"): string[] {
    this.font(size, weight);
    const result: unknown = this.document.splitTextToSize(cleanPdfText(value), width);
    if (!Array.isArray(result) || !result.every((line): line is string => typeof line === "string")) {
      throw new Error("The PDF text could not be prepared. Please try again.");
    }
    return result;
  }

  logoAt(x: number, y: number, width: number): void {
    this.document.addImage(this.logo, "PNG", x, y, width, width * 300 / 800, "logi-logo", "FAST");
  }

  rule(y = this.y, x = PDF_PAGE.left, width = PDF_PAGE.width, accent = false): void {
    this.document.setDrawColor(...(accent ? PDF_COLORS.accent : PDF_COLORS.line));
    this.document.setLineWidth(accent ? 0.55 : 0.2);
    const start = this.blockX(x, width);
    this.document.line(start, y, start + width, y);
  }

  fill(x: number, y: number, width: number, height: number, color = PDF_COLORS.soft): void {
    this.document.setFillColor(...color);
    this.document.rect(this.blockX(x, width), y, width, height, "F");
  }

  ensureSpace(height: number): boolean {
    if (this.y + height <= PDF_PAGE.bottom) return false;
    this.document.addPage();
    this.logoAt(PDF_PAGE.left - 0.5, 12, 34);
    const references = this.wrap(this.reference, 85, 7.5);
    references.forEach((line, index) => this.headerText(line, 107, 19 + index * 4, 85, 7.5, "normal", PDF_COLORS.muted));
    this.y = Math.max(32, 25 + references.length * 4);
    this.rule(this.y - 4);
    return true;
  }

  paragraph(value: string, size = 9, color = PDF_COLORS.ink): void {
    const height = size * 0.3528 * 1.4;
    for (const paragraph of cleanPdfText(value).split("\n")) {
      const rtl = isRtl(paragraph);
      for (const line of this.wrap(paragraph, PDF_PAGE.width, size)) {
        this.ensureSpace(height);
        // Wrapping beside an English name must not change the paragraph's bidi base.
        this.drawText(line, PDF_PAGE.left, this.y, PDF_PAGE.width, size, "normal", color,
          this.locale === "he" ? "right" : "left", { rtl });
        this.y += height;
      }
    }
  }

  label(value: string): void {
    this.ensureSpace(11);
    this.text(this.t(value).toUpperCase(), PDF_PAGE.left, this.y, PDF_PAGE.width, 7.5, "bold", PDF_COLORS.muted);
    this.y += 5;
  }

  finish(): void {
    const count = this.document.getNumberOfPages();
    for (let page = 1; page <= count; page += 1) {
      this.document.setPage(page);
      this.rule(282);
      this.text("Logi", PDF_PAGE.left, 288, 12, 8, "bold");
      this.text("www.logi-ltd.co.il", 33, 288, 70, 7.5, "normal", PDF_COLORS.muted);
      this.end(this.t("Page {page} of {count}", { page, count }), 147, 288, 45, 7.5, "normal", PDF_COLORS.muted);
    }
  }
}
