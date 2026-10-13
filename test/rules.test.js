import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildRules, withSkip } from '../extension/lib/rules.js';
import { sources } from '../extension/lib/services.js';
import { resolveStorefront } from '../extension/lib/settings.js';

const PAGE = 'chrome-extension://abc/redirect.html';
const rules = buildRules(Object.values(sources), PAGE);
const [allow, redirect] = rules;

// What declarativeNetRequest does with a regexSubstitution rule: replace the
// matched part of the URL, keeping anything outside the match.
function substitute(rule, url) {
  const re = new RegExp(rule.condition.regexFilter);
  if (!re.test(url)) return null;
  return url.replace(re, rule.action.redirect.regexSubstitution.replace(/\\(\d)/g, '$$$1'));
}

test('rule ids are unique and the skip rule outranks the redirect', () => {
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);
  assert.equal(allow.action.type, 'allow');
  assert.equal(redirect.action.type, 'redirect');
  assert.ok(allow.priority > redirect.priority);
  for (const r of rules) assert.deepEqual(r.condition.resourceTypes, ['main_frame']);
});

test('redirect rule sends Spotify links to the redirect page, dropping their query', () => {
  const expected = `${PAGE}?from=spotify&type=track&id=0dOg1ySSI7NkpAe89Zo0b9`;
  assert.equal(substitute(redirect, 'https://open.spotify.com/track/0dOg1ySSI7NkpAe89Zo0b9'), expected);
  assert.equal(substitute(redirect, 'https://open.spotify.com/intl-de/track/0dOg1ySSI7NkpAe89Zo0b9?si=xyz&utm_source=copy-link'), expected);
  assert.equal(substitute(redirect, 'https://open.spotify.com/track/0dOg1ySSI7NkpAe89Zo0b9#t=30'), expected);
});

test('skip rule matches only links carrying the skip param', () => {
  const re = new RegExp(allow.condition.regexFilter);
  const url = 'https://open.spotify.com/track/0dOg1ySSI7NkpAe89Zo0b9';
  assert.equal(re.test(url), false);
  assert.equal(re.test(withSkip(url)), true);
  assert.equal(re.test(withSkip(`${url}?si=abc`)), true);
  // Spotify's locale redirect keeps the query string.
  assert.equal(re.test('https://open.spotify.com/intl-de/track/0dOg1ySSI7NkpAe89Zo0b9?u2ms=skip'), true);
});

test('resolveStorefront prefers the setting, then the browser region', () => {
  assert.equal(resolveStorefront('GB', 'en-US'), 'gb');
  assert.equal(resolveStorefront('', 'en-US'), 'us');
  assert.equal(resolveStorefront('', 'de-DE'), 'de');
  assert.equal(resolveStorefront('', 'zh-Hant-TW'), 'tw');
  assert.equal(resolveStorefront('', 'en'), 'us');
  assert.equal(resolveStorefront('xyz', 'fr-FR'), 'fr');
});
