import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appleMusic } from '../extension/lib/targets/apple-music.js';
import { fakeFetch, fixture } from './helpers.js';

const ITUNES = 'https://itunes.apple.com/search?';
const springsteen = { type: 'artist', title: 'Bruce Springsteen', artists: ['Bruce Springsteen'] };

test('resolves the README example: Bruce Springsteen artist page', async () => {
  const fetch = fakeFetch({ [ITUNES]: fixture('itunes-artist.json') });
  const result = await appleMusic.resolve(springsteen, { storefront: 'us', fetch });
  assert.deepEqual(result, { url: 'https://music.apple.com/us/artist/bruce-springsteen/178834', matched: true });

  const query = new URL(fetch.calls[0]).searchParams;
  assert.equal(query.get('term'), 'Bruce Springsteen');
  assert.equal(query.get('entity'), 'musicArtist');
  assert.equal(query.get('country'), 'us');
});

test('resolves a track to the original album version', async () => {
  const fetch = fakeFetch({ [ITUNES]: fixture('itunes-song.json') });
  const item = { type: 'track', title: 'Born in the U.S.A.', artists: ['Bruce Springsteen'], durationMs: 279786 };
  const result = await appleMusic.resolve(item, { storefront: 'us', fetch });
  assert.equal(result.url, 'https://music.apple.com/us/album/born-in-the-u-s-a/203708420?i=203708455');

  const query = new URL(fetch.calls[0]).searchParams;
  assert.equal(query.get('term'), 'Born in the U.S.A. Bruce Springsteen');
  assert.equal(query.get('entity'), 'song');
});

test('resolves an album', async () => {
  const fetch = fakeFetch({ [ITUNES]: fixture('itunes-album.json') });
  const item = { type: 'album', title: 'Born In The U.S.A.', artists: ['Bruce Springsteen'] };
  const result = await appleMusic.resolve(item, { storefront: 'us', fetch });
  assert.equal(result.url, 'https://music.apple.com/us/album/born-in-the-u-s-a/203708420');
});

test('searches without remaster noise in the term', async () => {
  const fetch = fakeFetch({ [ITUNES]: { results: [] } });
  await appleMusic.resolve({ type: 'track', title: 'Thunder Road - Remastered 2015', artists: ['Bruce Springsteen'] }, { fetch });
  assert.equal(new URL(fetch.calls[0]).searchParams.get('term'), 'Thunder Road Bruce Springsteen');
});

test('falls back to an Apple Music search page when nothing matches', async () => {
  const fetch = fakeFetch({ [ITUNES]: { results: [] } });
  const item = { type: 'track', title: 'Born to Run', artists: ['Bruce Springsteen'] };
  const result = await appleMusic.resolve(item, { storefront: 'gb', fetch });
  assert.deepEqual(result, {
    url: 'https://music.apple.com/gb/search?term=Born%20to%20Run%20Bruce%20Springsteen',
    matched: false,
  });
});

test('ignores result URLs that are not Apple Music pages', async () => {
  const fetch = fakeFetch({
    [ITUNES]: { results: [{ artistName: 'Bruce Springsteen', artistLinkUrl: 'https://evil.example/artist/1' }] },
  });
  const result = await appleMusic.resolve(springsteen, { fetch });
  assert.equal(result.matched, false);
  assert.match(result.url, /^https:\/\/music\.apple\.com\/us\/search\?/);
});

test('surfaces iTunes HTTP errors', async () => {
  const fetch = fakeFetch({ [ITUNES]: 503 });
  await assert.rejects(appleMusic.resolve(springsteen, { fetch }), /HTTP 503/);
});
