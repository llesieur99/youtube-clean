/**
 * YouTube Clean — masque Shorts + Jeux integres (Playables)
 *
 * Important : ne jamais masquer un ytd-item-section-renderer entier
 * sur /results. YouTube met les vrais resultats + Shorts/Playables
 * dans le meme bloc ; le cacher vide la page et ne laisse que des
 * suggestions peu pertinentes.
 */
(() => {
  "use strict";

  const VERSION = "1.4.2";

  const DEFAULTS = {
    hideShorts: true,
    hidePlayables: true,
    redirectPlayables: true,
    redirectShorts: false
  };

  // Titres de shelves / menu seulement — pas "game" / "jeux" dans un titre video
  const PLAYABLES_RE =
    /playables?|jeux\s*int[eé]gr[eé]s?|mini[\s-]?jeux|youtube\s*games?/i;
  const PLAYABLES_EXACT_RE = /^(jeux|games?|playables?)$/i;
  const SHORTS_RE = /^\s*shorts?\s*$/i;
  const SHORTS_HEADER_RE =
    /^\s*shorts?\s*$|short\s*r[eé]cemment|recently uploaded shorts|shorts remix/i;

  const SHORTS_LOCKUP_SEL = [
    "ytm-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model-v2",
    ".shortsLockupViewModelHost",
    "ytd-reel-item-renderer",
    "[overlay-style='SHORTS']"
  ].join(",");

  const SECTION_SEL = [
    "ytd-rich-section-renderer",
    "ytd-item-section-renderer",
    "ytm-rich-section-renderer",
    "ytd-rich-shelf-renderer",
    "ytd-shelf-renderer",
    "grid-shelf-view-model",
    "ytd-guide-entry-renderer",
    "ytd-mini-guide-entry-renderer"
  ].join(",");

  const ITEM_SEL =
    "ytd-rich-item-renderer, ytm-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, ytd-reel-item-renderer";

  let settings = { ...DEFAULTS };
  let lastUrl = location.href;
  let sweepScheduled = false;
  let observer = null;

  const FORCE_CSS = `
html.ytc-active #ytc-debug-badge { display:none !important; }

html.ytc-hide-playables mini-game-card-view-model,
html.ytc-hide-playables .yt-mini-game-card-view-model,
html.ytc-hide-playables [class*="yt-mini-game-card"],
html.ytc-hide-playables [class*="MiniGameCard"],
html.ytc-hide-playables ytd-rich-item-renderer:has(mini-game-card-view-model),
html.ytc-hide-playables ytd-rich-item-renderer:has([class*="yt-mini-game-card"]),
html.ytc-hide-playables ytd-rich-section-renderer:has(mini-game-card-view-model),
html.ytc-hide-playables ytd-rich-section-renderer:has([class*="yt-mini-game-card"]),
html.ytc-hide-playables ytd-rich-shelf-renderer:has(mini-game-card-view-model),
html.ytc-hide-playables grid-shelf-view-model:has(mini-game-card-view-model),
html.ytc-hide-playables ytd-rich-section-renderer:has(a[href*="playables"]),
html.ytc-hide-playables ytd-rich-item-renderer:has(a[href*="playables"]),
html.ytc-hide-playables ytd-guide-entry-renderer:has(a[href*="playables"]),
html.ytc-hide-playables ytd-mini-guide-entry-renderer:has(a[href*="playables"]) {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

html.ytc-hide-shorts ytd-reel-shelf-renderer,
html.ytc-hide-shorts ytm-reel-shelf-renderer,
html.ytc-hide-shorts ytm-shorts-lockup-view-model,
html.ytc-hide-shorts ytm-shorts-lockup-view-model-v2,
html.ytc-hide-shorts .shortsLockupViewModelHost,
html.ytc-hide-shorts ytd-rich-shelf-renderer[is-shorts],
html.ytc-hide-shorts grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
html.ytc-hide-shorts grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2),
html.ytc-hide-shorts grid-shelf-view-model:has(.shortsLockupViewModelHost),
html.ytc-hide-shorts ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
html.ytc-hide-shorts ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
html.ytc-hide-shorts ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model),
html.ytc-hide-shorts ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model-v2),
html.ytc-hide-shorts ytd-rich-section-renderer:has(.shortsLockupViewModelHost),
html.ytc-hide-shorts ytd-rich-shelf-renderer:has(.shortsLockupViewModelHost),
html.ytc-hide-shorts ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model),
html.ytc-hide-shorts ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model-v2),
html.ytc-hide-shorts ytd-rich-item-renderer:has([overlay-style="SHORTS"]),
html.ytc-hide-shorts ytd-video-renderer:has([overlay-style="SHORTS"]),
html.ytc-hide-shorts ytd-compact-video-renderer:has([overlay-style="SHORTS"]),
html.ytc-hide-shorts yt-lockup-view-model:has([overlay-style="SHORTS"]),
html.ytc-hide-shorts ytd-guide-entry-renderer:has(a[href="/shorts"]),
html.ytc-hide-shorts ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
html.ytc-hide-shorts ytd-rich-item-renderer:has(a[href^="/shorts/"]):not(:has(a[href^="/watch"])) {
  display: none !important;
}
`;

  function isSearchPage() {
    return (location.pathname || "").startsWith("/results");
  }

  function ensureStyle() {
    let el = document.getElementById("ytc-force-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "ytc-force-style";
      el.textContent = FORCE_CSS;
      (document.documentElement || document.head).appendChild(el);
    }
    document.documentElement.setAttribute("data-ytc", VERSION);
    document.documentElement.classList.add("ytc-active");
  }

  function applyClasses() {
    ensureStyle();
    const root = document.documentElement;
    root.classList.toggle("ytc-hide-shorts", !!settings.hideShorts);
    root.classList.toggle("ytc-hide-playables", !!settings.hidePlayables);
    if (document.body) {
      document.body.classList.toggle("ytc-hide-shorts", !!settings.hideShorts);
      document.body.classList.toggle("ytc-hide-playables", !!settings.hidePlayables);
    }
  }

  function loadSettings(cb) {
    try {
      chrome.storage.sync.get(DEFAULTS, (items) => {
        settings = { ...DEFAULTS, ...items };
        applyClasses();
        cb && cb();
      });
    } catch {
      settings = { ...DEFAULTS };
      applyClasses();
      cb && cb();
    }
  }

  function maybeRedirect() {
    const path = location.pathname || "";
    if (settings.redirectPlayables && /\/playables(\/|$)/i.test(path)) {
      location.replace("https://www.youtube.com/");
      return true;
    }
    if (settings.redirectShorts && /\/shorts(\/|$)/i.test(path)) {
      const m = path.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      location.replace(m ? `https://www.youtube.com/watch?v=${m[1]}` : "https://www.youtube.com/");
      return true;
    }
    return false;
  }

  function hardHide(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.dataset.ytcHidden === "1") return;
    el.dataset.ytcHidden = "1";
    el.setAttribute("hidden", "");
    el.setAttribute("aria-hidden", "true");
    try {
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("max-height", "0", "important");
      el.style.setProperty("margin", "0", "important");
      el.style.setProperty("padding", "0", "important");
      el.style.setProperty("overflow", "hidden", "important");
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
      el.style.setProperty("position", "absolute", "important");
      el.style.setProperty("left", "-99999px", "important");
    } catch {
      /* ignore */
    }
  }

  function isShortsLockup(el) {
    if (!el || el.nodeType !== 1) return false;
    return !!el.querySelector(SHORTS_LOCKUP_SEL);
  }

  function hasLongFormVideoItem(section) {
    if (!section) return false;
    if (
      section.querySelector(
        "ytd-video-renderer, ytd-playlist-renderer, ytd-channel-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer"
      )
    ) {
      return true;
    }
    const items = section.querySelectorAll("ytd-rich-item-renderer");
    for (const item of items) {
      if (isShortsLockup(item)) continue;
      if (item.querySelector("a[href^='/watch'], a[href*='/watch?']")) return true;
    }
    return false;
  }

  function hasRegularWatchContent(section) {
    return hasLongFormVideoItem(section);
  }

  function canHideWholeSection(section) {
    if (!section) return false;
    if (section.matches("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer")) {
      return true;
    }
    if (isSearchPage() && section.matches("ytd-item-section-renderer")) {
      return !hasRegularWatchContent(section);
    }
    if (section.matches("ytd-item-section-renderer") && hasRegularWatchContent(section)) {
      return false;
    }
    return true;
  }

  function hideSectionOf(el) {
    if (!el) return;
    const section = el.closest(SECTION_SEL);
    if (section && canHideWholeSection(section)) {
      hardHide(section);
    }
    const item = el.closest(ITEM_SEL);
    if (item && item !== section) hardHide(item);
    if (!section && !item) hardHide(el);
  }

  function shortTitle(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function isPlayablesTitle(text) {
    const t = shortTitle(text);
    if (!t || t.length > 48) return false;
    if (/jeux\s*vid/i.test(t)) return false;
    return PLAYABLES_EXACT_RE.test(t) || PLAYABLES_RE.test(t);
  }

  function getHeaderText(section) {
    const sels = [
      "#title",
      "#title-text",
      "#rich-shelf-header #title",
      "#rich-shelf-header yt-formatted-string",
      "h2",
      "h3",
      "span#title",
      "a#title-text",
      "yt-formatted-string#title",
      "#dismissible #title",
      ".ytShelfHeaderViewModelTitle",
      ".yt-shelf-header-layout__title",
      "h2.yt-shelf-header-layout__title span",
      "[class*='ShelfHeader']"
    ];
    for (const sel of sels) {
      const el = section.querySelector(sel);
      if (!el) continue;
      const t = shortTitle(el.textContent);
      if (t && t.length <= 48) return t;
    }
    const header = section.querySelector(
      "#rich-shelf-header, #title-container, [id*='shelf-header'], header"
    );
    if (header) {
      const t = shortTitle(header.textContent);
      if (t && t.length <= 48) return t;
    }
    return "";
  }

  function itemPrimaryHref(item) {
    const sels = [
      "a#video-title",
      "a#video-title-link",
      "a#thumbnail[href]",
      "a.yt-lockup-metadata-view-model__title[href]",
      "h3 a[href]",
      "a.yt-simple-endpoint[href^='/watch']",
      "a.yt-simple-endpoint[href^='/shorts/']",
      "a[href^='/watch']",
      "a[href^='/shorts/']"
    ];
    for (const sel of sels) {
      const a = item.querySelector(sel);
      const h = a && a.getAttribute("href");
      if (h) return h;
    }
    return "";
  }

  function isPrimarilyShorts(item) {
    if (!item) return false;
    if (item.hasAttribute("is-shorts")) return true;
    if (item.matches && item.matches(SHORTS_LOCKUP_SEL)) return true;
    if (item.classList && item.classList.contains("shortsLockupViewModelHost")) return true;
    if (item.querySelector(":scope > .shortsLockupViewModelHost")) return true;
    if (item.querySelector("ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, [overlay-style='SHORTS']")) {
      return true;
    }
    const primary = itemPrimaryHref(item);
    if (/\/shorts\//.test(primary)) return true;
    const hrefs = [...item.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") || "");
    const hasWatch = hrefs.some((h) => /\/watch(\?|$)/.test(h) || /[?&]v=/.test(h));
    const hasShorts = hrefs.some((h) => /\/shorts\//.test(h));
    return hasShorts && !hasWatch;
  }

  function isDedicatedShortsShelf(section) {
    if (!section) return false;
    if (section.matches("ytd-reel-shelf-renderer, ytm-reel-shelf-renderer")) return true;
    if (section.matches("ytd-rich-shelf-renderer[is-shorts], grid-shelf-view-model")) {
      if (section.querySelector(SHORTS_LOCKUP_SEL + ", a[href^='/shorts/']")) return true;
    }
    if (section.hasAttribute && section.hasAttribute("is-shorts")) return true;
    const title = getHeaderText(section);
    if (SHORTS_HEADER_RE.test(title) || SHORTS_RE.test(title)) return true;
    const hasShortsUi = section.querySelector(
      "ytd-reel-shelf-renderer, ytm-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, [is-shorts], .shortsLockupViewModelHost"
    );
    return !!(hasShortsUi && !hasLongFormVideoItem(section));
  }

  function isDedicatedPlayablesShelf(section) {
    if (!section) return false;
    const title = getHeaderText(section);
    if (isPlayablesTitle(title)) return true;
    const hasGameUi = section.querySelector(
      "mini-game-card-view-model, [class*='yt-mini-game-card'], game-card-view-model, ytg-game-card, a[href*='playables']"
    );
    return !!(hasGameUi && !hasRegularWatchContent(section));
  }

  function hidePlayables() {
    if (!settings.hidePlayables) return;

    document
      .querySelectorAll(
        [
          "mini-game-card-view-model",
          ".yt-mini-game-card-view-model",
          "[class*='yt-mini-game-card']",
          "[class*='MiniGameCard']",
          "[class*='mini-game-card']",
          "ytg-game-card",
          "game-card-view-model"
        ].join(",")
      )
      .forEach((n) => {
        hardHide(n);
        const item = n.closest(ITEM_SEL);
        if (item) hardHide(item);
        const section = n.closest(SECTION_SEL);
        if (section && isDedicatedPlayablesShelf(section) && canHideWholeSection(section)) {
          hardHide(section);
        }
      });

    document.querySelectorAll('a[href*="playables"], a[href*="/playables"]').forEach((a) => {
      hideSectionOf(a);
      hardHide(
        a.closest(
          "ytd-rich-item-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, yt-lockup-view-model, tp-yt-paper-item"
        ) || a
      );
    });

    document
      .querySelectorAll(
        "ytd-rich-section-renderer, ytd-item-section-renderer, ytm-rich-section-renderer, ytd-rich-shelf-renderer, ytd-shelf-renderer, grid-shelf-view-model"
      )
      .forEach((section) => {
        if (section.dataset.ytcHidden === "1") return;
        if (!isDedicatedPlayablesShelf(section)) return;
        if (!canHideWholeSection(section)) return;
        hardHide(section);
      });

    document
      .querySelectorAll(
        "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer, ytd-pivot-bar-item-renderer"
      )
      .forEach((node) => {
        const a = node.querySelector("a") || node;
        const href = (a.getAttribute && a.getAttribute("href")) || "";
        const label = shortTitle(
          node.getAttribute("aria-label") ||
            a.getAttribute?.("title") ||
            a.getAttribute?.("aria-label") ||
            node.textContent
        ).slice(0, 40);
        if (/playables/i.test(href) || isPlayablesTitle(label)) {
          hardHide(node);
        }
      });

    if (isSearchPage()) return;

    try {
      const roots = [
        document.querySelector("ytd-rich-grid-renderer #contents"),
        document.querySelector("ytd-browse #contents"),
        document.querySelector("#contents.ytd-rich-grid-renderer")
      ].filter(Boolean);

      const seen = new Set();
      for (const root of roots) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const v = shortTitle(node.nodeValue);
            if (!v || v.length > 40) return NodeFilter.FILTER_REJECT;
            if (!isPlayablesTitle(v)) return NodeFilter.FILTER_SKIP;
            const el = node.parentElement;
            if (!el) return NodeFilter.FILTER_SKIP;
            if (
              el.closest(
                "h1, h2, h3, #title, #rich-shelf-header, [id*='shelf-header'], .ytShelfHeaderViewModelTitle, ytd-guide-entry-renderer"
              )
            ) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        });
        let n;
        let count = 0;
        while ((n = walker.nextNode()) && count < 40) {
          count++;
          const el = n.parentElement;
          if (!el || seen.has(el)) continue;
          seen.add(el);
          const section = el.closest(
            "ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-shelf-renderer, ytm-rich-section-renderer, grid-shelf-view-model"
          );
          if (section && canHideWholeSection(section) && isDedicatedPlayablesShelf(section)) {
            hardHide(section);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  function hideShorts() {
    if (!settings.hideShorts) return;

    document.querySelectorAll("ytd-reel-shelf-renderer, ytm-reel-shelf-renderer").forEach(hardHide);

    document.querySelectorAll(SHORTS_LOCKUP_SEL).forEach((n) => {
      hardHide(n);
      const item = n.closest(ITEM_SEL);
      if (item) hardHide(item);
      const shelf = n.closest("grid-shelf-view-model, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer");
      if (shelf) hardHide(shelf);
    });

    document.querySelectorAll("grid-shelf-view-model, ytd-rich-shelf-renderer[is-shorts]").forEach((el) => {
      if (el.querySelector(SHORTS_LOCKUP_SEL + ", a[href^='/shorts/']") || el.hasAttribute("is-shorts")) {
        hardHide(el);
        const parent = el.closest("ytd-rich-section-renderer, ytm-rich-section-renderer");
        if (parent && !hasLongFormVideoItem(parent)) hardHide(parent);
      }
    });

    document
      .querySelectorAll(
        "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer"
      )
      .forEach((node) => {
        const a = node.querySelector("a");
        const href = a?.getAttribute("href") || "";
        const label = shortTitle(node.getAttribute("aria-label") || node.textContent).slice(0, 20);
        if (href.startsWith("/shorts") || SHORTS_RE.test(label) || /^shorts$/i.test(label)) {
          hardHide(node);
        }
      });

    document
      .querySelectorAll("yt-chip-cloud-chip-renderer, ytm-chip-cloud-chip-renderer")
      .forEach((chip) => {
        const label = shortTitle(chip.getAttribute("aria-label") || chip.textContent).slice(0, 20);
        if (SHORTS_RE.test(label)) hardHide(chip);
      });

    document
      .querySelectorAll(
        "ytd-rich-section-renderer, ytd-item-section-renderer, ytd-rich-shelf-renderer, grid-shelf-view-model"
      )
      .forEach((section) => {
        if (section.dataset.ytcHidden === "1") return;
        if (!isDedicatedShortsShelf(section)) return;
        if (!canHideWholeSection(section)) return;
        hardHide(section);
      });

    document.querySelectorAll(ITEM_SEL).forEach((item) => {
      if (isPrimarilyShorts(item)) hardHide(item);
    });
  }

  function sweep() {
    if (maybeRedirect()) return;
    applyClasses();
    try {
      hidePlayables();
      hideShorts();
    } catch (e) {
      console.debug("[YouTube Clean]", e);
    }
  }

  function scheduleSweep() {
    if (sweepScheduled) return;
    sweepScheduled = true;
    requestAnimationFrame(() => {
      sweepScheduled = false;
      sweep();
    });
  }

  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    [50, 300, 800, 1500, 3000].forEach((ms) => setTimeout(sweep, ms));
  }

  function patchHistory() {
    const wrap = (type) => {
      const orig = history[type];
      return function (...args) {
        const r = orig.apply(this, args);
        window.dispatchEvent(new Event("ytc-location"));
        return r;
      };
    };
    history.pushState = wrap("pushState");
    history.replaceState = wrap("replaceState");
    window.addEventListener("popstate", () => window.dispatchEvent(new Event("ytc-location")));
    window.addEventListener("ytc-location", onUrlChange);
    document.addEventListener("yt-navigate-finish", () => {
      lastUrl = "";
      onUrlChange();
    });
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => scheduleSweep());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    ensureStyle();
    applyClasses();
    loadSettings(() => {
      maybeRedirect();
      applyClasses();
      patchHistory();
      startObserver();
      sweep();
      [100, 300, 600, 1200, 2500, 5000, 10000].forEach((ms) => setTimeout(sweep, ms));
      setInterval(sweep, 2000);
    });

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        for (const k of Object.keys(DEFAULTS)) {
          if (changes[k]) settings[k] = changes[k].newValue;
        }
        applyClasses();
        sweep();
      });
    } catch {
      /* ignore */
    }
  }

  init();
})();
