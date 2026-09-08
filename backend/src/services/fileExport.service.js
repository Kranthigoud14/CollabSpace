import PDFDocument from "pdfkit";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";

/**
 * Strips HTML tags and unescapes common HTML entities to return clean text.
 */
export const htmlToPlainText = (html = "") => {
  if (!html || typeof html !== "string") return "";

  let text = html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'");

  // Normalize excessive newlines
  return text.replace(/\n{3,}/g, "\n\n").trim();
};

/**
 * Parses basic HTML tags into structured blocks for PDF/DOCX generation
 */
const parseHtmlBlocks = (html = "") => {
  if (!html || typeof html !== "string") return [];

  // If pure plain text without tags
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((text) => ({ type: "paragraph", text }));
  }

  const blocks = [];
  const tagRegex = /<(h[1-3]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let hasMatches = false;

  while ((match = tagRegex.exec(html)) !== null) {
    hasMatches = true;
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];
    const text = htmlToPlainText(innerHtml);

    if (text) {
      if (tag === "h1") blocks.push({ type: "h1", text });
      else if (tag === "h2") blocks.push({ type: "h2", text });
      else if (tag === "h3") blocks.push({ type: "h3", text });
      else if (tag === "li") blocks.push({ type: "bullet", text });
      else blocks.push({ type: "paragraph", text });
    }
  }

  if (!hasMatches) {
    const fallbackText = htmlToPlainText(html);
    if (fallbackText) {
      blocks.push({ type: "paragraph", text: fallbackText });
    }
  }

  return blocks;
};

/**
 * Generate PDF buffer using PDFKit
 */
export const generatePDF = (title = "Document", content = "") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: title,
          Author: "CollabSpace",
          Creator: "CollabSpace Editor",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Title header
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#1e293b")
        .text(title, { align: "left" });

      doc.moveDown(0.5);

      // Accent divider line
      doc
        .strokeColor("#6366f1")
        .lineWidth(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(1);

      const blocks = parseHtmlBlocks(content);

      if (blocks.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#64748b")
          .text("This document is currently empty.", { lineGap: 4 });
      } else {
        for (const block of blocks) {
          switch (block.type) {
            case "h1":
              doc
                .font("Helvetica-Bold")
                .fontSize(16)
                .fillColor("#0f172a")
                .moveDown(0.6)
                .text(block.text, { lineGap: 3 });
              doc.moveDown(0.3);
              break;

            case "h2":
              doc
                .font("Helvetica-Bold")
                .fontSize(14)
                .fillColor("#1e293b")
                .moveDown(0.5)
                .text(block.text, { lineGap: 3 });
              doc.moveDown(0.2);
              break;

            case "h3":
              doc
                .font("Helvetica-Bold")
                .fontSize(12)
                .fillColor("#334155")
                .moveDown(0.4)
                .text(block.text, { lineGap: 2 });
              doc.moveDown(0.2);
              break;

            case "bullet":
              doc
                .font("Helvetica")
                .fontSize(10.5)
                .fillColor("#334155")
                .text(`•  ${block.text}`, {
                  indent: 12,
                  lineGap: 4,
                  align: "left",
                });
              doc.moveDown(0.2);
              break;

            case "paragraph":
            default:
              doc
                .font("Helvetica")
                .fontSize(10.5)
                .fillColor("#334155")
                .text(block.text, {
                  lineGap: 4,
                  align: "left",
                });
              doc.moveDown(0.5);
              break;
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate DOCX buffer using docx library
 */
export const generateDOCX = async (title = "Document", content = "") => {
  const blocks = parseHtmlBlocks(content);
  const docxParagraphs = [];

  // Title paragraph
  docxParagraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  if (blocks.length === 0) {
    docxParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "This document is currently empty.",
            italics: true,
            color: "64748b",
          }),
        ],
      })
    );
  } else {
    for (const block of blocks) {
      switch (block.type) {
        case "h1":
          docxParagraphs.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
          break;

        case "h2":
          docxParagraphs.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
          break;

        case "h3":
          docxParagraphs.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 160, after: 80 },
            })
          );
          break;

        case "bullet":
          docxParagraphs.push(
            new Paragraph({
              text: block.text,
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
          break;

        case "paragraph":
        default:
          docxParagraphs.push(
            new Paragraph({
              children: [new TextRun(block.text)],
              spacing: { after: 160, line: 276 },
            })
          );
          break;
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docxParagraphs,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

/**
 * Generate clean Plain Text
 */
export const generateTXT = (title = "Document", content = "") => {
  const plain = htmlToPlainText(content);
  const header = `${title}\n${"=".repeat(Math.max(title.length, 10))}\n\n`;
  return Buffer.from(header + plain, "utf-8");
};
