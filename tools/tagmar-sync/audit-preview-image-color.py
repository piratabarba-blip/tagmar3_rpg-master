import json
import os
import sys
from pathlib import Path
from urllib.parse import unquote

from PIL import Image, ImageStat


root = Path(__file__).resolve().parents[2]
cache = root / ".cache" / "tagmar-sync"
system_root = Path(os.environ.get("LOCALAPPDATA", "")) / "FoundryVTT" / "Data" / "systems" / "tagmar_rpg"
references = {}

for source in cache.glob("preview-*.json"):
    if any(part in source.name for part in ("folders", "documents", "pages", "creatur")):
        continue
    try:
        documents = json.loads(source.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        continue
    for document in documents if isinstance(documents, list) else []:
        image = str(document.get("img") or "")
        prefix = "systems/tagmar_rpg/"
        if not image.startswith(prefix):
            continue
        path = system_root / Path(unquote(image[len(prefix):]).replace("/", os.sep))
        references.setdefault(path, []).append({"file": source.name, "name": document.get("name", "")})

results = []
for path, used_by in references.items():
    result = {"path": str(path), "exists": path.is_file(), "usedBy": used_by}
    if path.is_file():
        try:
            with Image.open(path) as image:
                image.thumbnail((192, 192))
                rgba = image.convert("RGBA")
                pixels = [(r, g, b) for r, g, b, a in rgba.getdata() if a > 24]
                if pixels:
                    chroma = [max(pixel) - min(pixel) for pixel in pixels]
                    result["nearGrayRatio"] = round(sum(value <= 8 for value in chroma) / len(chroma), 4)
                    result["meanChroma"] = round(sum(chroma) / len(chroma), 2)
                    result["monochrome"] = result["nearGrayRatio"] >= 0.92 and result["meanChroma"] <= 10
                else:
                    result["monochrome"] = False
        except Exception as error:
            result["error"] = str(error)
    results.append(result)

summary = {
    "referencedSystemImages": len(results),
    "missing": sum(not result["exists"] for result in results),
    "monochrome": sum(bool(result.get("monochrome")) for result in results),
    "candidates": [result for result in results if result.get("monochrome") or not result["exists"]],
}
json.dump(summary, sys.stdout, ensure_ascii=False, indent=2)
print()
