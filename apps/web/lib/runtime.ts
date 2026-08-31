import "server-only";

export const usesCanonicalContent =
  process.env["LECTUREBRIEF_CONTENT_SOURCE"] === "files" || process.env["VERCEL"] === "1";

export const commentsEnabled = !usesCanonicalContent;
