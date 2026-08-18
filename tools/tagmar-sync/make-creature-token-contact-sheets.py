import csv
import json
import os
from pathlib import Path
from urllib.parse import unquote

from PIL import Image, ImageDraw, ImageFont


root = Path(__file__).resolve().parents[2]
plan = root / ".cache" / "tagmar-sync" / "creatures" / "token-family-plan.csv"
output = root / ".cache" / "tagmar-sync" / "creatures" / "contact-sheets"
system_root = Path(os.environ["LOCALAPPDATA"]) / "FoundryVTT" / "Data" / "systems" / "tagmar_rpg"
output.mkdir(parents=True, exist_ok=True)

with plan.open(encoding="utf-8-sig", newline="") as stream:
    rows = [row for row in csv.DictReader(stream) if row.get("Completed") != "True"]

font = ImageFont.load_default(size=15)
index = []
for sheet_number, start in enumerate(range(0, len(rows), 20), 1):
    subset = rows[start:start + 20]
    sheet = Image.new("RGB", (1200, 1000), "#202124")
    draw = ImageDraw.Draw(sheet)
    for position, row in enumerate(subset):
        number = start + position + 1
        column, line = position % 4, position // 4
        x, y = column * 300, line * 200
        original = row.get("Original", "")
        relative = original.removeprefix("systems/tagmar_rpg/")
        path = system_root / Path(unquote(relative).replace("/", os.sep)) if relative else None
        draw.rectangle((x + 4, y + 4, x + 296, y + 196), outline="#666", width=1)
        if path and path.is_file():
            with Image.open(path) as source:
                image = source.convert("RGBA")
                image.thumbnail((180, 145))
                backdrop = Image.new("RGBA", image.size, "#34363a")
                backdrop.alpha_composite(image)
                sheet.paste(backdrop.convert("RGB"), (x + 8 + (180 - image.width) // 2, y + 8 + (145 - image.height) // 2))
        else:
            draw.text((x + 15, y + 60), "SEM ARQUIVO", fill="#ff7777", font=font)
        names = row.get("Names", "")
        label = names[:36] + ("..." if len(names) > 36 else "")
        draw.text((x + 194, y + 12), f"#{number}", fill="#ffd166", font=font)
        draw.multiline_text((x + 194, y + 38), label.replace(" | ", "\n", 2), fill="white", font=font, spacing=3)
        index.append({"number": number, **row, "resolvedPath": str(path) if path else ""})
    sheet.save(output / f"creature-families-{sheet_number:02d}.jpg", quality=90)

(output / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"families": len(rows), "sheets": (len(rows) + 19) // 20, "output": str(output)}, ensure_ascii=False))
