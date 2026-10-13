import { buildRules } from './lib/rules.js';
import { sources } from './lib/services.js';
import { loadSettings } from './lib/settings.js';

async function applyRules() {
  const { enabled } = await loadSettings();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: enabled ? buildRules(Object.values(sources), chrome.runtime.getURL('redirect.html')) : [],
  });
  await chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
  await chrome.action.setTitle({
    title: enabled ? 'URL to My Service: on (click to pause)' : 'URL to My Service: paused (click to resume)',
  });
}

// One sync at a time: overlapping ones could re-add rule ids the other just
// added, or apply a stale enabled state last.
let pending = Promise.resolve();
function syncRules() {
  pending = pending.then(applyRules, applyRules);
  return pending;
}

chrome.runtime.onInstalled.addListener(syncRules);
chrome.runtime.onStartup.addListener(syncRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'enabled' in changes) syncRules();
});

chrome.action.onClicked.addListener(async () => {
  const { enabled } = await loadSettings();
  await chrome.storage.local.set({ enabled: !enabled });
});
