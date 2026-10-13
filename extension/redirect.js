// Runs on redirect.html, where intercepted links land: look up what the link
// points to, find it on the user's service, and replace this page with it.

import { withSkip } from './lib/rules.js';
import { DEFAULT_TARGET, sources, targets } from './lib/services.js';
import { loadSettings, resolveStorefront } from './lib/settings.js';

const TIMEOUT_MS = 8000;

const $ = (id) => document.getElementById(id);

function reason(err) {
  return err.name === 'TimeoutError' ? 'timed out' : err.message;
}

function fail(message) {
  $('status').textContent = message;
  $('status').classList.add('error');
  document.title = 'Link not converted';
}

function describe(item) {
  return item.type === 'artist' ? item.title : `${item.title} · ${item.artists.join(', ')}`;
}

async function main() {
  const params = new URLSearchParams(location.search);
  const source = sources[params.get('from')];
  const type = params.get('type');
  const id = params.get('id');
  if (!source?.isValid(type, id)) return fail('This link could not be read.');

  $('source-link').href = withSkip(source.canonicalUrl(type, id));
  $('source-link').textContent = `Open in ${source.name} instead`;
  $('source-link').hidden = false;

  const settings = await loadSettings();
  const target = targets[settings.target] ?? targets[DEFAULT_TARGET];
  const storefront = resolveStorefront(settings.storefront);
  $('status').textContent = `Opening in ${target.name}…`;

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let item;
  try {
    item = await source.lookup(type, id, { signal });
  } catch (err) {
    return fail(`Couldn't read the ${source.name} link: ${reason(err)}.`);
  }
  $('item').textContent = describe(item);

  let url;
  try {
    ({ url } = await target.resolve(item, { storefront, signal }));
  } catch (err) {
    // Search is still one click from the right result.
    console.warn(`Lookup on ${target.name} failed, falling back to search: ${reason(err)}`);
    url = target.searchUrl(item, storefront);
  }
  location.replace(url);
}

main();
