from pathlib import Path
import argparse, hashlib, json, zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ["manifest.json", "background.js", "content.js", "content-music.js", "content.css", "popup.html", "popup.js", "popup.css", "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png", "_locales/fr/messages.json", "_locales/en/messages.json", "LICENSE", "README.md", "README-EN.md"]

def build(output):
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    assert manifest["manifest_version"] == 3
    refs = set(manifest["icons"].values()) | {manifest["background"]["service_worker"], manifest["action"]["default_popup"]}
    refs.update(manifest["action"]["default_icon"].values())
    for script in manifest["content_scripts"]:
        refs.update(script.get("js", [])); refs.update(script.get("css", []))
    for resource in manifest.get("web_accessible_resources", []): refs.update(resource["resources"])
    assert refs.issubset(FILES)
    output.mkdir(parents=True, exist_ok=True)
    filename = f"YouTube-Clean-v{version}.zip"
    target = output / filename
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for relative in sorted(FILES):
            data = (ROOT / relative).read_bytes()
            info = zipfile.ZipInfo(f"YouTube-Clean-v{version}/{relative}", (2026, 10, 13, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    (output / (filename + ".sha256")).write_text(f"{digest}  {filename}\n", encoding="ascii")
    print(f"{filename}: {len(FILES)} files, {target.stat().st_size} bytes, SHA-256 {digest}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build a clean, deterministic public extension ZIP")
    parser.add_argument("--output", required=True, type=Path)
    build(parser.parse_args().output)
