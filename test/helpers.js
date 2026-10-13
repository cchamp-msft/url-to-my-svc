import { readFileSync } from 'node:fs';

export function fixture(name) {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

// A fetch stand-in that records requested URLs and answers from a map of
// URL prefix -> body (string or object), or a status code for errors.
export function fakeFetch(routes) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (prefix === undefined) throw new Error(`unexpected fetch: ${url}`);
    const body = routes[prefix];
    if (typeof body === 'number') return new Response('', { status: body });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body));
  };
  return Object.assign(fetch, { calls });
}
