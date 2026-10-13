const DEFAULTS = {
  hideShorts: true,
  hidePlayables: true,
  redirectPlayables: true,
  redirectShorts: false,
  sortYtmArtistByPlays: true
};

const ids = Object.keys(DEFAULTS);
const statusEl = document.getElementById("status");

function setStatus(text, saved = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("saved", saved);
}

function load() {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.checked = !!items[id];
    }
  });
}

function saveFromUi() {
  const data = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    data[id] = el ? !!el.checked : DEFAULTS[id];
  }
  chrome.storage.sync.set(data, () => {
    setStatus("Enregistré", true);
    setTimeout(() => setStatus("Prêt", false), 1500);
  });
}

async function reloadActiveYoutube() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    setStatus("Aucun onglet actif", false);
    return;
  }
  const url = tab.url || "";
  if (!/youtube\.com/i.test(url)) {
    setStatus("Ouvre YouTube / Music puis réessaie", false);
    return;
  }
  await chrome.tabs.reload(tab.id);
  setStatus("Page rechargée", true);
  setTimeout(() => setStatus("Prêt", false), 1500);
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", saveFromUi);
  }
  document.getElementById("reload").addEventListener("click", () => {
    saveFromUi();
    reloadActiveYoutube();
  });
});
