// declarativeNetRequest rules that send source-service links to redirect.html
// before the browser loads them.
//
// These are dynamic rules because the redirect target is a full extension URL
// (chrome-extension://<id>/...), which a static ruleset cannot know.

// Appending ?u2ms=skip to a source link lets it through ("Open in Spotify").
export const SKIP_PARAM = 'u2ms';
const SKIP_VALUE = 'skip';

export function buildRules(sources, redirectPage) {
  return sources.flatMap((source, i) => [
    {
      id: i * 2 + 1,
      priority: 2,
      action: { type: 'allow' },
      condition: {
        regexFilter: `${source.linkPattern}.*[?&]${SKIP_PARAM}=${SKIP_VALUE}`,
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: i * 2 + 2,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { regexSubstitution: `${redirectPage}?from=${source.id}&type=\\1&id=\\2` },
      },
      condition: {
        // Match through the end: regexSubstitution only replaces the matched
        // part, so an unmatched query string would be appended to ours.
        regexFilter: `${source.linkPattern}.*`,
        resourceTypes: ['main_frame'],
      },
    },
  ]);
}

export function withSkip(url) {
  const u = new URL(url);
  u.searchParams.set(SKIP_PARAM, SKIP_VALUE);
  return u.href;
}
