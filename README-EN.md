# YouTube Clean 1.4.2

Free extension for desktop Chromium browsers: Chrome, Edge, Brave and Opera. The extension's settings interface is in French. This Manifest V3 package is not provided for Firefox, Safari, mobile browsers or the YouTube apps.

## Features

- Hides recognized Shorts and Playables elements on YouTube, with safeguards for ordinary videos in search results.
- Redirects Playables pages to the home page (on by default).
- Optionally opens Shorts in the standard video player (off by default).
- Visually sorts YouTube Music songs by descending play count on artist pages and playlists when counts are available in the page. At least two readable counts are required. The “▼ Lectures” button reapplies sorting; unloaded items cannot be sorted. This does not change a saved playlist or guarantee playback order.

Shorts hiding, Playables hiding and Music sorting are on by default. Toggle each setting through the extension icon. “Appliquer” reloads the active YouTube / Music tab. To show hidden elements again, turn off the option and reload the page.

## Manual installation

1. Download the ZIP from https://le-sieur.ca/en/youtube-clean/ and extract it into a folder you will keep.
2. Copy your browser's extensions address into its address bar:
   - Chrome: chrome://extensions
   - Edge: edge://extensions
   - Brave: brave://extensions
   - Opera: opera://extensions
3. Enable “Developer mode”.
4. Click “Load unpacked”. Select the YouTube-Clean-v1.4.2 folder containing manifest.json directly, not the unopened ZIP.
5. Open or reload YouTube / YouTube Music. Optionally pin the extension and open its icon to adjust settings.

Clicking the website button downloads the ZIP; it does not install the extension automatically. No store listing is required. If your organization manages your browser and blocks developer mode, respect that restriction. Keep the extracted folder in place.

## Data and permissions

The extension reads and changes the youtube.com and music.youtube.com pages listed in its manifest. “storage” saves preferences through chrome.storage.sync: your browser may synchronize them if browser sync is enabled. “activeTab” is used by the active-tab reload button. The code contains no analytics service, creator-operated server or browsing-history transmission to the creator. No Le Sieur account or payment is required.

## Limitations, updates and removal

Changes to YouTube's interface may affect hiding and sorting. This is not an ad blocker. Sorting uses data already present in the page without calling a YouTube API. This package has no automatic updater: download a new version when available and reload it from the extensions page. To uninstall, use “Remove” on that page.

Independent project, not affiliated with YouTube or Google. Free distribution under the MIT license (see LICENSE), without warranty.

Main project guide: [README.md](README.md).
