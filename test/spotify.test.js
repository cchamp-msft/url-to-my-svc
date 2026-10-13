import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseEmbed, spotify } from '../extension/lib/sources/spotify.js';
import { fakeFetch, fixture } from './helpers.js';

const TRACK = '0dOg1ySSI7NkpAe89Zo0b9';

test('linkPattern captures type and id from Spotify links', () => {
  const re = new RegExp(spotify.linkPattern);
  const cases = {
    'https://open.spotify.com/artist/3eqjTLE0HfPfh78zjh6TqT': ['artist', '3eqjTLE0HfPfh78zjh6TqT'],
    [`https://open.spotify.com/track/${TRACK}?si=abc123`]: ['track', TRACK],
    'https://open.spotify.com/intl-de/album/0PMasrHdpaoIRuHuhHp72O': ['album', '0PMasrHdpaoIRuHuhHp72O'],
    'https://open.spotify.com/intl-pt-BR/track/0dOg1ySSI7NkpAe89Zo0b9': ['track', TRACK],
  };
  for (const [url, expected] of Object.entries(cases)) {
    assert.deepEqual(re.exec(url)?.slice(1), expected, url);
  }
});

test('linkPattern leaves other Spotify pages alone', () => {
  const re = new RegExp(spotify.linkPattern);
  for (const url of [
    'https://open.spotify.com/',
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    `https://open.spotify.com/embed/track/${TRACK}`,
    'https://open.spotify.com/search/springsteen',
    `https://example.com/?u=https://open.spotify.com/track/${TRACK}`,
  ]) {
    assert.equal(re.test(url), false, url);
  }
});

test('isValid only accepts known types and 22-character ids', () => {
  assert.equal(spotify.isValid('track', TRACK), true);
  assert.equal(spotify.isValid('playlist', TRACK), false);
  assert.equal(spotify.isValid('track', '../../etc'), false);
  assert.equal(spotify.isValid('track', null), false);
});

test('parseEmbed reads tracks, albums and artists', () => {
  assert.deepEqual(parseEmbed(fixture('spotify-embed-track.html')), {
    type: 'track',
    title: 'Born in the U.S.A.',
    artists: ['Bruce Springsteen'],
    durationMs: 279786,
  });
  assert.deepEqual(parseEmbed(fixture('spotify-embed-album.html')), {
    type: 'album',
    title: 'Born In The U.S.A.',
    artists: ['Bruce Springsteen'],
    durationMs: undefined,
  });
  assert.deepEqual(parseEmbed(fixture('spotify-embed-artist.html')), {
    type: 'artist',
    title: 'Bruce Springsteen',
    artists: ['Bruce Springsteen'],
    durationMs: undefined,
  });
});

test('parseEmbed fails clearly on a page without the payload', () => {
  assert.throws(() => parseEmbed('<html><title>Spotify – Web Player</title></html>'), /no __NEXT_DATA__/);
});

test('lookup fetches the embed page and checks the type', async () => {
  const fetch = fakeFetch({ 'https://open.spotify.com/embed/': fixture('spotify-embed-track.html') });
  const item = await spotify.lookup('track', TRACK, { fetch });
  assert.equal(item.title, 'Born in the U.S.A.');
  assert.deepEqual(fetch.calls, [`https://open.spotify.com/embed/track/${TRACK}`]);

  await assert.rejects(spotify.lookup('album', TRACK, { fetch }), /Expected a Spotify album, got track/);
});

test('lookup surfaces HTTP errors', async () => {
  const fetch = fakeFetch({ 'https://open.spotify.com/embed/': 404 });
  await assert.rejects(spotify.lookup('track', TRACK, { fetch }), /HTTP 404/);
});
