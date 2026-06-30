// Background service worker — no persistent state needed.
// All logic is in content.js (MAIN world fetch interceptor).
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DevPulse] Copilot tracker installed')
})
