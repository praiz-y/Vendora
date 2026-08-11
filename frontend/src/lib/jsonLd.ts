// Shared JSON-LD <script> prop builder — the one place structured data gets
// serialized, so every call site gets the same XSS-safe escaping rather than
// reimplementing it. JSON.stringify alone does NOT escape "</script>"; if a
// seller-provided string (product/store name or description) ever contained
// that literal substring, an unescaped embed would let the browser's HTML
// parser close the script tag early. Escaping "<" as its unicode form is the
// standard fix and doesn't change the parsed JSON value at all.
export function jsonLdScriptProps(data: unknown): { type: string; dangerouslySetInnerHTML: { __html: string } } {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  };
}
