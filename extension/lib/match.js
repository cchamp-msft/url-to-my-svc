// Fuzzy matching between an item from the source service and search results
// from the target service. Both sides are { type, title, artists[] } shaped;
// candidates add { url, durationMs? }.

// Packaging noise that differs between services for the same recording/release.
const DECORATION = /\s*[([][^)\]]*\b(?:remaster(?:ed)?|feat\.?|ft\.?|deluxe|expanded|anniversary|edition)\b[^)\]]*[)\]]/gi;
const SUFFIX = /\s+-\s+(?:[^-]*\bremaster(?:ed)?\b.*|feat\..*)$/i;

const MIN_TITLE = 0.6;
const MIN_ARTIST = 0.5;
const MIN_ARTIST_EXACT = 0.75;

export function stripDecorations(s) {
  return (s ?? '').replace(DECORATION, '').replace(SUFFIX, '').trim();
}

export function normalize(s) {
  return stripDecorations(s)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokens(s) {
  return new Set(normalize(s).split(' ').filter(Boolean));
}

function shared(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

// Dice coefficient over word tokens: 1 for identical, 0 for disjoint.
export function similarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  return (2 * shared(ta, tb)) / (ta.size + tb.size);
}

// Like similarity, but full containment scores 1, so "Bruce Springsteen"
// matches a credit of "Bruce Springsteen & The E Street Band".
export function overlap(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  return shared(ta, tb) / Math.min(ta.size, tb.size);
}

export function scoreCandidate(item, candidate) {
  if (item.type === 'artist') {
    const s = similarity(item.title, candidate.title);
    return s >= MIN_ARTIST_EXACT ? s : 0;
  }

  const title = similarity(item.title, candidate.title);
  const artist = Math.max(0, ...item.artists.map((a) => overlap(a, candidate.artists[0])));
  if (title < MIN_TITLE || artist < MIN_ARTIST) return 0;

  let score = title * 0.55 + artist * 0.45;
  if (item.durationMs && candidate.durationMs) {
    const delta = Math.abs(item.durationMs - candidate.durationMs);
    if (delta <= 3000) score += 0.1;
    else if (delta > 15000) score -= 0.1;
  }
  return score;
}

// Highest-scoring candidate above the thresholds, or null. Ties keep the
// earlier candidate, so the target service's own relevance order breaks them.
export function pickBest(item, candidates) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = scoreCandidate(item, c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
