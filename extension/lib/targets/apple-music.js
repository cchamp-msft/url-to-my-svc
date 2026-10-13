// Apple Music as a link target, resolved through the public iTunes Search API
// (no key, no account). https://performance-partners.apple.com/search-api

import { pickBest, stripDecorations } from '../match.js';

const ENTITY = { track: 'song', album: 'album', artist: 'musicArtist' };
const ORIGIN = 'https://music.apple.com/';

export const appleMusic = {
  id: 'apple-music',
  name: 'Apple Music',

  searchUrl(item, storefront) {
    return `${ORIGIN}${storefront}/search?term=${encodeURIComponent(searchTerm(item))}`;
  },

  // Resolves to { url, matched }. When nothing scores well enough the url is
  // an Apple Music search page, so the user still lands one click away.
  async resolve(item, { storefront = 'us', fetch = globalThis.fetch, signal } = {}) {
    const params = new URLSearchParams({
      term: searchTerm(item),
      entity: ENTITY[item.type],
      country: storefront,
      limit: '10',
    });
    const res = await fetch(`https://itunes.apple.com/search?${params}`, { signal, credentials: 'omit' });
    if (!res.ok) throw new Error(`iTunes Search returned HTTP ${res.status}`);
    const { results = [] } = await res.json();

    const best = pickBest(item, results.map((r) => toCandidate(item.type, r)).filter((c) => c.url));
    if (best) return { url: best.url, matched: true };
    return { url: appleMusic.searchUrl(item, storefront), matched: false };
  },
};

function searchTerm(item) {
  if (item.type === 'artist') return item.title;
  return `${stripDecorations(item.title)} ${item.artists[0] ?? ''}`.trim();
}

function toCandidate(type, r) {
  const fields = {
    track: [r.trackName, r.trackViewUrl],
    album: [r.collectionName, r.collectionViewUrl],
    artist: [r.artistName, r.artistLinkUrl],
  }[type];
  return {
    type,
    title: fields[0],
    artists: [r.artistName],
    durationMs: r.trackTimeMillis,
    url: cleanUrl(fields[1]),
  };
}

// Drops the "uo" tracking param and rejects anything that is not an Apple
// Music page, since the result is navigated to directly.
function cleanUrl(raw) {
  if (!raw?.startsWith(ORIGIN)) return null;
  const url = new URL(raw);
  url.searchParams.delete('uo');
  return url.href;
}
