// User settings, stored in chrome.storage.local.

import { DEFAULT_TARGET } from './services.js';

export const DEFAULTS = {
  enabled: true,
  target: DEFAULT_TARGET,
  // Two-letter storefront/country code; blank means "use the browser's region".
  storefront: '',
};

export function loadSettings() {
  return chrome.storage.local.get(DEFAULTS);
}

export function resolveStorefront(storefront, language = navigator.language) {
  if (/^[a-z]{2}$/i.test(storefront ?? '')) return storefront.toLowerCase();
  const region = (language ?? '').split('-').slice(1).find((part) => /^[a-z]{2}$/i.test(part));
  return region ? region.toLowerCase() : 'us';
}
