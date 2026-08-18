from collections import deque
from pathlib import Path
from PIL import Image
import json


ROOT = Path(__file__).resolve().parents[2]
TOKEN_ROOT = ROOT / "assets" / "tokens" / "gerados-piloto"


def extract_checkerboard(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    queue = deque()
    visited = set()

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return min(red, green, blue) >= 225 and max(red, green, blue) - min(red, green, blue) <= 14

    for x in range(width):
        for y in (0, height - 1):
            if is_background(x, y):
                queue.append((x, y))
                visited.add((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_background(x, y):
                queue.append((x, y))
                visited.add((x, y))

    while queue:
        x, y = queue.popleft()
        for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            nx, ny = neighbor
            if 0 <= nx < width and 0 <= ny < height and neighbor not in visited and is_background(nx, ny):
                visited.add(neighbor)
                queue.append(neighbor)

    for x, y in visited:
        pixels[x, y] = (0, 0, 0, 0)
    image.save(destination, optimize=True)


def fit_token(source: Path, destination: Path) -> dict:
    image = Image.open(source).convert("RGBA")
    if image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"Transparência inválida: {source}")
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((512 - image.width) // 2, (512 - image.height) // 2))
    canvas.save(destination, optimize=True)
    return {
        "file": destination.name,
        "size": canvas.size,
        "mode": canvas.mode,
        "alpha": canvas.getchannel("A").getextrema(),
        "bytes": destination.stat().st_size,
    }


extract_checkerboard(
    TOKEN_ROOT / "abominacao-maior-topdown-raw.png",
    TOKEN_ROOT / "abominacao-maior-topdown-master.png",
)

stems = (
    "dragao-do-fogo-adulto",
    "arvore-animada-grande",
    "abominacao-maior",
    "fada",
    "elemental-agua-forte",
)
report = [
    fit_token(TOKEN_ROOT / f"{stem}-topdown-master.png", TOKEN_ROOT / f"{stem}-topdown-512.png")
    for stem in stems
]
print(json.dumps(report, indent=2))
