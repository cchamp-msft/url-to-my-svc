import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalize, overlap, pickBest, similarity, stripDecorations } from '../extension/lib/match.js';

test('normalize folds case, accents, punctuation and ampersands', () => {
  assert.equal(normalize('Born In The U.S.A.'), normalize('Born in the U.S.A.'));
  assert.equal(normalize('Beyoncé'), 'beyonce');
  assert.equal(normalize('Simon & Garfunkel'), 'simon and garfunkel');
  assert.equal(normalize('宇多田ヒカル'), '宇多田ヒカル');
});

test('stripDecorations removes remaster and featuring noise but keeps versions', () => {
  assert.equal(stripDecorations('Thunder Road - Remastered 2015'), 'Thunder Road');
  assert.equal(stripDecorations('Born to Run - 2014 Remaster'), 'Born to Run');
  assert.equal(stripDecorations('Old Town Road (feat. Billy Ray Cyrus)'), 'Old Town Road');
  assert.equal(stripDecorations('Abbey Road (Remastered)'), 'Abbey Road');
  assert.equal(stripDecorations('Born in the U.S.A. (Demo Version - 1982)'), 'Born in the U.S.A. (Demo Version - 1982)');
  assert.equal(stripDecorations('Hey Jude - Live'), 'Hey Jude - Live');
});

test('similarity is exact-sensitive, overlap tolerates containment', () => {
  assert.equal(similarity('Bruce Springsteen', 'Bruce Springsteen'), 1);
  assert.ok(similarity('Bruce Springsteen', 'Bruce Springsteen & The E Street Band') < 0.5);
  assert.equal(overlap('Bruce Springsteen', 'Bruce Springsteen & The E Street Band'), 1);
  assert.equal(similarity('', 'anything'), 0);
});

const song = (title, artist, durationMs, url) => ({ type: 'track', title, artists: [artist], durationMs, url });

test('pickBest prefers exact title, then closer duration, then earlier result', () => {
  const item = song('Born in the U.S.A.', 'Bruce Springsteen', 279786);
  const candidates = [
    song('Born In the U.S.A. (Demo Version - 1982)', 'Bruce Springsteen', 279000, 'demo'),
    song('Born In the U.S.A.', 'Bruce Springsteen', 400000, 'long-live'),
    song('Born In the U.S.A.', 'Bruce Springsteen', 279784, 'original'),
    song('Born in the U.S.A.', 'Bruce Springsteen', 279784, 'compilation'),
  ];
  assert.equal(pickBest(item, candidates).url, 'original');
});

test('pickBest matches remastered and featuring variants', () => {
  const item = song('Thunder Road - Remastered 2015', 'Bruce Springsteen');
  assert.equal(pickBest(item, [song('Thunder Road', 'Bruce Springsteen', undefined, 'ok')]).url, 'ok');

  const collab = { type: 'track', title: 'Old Town Road (feat. Billy Ray Cyrus)', artists: ['Lil Nas X', 'Billy Ray Cyrus'] };
  assert.equal(pickBest(collab, [song('Old Town Road (Remix) [feat. Billy Ray Cyrus]', 'Lil Nas X', undefined, 'remix')])?.url, 'remix');
});

test('pickBest rejects wrong artist or title', () => {
  const item = song('Born to Run', 'Bruce Springsteen');
  assert.equal(pickBest(item, [song('Born to Run', 'Frankie Goes to Hollywood', undefined, 'x')]), null);
  assert.equal(pickBest(item, [song('Dancing in the Dark', 'Bruce Springsteen', undefined, 'x')]), null);
  assert.equal(pickBest(item, []), null);
});

test('pickBest needs a near-exact name for artists', () => {
  const artist = (title, url) => ({ type: 'artist', title, artists: [title], url });
  const candidates = [artist('Bruce Springsteen & The E Street Band', 'band'), artist('Bruce Springsteen', 'solo')];
  assert.equal(pickBest(artist('Bruce Springsteen'), candidates).url, 'solo');
  assert.equal(pickBest(artist('Bruce Springsteen & The E Street Band'), candidates).url, 'band');
  assert.equal(pickBest(artist('Bruce Hornsby'), candidates), null);
});
