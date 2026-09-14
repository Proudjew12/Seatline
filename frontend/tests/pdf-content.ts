import { inflateSync } from "node:zlib";

import { expect } from "@playwright/test";

export interface PdfText {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  font: string;
  page: number;
}

export interface PdfLogo {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface PdfContent {
  text: PdfText[];
  logos: PdfLogo[];
}

// Decode the actual embedded Unicode glyphs and page coordinates with Node's built-in
// zlib. This keeps PDF assertions portable without a system PDF reader or test dependency.
export function readPdfContent(pdf: Buffer): PdfContent {
  const objects = new Map<number, string>();
  for (const match of pdf.toString("latin1").matchAll(/(\d+) 0 obj\s*([\s\S]*?)\s*endobj/g)) {
    objects.set(Number(match[1]), match[2]);
  }
  const stream = (id: number): string => {
    const object = objects.get(id) ?? "";
    const start = object.indexOf("stream\n") + 7;
    const length = Number(object.match(/\/Length\s+(\d+)/)?.[1]);
    expect(start).toBeGreaterThan(6);
    expect(length).toBeGreaterThan(0);
    const data = Buffer.from(object.slice(start, start + length), "latin1");
    return (/\/FlateDecode/.test(object) ? inflateSync(data) : data).toString("latin1");
  };
  const fonts = new Map<string, Map<string, string>>();
  const fontWidths = new Map<string, Map<number, number>>();
  for (const object of objects.values()) {
    for (const font of object.matchAll(/\/(F\d+) (\d+) 0 R/g)) {
      const fontObject = objects.get(Number(font[2]));
      const unicodeId = fontObject?.match(/\/ToUnicode (\d+) 0 R/)?.[1];
      if (!unicodeId) continue;
      const descendantId = Number(fontObject?.match(/\/DescendantFonts\s*\[(\d+) 0 R\]/)?.[1]);
      const widthData = objects.get(descendantId)?.match(/\/W\s*\[([\s\S]*?)\]\s*\/CIDToGIDMap/)?.[1] ?? "";
      const widths = new Map<number, number>();
      for (const group of widthData.matchAll(/(\d+)\s*\[([\d.\s]+)\]/g)) {
        group[2].trim().split(/\s+/).forEach((width, index) => widths.set(Number(group[1]) + index, Number(width)));
      }
      fontWidths.set(font[1], widths);
      const glyphs = new Map<string, string>();
      for (const block of stream(Number(unicodeId)).matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const pair of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>/gi)) {
          const unicode = pair[2].match(/.{4}/g) ?? [];
          glyphs.set(pair[1].toLowerCase(), unicode.map((code) => String.fromCharCode(Number.parseInt(code, 16))).join(""));
        }
      }
      fonts.set(font[1], glyphs);
    }
  }
  const texts: PdfText[] = [];
  const logos: PdfLogo[] = [];
  let page = 0;
  for (const object of objects.values()) {
    if (!/\/Type \/Page\b/.test(object)) continue;
    page += 1;
    const contentId = Number(object.match(/\/Contents (\d+) 0 R/)?.[1]);
    const content = stream(contentId);
    for (const image of content.matchAll(/([\d.-]+) 0 0 ([\d.-]+) ([\d.-]+) ([\d.-]+) cm\s*\/I\d+ Do/g)) {
      logos.push({ width: Number(image[1]), height: Number(image[2]), x: Number(image[3]), y: Number(image[4]), page });
    }
    for (const block of content.matchAll(/BT\s*([\s\S]*?)\s*ET/g)) {
      const fontInfo = block[1].match(/\/(F\d+) ([\d.]+) Tf/);
      const font = fontInfo?.[1] ?? "";
      const position = block[1].match(/([\d.-]+) ([\d.-]+) Td/);
      const encoded = block[1].match(/<([\da-f]+)> Tj/i)?.[1];
      if (!encoded || !position) continue;
      const glyphs = encoded.match(/.{4}/g) ?? [];
      const text = glyphs.map((glyph) => fonts.get(font)?.get(glyph.toLowerCase()) ?? "�").join("");
      const fontSize = Number(fontInfo?.[2]);
      const width = glyphs.reduce((sum, glyph) => sum + (fontWidths.get(font)?.get(Number.parseInt(glyph, 16)) ?? Number.NaN), 0) * fontSize / 1000;
      expect(Number.isFinite(width), `Embedded font contains widths for ${text}`).toBe(true);
      texts.push({ text, x: Number(position[1]), y: Number(position[2]), width, fontSize, font, page });
    }
  }
  expect(texts.length).toBeGreaterThan(20);
  expect(texts.map((item) => item.text).join("\n")).not.toContain("�");
  return { text: texts, logos };
}

