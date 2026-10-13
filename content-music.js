/**
 * YouTube Clean — YouTube Music
 * Trie les listes de chansons par nombre de lectures (décroissant).
 *
 * Cible : pages artiste, playlists (Top songs, albums OLAK*, etc.)
 * quand des compteurs de lectures sont visibles.
 *
 * YTM a un bouton « Trier » natif qui réécrit le DOM — on re-applique
 * le tri après coup et on expose un bouton forcé.
 */
(() => {
  "use strict";

  const VERSION = "1.4.0";
  const DEFAULTS = {
    sortYtmArtistByPlays: true
  };

  let settings = { ...DEFAULTS };
  let lastUrl = location.href;
  let sweepScheduled = false;
  let sorting = false;
  let sortLockUntil = 0;
  let observer = null;
  let lastOrderSig = "";
  let applyCount = 0;

  const PLAY_WORDS =
    /(?:plays?|lectures?|views?|vues?|écoutes?|ecoutes?|stream(?:s|ings?)?)/i;
  const SKIP_SHELF_RE =
    /fans?\s+also|similaire|similar|recommand|suggest|radio|mix|clip|vid[eé]o|music\s*video|album\s*s|ep\s*$|compil/i;

  function loadSettings(cb) {
    try {
      chrome.storage.sync.get(DEFAULTS, (items) => {
        settings = { ...DEFAULTS, ...items };
        cb && cb();
      });
    } catch {
      settings = { ...DEFAULTS };
      cb && cb();
    }
  }

  function shortTitle(text) {
    return (text || "").replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
  }

  function parseLocaleNumber(str) {
    let s = String(str).replace(/\s/g, "");
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      const parts = s.split(",");
      if (parts.length === 2 && parts[1].length <= 2) {
        s = parts[0] + "." + parts[1];
      } else {
        s = s.replace(/,/g, "");
      }
    }
    return parseFloat(s);
  }

  /**
   * "1.2M plays", "1,2 M de lectures", "234K", "12 M de lectures" → nombre.
   * -1 si non reconnu.
   */
  function parsePlayCount(raw) {
    if (!raw) return -1;
    let t = shortTitle(raw);
    if (!t || t.length > 56) return -1;

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return -1;
    if (/^(19|20)\d{2}$/.test(t)) return -1;
    // n° de piste seul
    if (/^\d{1,3}$/.test(t)) return -1;

    const hasPlayWord = PLAY_WORDS.test(t);
    let s = t
      .replace(PLAY_WORDS, "")
      .replace(/\bde\b/gi, "")
      .replace(/\+/g, "")
      .trim();

    // "1,2 M" / "12M" / "1.2 M"
    let m = s.match(/^([\d]+(?:[.,\s][\d]+)*)\s*([KMB])?$/i);
    if (!m) {
      // parfois "12 millions" etc.
      const mFr = s.match(/^([\d]+(?:[.,]\d+)?)\s*(millions?|milliards?|milliers?)?$/i);
      if (mFr && (hasPlayWord || mFr[2])) {
        let n = parseLocaleNumber(mFr[1]);
        if (!Number.isFinite(n)) return -1;
        const u = (mFr[2] || "").toLowerCase();
        if (u.startsWith("milliard")) n *= 1e9;
        else if (u.startsWith("million")) n *= 1e6;
        else if (u.startsWith("millier")) n *= 1e3;
        return Math.round(n);
      }
      if (!hasPlayWord) return -1;
      return -1;
    }

    const letter = (m[2] || "").toUpperCase();
    if (!letter && !hasPlayWord) {
      const digits = m[1].replace(/[^\d]/g, "");
      if (digits.length < 4) return -1;
    }

    const num = parseLocaleNumber(m[1]);
    if (!Number.isFinite(num)) return -1;
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[letter] || 1;
    return Math.round(num * mult);
  }

  function isRelevantPage() {
    const path = location.pathname || "";
    // Artiste
    if (path.startsWith("/channel/") || path.startsWith("/@")) return true;
    // Toute playlist (Top songs, album OLAK*, user playlist…)
    if (path.startsWith("/playlist")) return true;
    // Browse artiste / shelf
    if (path.startsWith("/browse/")) return true;
    return false;
  }

  function getVideoId(row) {
    const a = row.querySelector(
      'a[href*="watch?v="], a[href*="/watch?"], a[href*="&v="]'
    );
    if (!a) return "";
    try {
      const href = a.getAttribute("href") || "";
      const u = new URL(href, location.origin);
      return u.searchParams.get("v") || href;
    } catch {
      return a.getAttribute("href") || "";
    }
  }

  function extractPlayCountFromRow(row) {
    if (!row || row.nodeType !== 1) return -1;

    const candidates = [];

    // Colonnes flex YTM (plays souvent dans secondary-flex-columns)
    row
      .querySelectorAll(
        [
          ".secondary-flex-columns yt-formatted-string",
          ".flex-column yt-formatted-string",
          "yt-formatted-string",
          "[class*='play-count']",
          "[class*='PlayCount']",
          "span"
        ].join(",")
      )
      .forEach((el) => {
        // ignorer le titre principal
        if (el.closest(".title-column, .song-title, .title")) return;
        const t = shortTitle(el.textContent);
        if (t && t.length <= 48) candidates.push(t);
      });

    const aria = shortTitle(
      row.getAttribute("aria-label") ||
        row.querySelector("[aria-label]")?.getAttribute("aria-label") ||
        ""
    );
    if (aria) {
      const m = aria.match(
        /([\d][\d\s.,]*\s*[KMB]?)\s*(?:plays?|lectures?|views?|vues?|écoutes?|ecoutes?)/i
      );
      if (m) candidates.unshift(m[0]);
    }

    let best = -1;
    for (const t of candidates) {
      const n = parsePlayCount(t);
      if (n > best) best = n;
    }
    return best;
  }

  function isSongRow(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "ytmusic-responsive-list-item-renderer") return true;
    if (tag === "ytmusic-playlist-shelf-renderer") return false;
    if (el.querySelector?.("ytmusic-responsive-list-item-renderer")) return false;
    return !!el.querySelector?.(
      "a[href*='watch'], .title-column, .song-title, yt-formatted-string.title"
    );
  }

  function findListContainers() {
    const containers = new Set();

    document
      .querySelectorAll(
        [
          "ytmusic-playlist-shelf-renderer #contents",
          "#contents.ytmusic-playlist-shelf-renderer",
          "ytmusic-shelf-renderer #contents",
          "ytmusic-section-list-renderer ytmusic-playlist-shelf-renderer #contents",
          "ytmusic-section-list-renderer ytmusic-shelf-renderer #contents"
        ].join(",")
      )
      .forEach((c) => containers.add(c));

    // Parents directs des lignes chanson
    document
      .querySelectorAll("ytmusic-responsive-list-item-renderer")
      .forEach((row) => {
        if (row.parentElement) containers.add(row.parentElement);
      });

    return [...containers];
  }

  function getRows(container) {
    return [...container.children].filter(isSongRow);
  }

  function containerHasPlayCounts(container) {
    const rows = getRows(container);
    if (rows.length < 2) return false;
    let withCount = 0;
    for (const r of rows) {
      if (extractPlayCountFromRow(r) >= 0) withCount++;
    }
    // Au moins la moitié ou ≥2 avec un compteur lisible
    return withCount >= 2 && withCount >= Math.min(2, Math.ceil(rows.length * 0.3));
  }

  function orderSignature(scored) {
    return scored.map((s) => `${getVideoId(s.el) || s.index}:${s.plays}`).join("|");
  }

  function isSortedDesc(scored) {
    let prev = Infinity;
    for (const s of scored) {
      const p = s.plays >= 0 ? s.plays : -1;
      if (p < 0) continue;
      if (p > prev) return false;
      prev = p;
    }
    return true;
  }

  function shouldSkipShelf(container) {
    const shelf = container.closest(
      "ytmusic-shelf-renderer, ytmusic-carousel-shelf-renderer"
    );
    if (!shelf) return false; // playlist-shelf principal : OK
    const header = shortTitle(
      shelf.querySelector(
        "h2, .title, #title, yt-formatted-string.title, .shelf-title"
      )?.textContent ||
        shelf.getAttribute("title") ||
        ""
    );
    if (!header) return false;
    // Ne pas trier les carrousels hors chansons
    if (SKIP_SHELF_RE.test(header)) return true;
    return false;
  }

  function sortContainer(container, force) {
    if (shouldSkipShelf(container)) return false;
    if (!force && !containerHasPlayCounts(container)) return false;

    const children = [...container.children];
    const rows = [];
    const others = [];
    for (const el of children) {
      if (isSongRow(el)) rows.push(el);
      else others.push(el);
    }
    if (rows.length < 2) return false;

    const scored = rows.map((el, index) => ({
      el,
      index,
      plays: extractPlayCountFromRow(el)
    }));

    const known = scored.filter((s) => s.plays >= 0);
    if (known.length < 2) return false;

    if (!force && isSortedDesc(scored)) {
      lastOrderSig = orderSignature(
        [...scored].sort((a, b) => {
          if (a.plays < 0 && b.plays < 0) return a.index - b.index;
          if (a.plays < 0) return 1;
          if (b.plays < 0) return -1;
          return b.plays - a.plays || a.index - b.index;
        })
      );
      return false;
    }

    scored.sort((a, b) => {
      if (a.plays < 0 && b.plays < 0) return a.index - b.index;
      if (a.plays < 0) return 1;
      if (b.plays < 0) return -1;
      if (b.plays !== a.plays) return b.plays - a.plays;
      return a.index - b.index;
    });

    const sig = orderSignature(scored);
    // Si le DOM a déjà le bon ordre, ne pas toucher (évite boucle avec observer)
    const currentSig = orderSignature(
      rows.map((el, index) => ({
        el,
        index,
        plays: extractPlayCountFromRow(el)
      }))
    );
    // currentSig uses pre-sort order of plays — compare id sequence
    const currentIds = rows.map((el) => getVideoId(el) || "").join("|");
    const targetIds = scored.map((s) => getVideoId(s.el) || "").join("|");
    if (!force && currentIds === targetIds && currentIds.length > 0) {
      lastOrderSig = sig;
      return false;
    }

    sorting = true;
    sortLockUntil = Date.now() + 400;
    try {
      // others (headers, continuity loaders) : garder en fin si non-lignes
      container.replaceChildren(...scored.map((s) => s.el), ...others);
      container.dataset.ytcSorted = "plays";
      document.documentElement.setAttribute("data-ytc-ytm-sort", "1");
      lastOrderSig = sig;
      applyCount += 1;
    } finally {
      setTimeout(() => {
        sorting = false;
      }, 120);
    }
    return true;
  }

  function ensureForceButton() {
    let btn = document.getElementById("ytc-ytm-sort-btn");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "ytc-ytm-sort-btn";
    btn.type = "button";
    btn.textContent = "▼ Lectures";
    btn.title =
      "YouTube Clean : forcer le tri par nombre de lectures (contourne le Trier natif YTM)";
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "88px",
      right: "16px",
      zIndex: "99999",
      background: "#ff0033",
      color: "#fff",
      border: "0",
      borderRadius: "999px",
      padding: "10px 14px",
      font: "600 12px/1 Segoe UI, system-ui, sans-serif",
      cursor: "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,.4)",
      opacity: "0.92"
    });
    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "0.92";
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const n = forceSortAll();
      flashBadge(
        n > 0 ? `Tri lectures OK (${n})` : "Aucun compteur de lectures trouvé"
      );
    });
    (document.body || document.documentElement).appendChild(btn);
    return btn;
  }

  function updateForceButtonVisibility() {
    const btn = ensureForceButton();
    const show =
      !!settings.sortYtmArtistByPlays &&
      isRelevantPage() &&
      document.querySelectorAll("ytmusic-responsive-list-item-renderer").length >= 2;
    btn.style.display = show ? "block" : "none";
  }

  function flashBadge(text) {
    let badge = document.getElementById("ytc-ytm-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "ytc-ytm-badge";
      Object.assign(badge.style, {
        position: "fixed",
        bottom: "140px",
        right: "16px",
        zIndex: "99999",
        background: "rgba(20,20,20,0.92)",
        color: "#3dd68c",
        font: "600 11px/1.3 Segoe UI, system-ui, sans-serif",
        padding: "8px 12px",
        borderRadius: "8px",
        border: "1px solid #2a2a2a",
        pointerEvents: "none",
        maxWidth: "240px"
      });
      document.documentElement.appendChild(badge);
    }
    badge.textContent = text;
    badge.style.opacity = "1";
    clearTimeout(badge._ytcT);
    badge._ytcT = setTimeout(() => {
      badge.style.transition = "opacity .4s";
      badge.style.opacity = "0";
      setTimeout(() => badge.remove(), 500);
    }, 2800);
  }

  function forceSortAll() {
    let did = 0;
    for (const container of findListContainers()) {
      if (sortContainer(container, true)) did += 1;
    }
    return did;
  }

  /**
   * Le menu « Trier » natif de YTM réordonne ensuite — on re-sweep après clic.
   */
  function hookNativeSortUi() {
    document.addEventListener(
      "click",
      (e) => {
        const t = e.target;
        if (!t || !t.closest) return;
        // Boutons / items de tri YTM (libellés FR/EN)
        const hit = t.closest(
          [
            "tp-yt-paper-listbox",
            "ytmusic-menu-navigation-item-renderer",
            "ytmusic-toggle-menu-service-item-renderer",
            "yt-dropdown-menu",
            "button",
            "[role='menuitem']",
            "[role='option']",
            "yt-formatted-string"
          ].join(",")
        );
        if (!hit) return;
        const label = shortTitle(hit.textContent || hit.getAttribute("aria-label") || "");
        if (
          /trier|sort|album|artiste|artist|titre|title|ajout|added|recent|manual|manuel|a\s*à\s*z|z\s*à\s*a|duration|durée/i.test(
            label
          ) &&
          label.length < 80
        ) {
          // Laisser YTM muter le DOM, puis forcer lectures par-dessus
          [200, 500, 1000, 2000, 3500].forEach((ms) =>
            setTimeout(() => {
              if (settings.sortYtmArtistByPlays) forceSortAll();
            }, ms)
          );
        }
      },
      true
    );
  }

  function sweep(force) {
    if (!settings.sortYtmArtistByPlays) {
      const btn = document.getElementById("ytc-ytm-sort-btn");
      if (btn) btn.style.display = "none";
      return;
    }
    if (sorting || Date.now() < sortLockUntil) return;
    if (!isRelevantPage()) {
      document.documentElement.removeAttribute("data-ytc-ytm-sort");
      updateForceButtonVisibility();
      return;
    }

    updateForceButtonVisibility();

    let did = false;
    for (const container of findListContainers()) {
      if (sortContainer(container, !!force)) did = true;
    }
    if (did && applyCount <= 3) {
      flashBadge("Tri : lectures ↓");
    }
  }

  function scheduleSweep(force) {
    if (sweepScheduled) return;
    if (sorting && !force) return;
    sweepScheduled = true;
    requestAnimationFrame(() => {
      sweepScheduled = false;
      try {
        sweep(force);
      } catch (e) {
        console.debug("[YouTube Clean YTM]", e);
      }
    });
  }

  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    lastOrderSig = "";
    applyCount = 0;
    document.documentElement.removeAttribute("data-ytc-ytm-sort");
    [100, 400, 900, 1800, 3500, 6000].forEach((ms) =>
      setTimeout(() => scheduleSweep(true), ms)
    );
  }

  function patchHistory() {
    const wrap = (type) => {
      const orig = history[type];
      return function (...args) {
        const r = orig.apply(this, args);
        window.dispatchEvent(new Event("ytc-ytm-location"));
        return r;
      };
    };
    history.pushState = wrap("pushState");
    history.replaceState = wrap("replaceState");
    window.addEventListener("popstate", () =>
      window.dispatchEvent(new Event("ytc-ytm-location"))
    );
    window.addEventListener("ytc-ytm-location", onUrlChange);
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (sorting || Date.now() < sortLockUntil) return;
      scheduleSweep(false);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    document.documentElement.setAttribute("data-ytc-ytm", VERSION);
    loadSettings(() => {
      patchHistory();
      hookNativeSortUi();
      startObserver();
      scheduleSweep(true);
      [300, 800, 1500, 3000, 5000, 8000, 12000].forEach((ms) =>
        setTimeout(() => scheduleSweep(true), ms)
      );
      // YTM lazy-load + bouton Trier qui re-render
      setInterval(() => scheduleSweep(false), 2000);
    });

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        if (changes.sortYtmArtistByPlays) {
          settings.sortYtmArtistByPlays = changes.sortYtmArtistByPlays.newValue;
          scheduleSweep(true);
        }
      });
    } catch {
      /* ignore */
    }
  }

  init();
})();
