"""Rasterize TaskFlow's deliberately simple SVG using local Pillow (build tool only).

Run: python scripts/generate-icons.py
The source uses M/L path commands, round strokes, and one rounded background rect.
No image-generation service, browser, or application runtime dependency is needed.
"""

from pathlib import Path
import re
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SVG = ET.parse(PUBLIC / "favicon.svg").getroot()
SCALE = 8


def rasterize(size, maskable=False):
    factor = size * SCALE / 64
    image = Image.new("RGBA", (size * SCALE, size * SCALE), (0, 0, 0, 0))
    for element in SVG:
        attrs = element.attrib
        tag = element.tag.split("}")[-1]
        if tag == "rect":
            draw = ImageDraw.Draw(image)
            draw.rounded_rectangle(
                (0, 0, size * SCALE, size * SCALE),
                radius=0 if maskable else float(attrs["rx"]) * factor,
                fill=attrs["fill"],
            )
        elif tag == "path":
            layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(layer)
            width = float(attrs["stroke-width"]) * factor
            alpha = round(float(attrs.get("opacity", "1")) * 255)
            color = (*bytes.fromhex(attrs["stroke"].lstrip("#")), alpha)
            for subpath in re.findall(r"M([^M]+)", attrs["d"]):
                points = [
                    (float(x) * factor, float(y) * factor)
                    for x, y in re.findall(r"([\d.]+)[ ,]+([\d.]+)", subpath.replace("L", " "))
                ]
                draw.line(points, fill=color, width=round(width), joint="curve")
                for x, y in points:
                    radius = width / 2
                    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
            image = Image.alpha_composite(image, layer)
    return image.resize((size, size), Image.Resampling.LANCZOS)


for name, size, maskable in [
    ("apple-touch-icon.png", 180, False),
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
]:
    rasterize(size, maskable).save(PUBLIC / name)
    print(f"Generated {name}: {size} x {size}")

rasterize(64).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)])
print("Generated favicon.ico: 16, 24, 32, 48, 64px")
