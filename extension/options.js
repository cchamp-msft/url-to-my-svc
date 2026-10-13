import { targets } from './lib/services.js';
import { loadSettings, resolveStorefront } from './lib/settings.js';

const $ = (id) => document.getElementById(id);

const settings = await loadSettings();

$('enabled').checked = settings.enabled;
$('enabled').addEventListener('change', (e) => chrome.storage.local.set({ enabled: e.target.checked }));

for (const target of Object.values(targets)) {
  $('target').add(new Option(target.name, target.id, false, target.id === settings.target));
}
$('target').addEventListener('change', (e) => chrome.storage.local.set({ target: e.target.value }));

$('detected').textContent = resolveStorefront('');
$('storefront').value = settings.storefront;
$('storefront').placeholder = resolveStorefront('');
$('storefront').addEventListener('change', (e) => {
  const value = e.target.value.trim().toLowerCase();
  if (value && !/^[a-z]{2}$/.test(value)) {
    e.target.setCustomValidity('Use a two-letter country code');
    e.target.reportValidity();
    return;
  }
  e.target.setCustomValidity('');
  chrome.storage.local.set({ storefront: value });
});

// Keep the checkbox in sync with the toolbar button.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'enabled' in changes) $('enabled').checked = changes.enabled.newValue;
});
