// Spotify as a link source: which URLs to intercept, and how to find out what
// a link points to.
//
// Metadata comes from the embed page (open.spotify.com/embed/{type}/{id}). The
// regular page only carries og:/music: meta tags for crawler user agents; a
// real browser gets an empty web-player shell, so it is useless from inside an
// extension. The embed page is server-rendered for everyone and includes the
// entity as JSON in __NEXT_DATA__.

const TYPES = ['track', 'album', 'artist'];
const ID = /^[A-Za-z0-9]{22}$/;
const NEXT_DATA = /<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

export const spotify = {
  id: 'spotify',
  name: 'Spotify',
  // RE2 syntax for declarativeNetRequest. Capture groups: 1 = type, 2 = id.
  linkPattern: `^https://open\\.spotify\\.com/(?:intl-[a-zA-Z-]+/)?(${TYPES.join('|')})/([A-Za-z0-9]{22})`,

  isValid(type, id) {
    return TYPES.includes(type) && ID.test(id);
  },

  canonicalUrl(type, id) {
    return `https://open.spotify.com/${type}/${id}`;
  },

  async lookup(type, id, { fetch = globalThis.fetch, signal } = {}) {
    const res = await fetch(`https://open.spotify.com/embed/${type}/${id}`, { signal, credentials: 'omit' });
    if (!res.ok) throw new Error(`Spotify returned HTTP ${res.status}`);
    const item = parseEmbed(await res.text());
    if (item.type !== type) throw new Error(`Expected a Spotify ${type}, got ${item.type}`);
    return item;
  },
};

export function parseEmbed(html) {
  const json = NEXT_DATA.exec(html)?.[1];
  if (!json) throw new Error('Spotify embed page has no __NEXT_DATA__ payload');
  const entity = JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
  if (!entity?.type) throw new Error('Spotify embed payload has no entity');

  const title = entity.name ?? entity.title;
  let artists;
  if (entity.type === 'artist') artists = [title];
  else if (entity.artists?.length) artists = entity.artists.map((a) => a.name);
  else artists = (entity.subtitle ?? '').split(', ').filter(Boolean);

  return {
    type: entity.type,
    title,
    artists,
    durationMs: entity.duration || undefined,
  };
}
