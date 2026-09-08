import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

/**
 * Format plain text into HTML paragraphs suitable for TipTap
 */
export const formatTextToHTML = (text) => {
  if (!text || typeof text !== "string") return "<p></p>";
  
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    const single = text.trim();
    return single ? `<p>${escapeHTML(single)}</p>` : "<p></p>";
  }

  return paragraphs
    .map((p) => `<p>${escapeHTML(p).replace(/\r?\n/g, "<br/>")}</p>`)
    .join("");
};

const escapeHTML = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Validates uploaded file
 */
export const validateUploadFile = (file) => {
  if (!file) {
    throw new Error("No file uploaded");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds maximum allowed size of 10MB");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  return ext;
};

/**
 * Extract content from buffer according to extension
 */
export const extractContentFromFile = async (buffer, extension, originalName = "") => {
  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty");
  }

  const ext = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;

  if (ext === ".txt") {
    const rawText = buffer.toString("utf-8");
    if (!rawText.trim()) {
      throw new Error("The uploaded TXT file is empty");
    }
    return {
      content: formatTextToHTML(rawText),
      rawText: rawText.trim(),
    };
  }

  if (ext === ".docx") {
    try {
      const { value: html } = await mammoth.convertToHtml({ buffer });
      const { value: rawText } = await mammoth.extractRawText({ buffer });

      if (!rawText.trim() && !html.trim()) {
        throw new Error("Could not extract any readable text from DOCX file");
      }

      const content = html.trim() ? html.trim() : formatTextToHTML(rawText);
      return {
        content,
        rawText: rawText.trim(),
      };
    } catch (err) {
      throw new Error(`Failed to parse DOCX file: ${err.message}`);
    }
  }

  if (ext === ".pdf") {
    let parser = null;
    try {
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const rawText = (result?.text || "").trim();

      if (!rawText) {
        throw new Error(
          "No readable text found in PDF. Scanned or image-only PDFs without OCR are not supported."
        );
      }

      return {
        content: formatTextToHTML(rawText),
        rawText,
      };
    } catch (err) {
      throw new Error(`Failed to parse PDF file: ${err.message}`);
    } finally {
      if (parser?.destroy) {
        try {
          await parser.destroy();
        } catch (_) {}
      }
    }
  }

  throw new Error(`Unsupported file type: ${ext}`);
};
