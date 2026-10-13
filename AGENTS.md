# YouTube Clean contributor instructions

Keep ordinary YouTube videos visible when changing Shorts filters. Preserve the
documented defaults and keep the French and English guides consistent.

Before a release, inspect manifest permissions and resource paths, validate the
JavaScript, and build with `python tools/pack-release.py --output dist`.
Review the explicit package file list and scan both source and ZIP locally for
secrets, browser data, and personal information. Never use a personal browser
profile for testing or commit cookies, credentials, private notes, or backups.

Change the extension version only when the released behavior or package changes.
The project uses the existing MIT license. Do not add dependencies or change
permissions without documenting the reason.
