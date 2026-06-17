/**
 * Extremely basic HTML -> paragraphs.
 * This is not "perfect parsing". It's good enough for v1.
 * We only need stable paragraph indices we can cite.
 *
 * Scans <h2> and <p> elements in document order so each paragraph
 * inherits the nearest preceding <h2> section (id + title).
 */
export function htmlToParagraphs(html: string) {
  const h2Re = /<h2[^>]+id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/gi;
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;

  const h2Tokens = Array.from(html.matchAll(h2Re)).map((m) => ({
    type: 'h2' as const,
    pos: m.index!,
    id: m[1],
    title: m[2].replace(/<[^>]+>/g, '').trim(),
  }));

  const pTokens = Array.from(html.matchAll(pRe)).map((m) => ({
    type: 'p' as const,
    pos: m.index!,
    content: m[1],
  }));

  function clean(s: string) {
    return s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const tokens = [...h2Tokens, ...pTokens].sort((a, b) => a.pos - b.pos);

  let sectionId: string | null = null;
  let sectionTitle: string | null = null;
  const paragraphs: {
    index: number;
    text: string;
    sectionId: string | null;
    sectionTitle: string | null;
  }[] = [];
  let idx = 0;

  for (const token of tokens) {
    if (token.type === 'h2') {
      sectionId = token.id;
      sectionTitle = token.title;
    } else {
      const text = clean(token.content);
      if (text.length > 40) {
        paragraphs.push({ index: idx++, text, sectionId, sectionTitle });
      }
    }
  }

  // Fallback: if no <p> tags found, treat the whole html as one chunk.
  if (paragraphs.length === 0) {
    const text = clean(html);
    if (text.length > 40) {
      paragraphs.push({ index: 0, text, sectionId: null, sectionTitle: null });
    }
  }

  return paragraphs;
}
