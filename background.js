/**
 * Service worker — valeurs par défaut et messages.
 */

const DEFAULTS = {
  hideShorts: true,
  hidePlayables: true,
  redirectPlayables: true,
  redirectShorts: false,
  sortYtmArtistByPlays: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    chrome.storage.sync.set({ ...DEFAULTS, ...items });
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getSettings") {
    chrome.storage.sync.get(DEFAULTS, (items) => {
      sendResponse(items);
    });
    return true;
  }
  return false;
});
