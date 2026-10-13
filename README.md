# URL to My Service (url-to-my-svc)

A browser extension that opens music links in *your* music service. Click a Spotify link and land on the same artist, album, or song in Apple Music.

```
https://open.spotify.com/artist/3eqjTLE0HfPfh78zjh6TqT
  -> https://music.apple.com/us/artist/bruce-springsteen/178834
```

## Status: MVP

| | Supported |
|---|---|
| From | Spotify `open.spotify.com` track, album, and artist links, including `/intl-xx/` paths and `?si=` share links |
| To | Apple Music |
| Browsers | Chrome and Edge (Manifest V3) |

## Install

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.

## Use

- **Click any Spotify link**, whether it's on a web page, typed in the address bar, or opened from Slack, Discord, or another desktop app. A brief "Opening in Apple Music…" page appears and is replaced by the Apple Music page. **Back** returns you to where you clicked.
- **No confident match?** You land on Apple Music search results for the title and artist.
- **Want Spotify after all?** Click "Open in Spotify instead" on the interstitial page.
- **Pause / resume:** click the toolbar button. The badge shows `off` while paused.
- **Options** (right-click the toolbar button, then **Options**): choose the storefront country. It defaults to your browser's region.

## How it works

1. **Intercept.** A `declarativeNetRequest` rule catches top-level navigations to `open.spotify.com/{track|album|artist}/{id}` before Spotify loads and sends them to the extension's `redirect.html`. The browser redirects natively, so there's no flash of the Spotify page and no permission to read the sites you visit.
2. **Identify.** `redirect.html` fetches the Spotify **embed** page (`open.spotify.com/embed/{type}/{id}`) and reads the entity JSON (name, artists, duration) from `__NEXT_DATA__`.
   - The `og:` meta tags from the original curl sample are only served to crawler and curl user agents. A real browser gets an empty web-player shell with no metadata, so scraping the regular page doesn't work from inside an extension.
3. **Find.** It queries the [iTunes Search API](https://performance-partners.apple.com/search-api) (free, no key) and scores the results on title, artist, and duration. Remaster and "feat." noise is ignored, but live and demo versions stay distinct.
4. **Go.** It calls `location.replace()` with the best match, or with an Apple Music search URL if nothing scores well enough or the API is unavailable.

The only network calls are to the Spotify embed page and the iTunes Search API.

### Why not serp-api or a local AI model?

The MVP doesn't need either. Apple's search API returns exact Apple Music URLs for free. A serp-api key can't ship inside a public extension, because every user could read it, and end users won't have a local model. These are worth revisiting behind a small backend for services that have no search API (for example Amazon Music).

## Development

Requires Node 22+. The tests have no dependencies.

```
npm test
```

The icon PNGs are rendered from `assets/*.svg` with your installed Chrome or Edge. The 16 px toolbar icon has its own simplified drawing (→♪), because the full link → ♫ design is unreadable at that size.

```
npm install
npm run icons
```

```
extension/
  manifest.json
  background.js             keeps redirect rules in sync with the on/off setting; toolbar toggle
  redirect.html/.js         interstitial: identify -> find -> location.replace
  options.html/.js          enable, target service, storefront
  lib/sources/spotify.js    which links to intercept + metadata lookup
  lib/targets/apple-music.js  iTunes search -> Apple Music URL
  lib/match.js              fuzzy title/artist matching
  lib/rules.js              declarativeNetRequest rules
  lib/services.js           registry of sources and targets
  icons/                    rendered PNGs (generated; edit assets/ instead)
assets/                     icon sources (SVG)
scripts/render-icons.mjs    assets/*.svg -> extension/icons/*.png
test/                       node:test unit tests; fixtures are trimmed real responses
```

**Adding a service:** a source exports `{ id, name, linkPattern, isValid, canonicalUrl, lookup }`, and a target exports `{ id, name, resolve, searchUrl }`. Register it in `lib/services.js` and add its API host to `host_permissions` in `manifest.json`.

## Not in the MVP yet

- **More targets:** YouTube Music, Amazon Music, Tidal, and Deezer. Deezer has a public search API; the others would start with a search-URL fallback.
- **More sources:** for example Apple Music to Spotify. Spotify's search API needs app credentials.
- **Playlists and podcasts:** there's no reliable cross-service equivalent.
- **Firefox and Safari:** both support `declarativeNetRequest`. Firefox needs `background.scripts` and a gecko id, and Safari needs an Xcode wrapper.
- **Mobile:** mobile Chrome has no extensions, so this would need a share-target app.
- **Store listing:** packaging, screenshots, and a 128 px icon with the store's 16 px transparent padding.
