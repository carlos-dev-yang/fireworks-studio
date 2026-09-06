"""Extract palette masks for particle placement; source photographs are never loaded at runtime.

Usage: python scripts/prepare-character-art.py --hat <first.webp> --sheet <second.webp>
Requires Pillow. The masks retain silhouettes and enclosed white faces, omitting poster text.
"""
import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

RESOLUTION = 128
BACKGROUND_THRESHOLD = 165
BACKGROUND_CHROMA = 24
ALPHA_THRESHOLD = 128
SYMBOLS = "0123456789abcdefghijklmnopqrstuvwxyz"
POSTER_CROPS = {
    "helloKitty": (29, 171, 306, 377),
    "kuromi": (348, 177, 588, 377),
    "myMelody": (60, 471, 288, 704),
    "pompompurin": (316, 518, 619, 705),
    "cinnamoroll": (8, 900, 328, 1040),
    "pochacco": (359, 797, 633, 1040),
}
POSTER_COLORS = {
    "helloKitty": [0, 1, 2, 3], "kuromi": [0, 1, 4, 5, 9],
    "myMelody": [0, 1, 4, 5, 6, 11], "pompompurin": [0, 7, 8],
    "cinnamoroll": [1, 4, 10], "pochacco": [0, 1],
}
# The source leaves gaps at Pochacco's neck and hair. This face region closes only
# those gaps, without growing the ear/hair silhouette as generic morphology would.
POSTER_FACE_REGIONS = {
    "pochacco": [(378, 968), (380, 938), (393, 907), (405, 884), (426, 865),
                 (441, 862), (454, 865), (471, 863), (489, 863), (511, 873),
                 (533, 894), (548, 926), (556, 956), (559, 985), (552, 1009),
                 (531, 1022), (493, 1030), (441, 1029), (400, 1020),
                 (381, 1008), (372, 986)],
}
# Source palette -> luminous palette. Black ink becomes dim indigo so it can emit light.
HAT_PALETTE = [
    ((21, 0, 16), "#66418e"), ((0, 77, 128), "#27a9fa"),
    ((255, 251, 195), "#fff2a1"), ((239, 70, 155), "#ff4faa"),
    ((190, 170, 211), "#c7a0ff"), ((255, 255, 255), "#f0faff"),
    ((4, 117, 182), "#167edf"), ((41, 32, 31), "#5c4487"),
]
POSTER_PALETTE = [
    ((37, 28, 27), "#4e9fff"), ((255, 255, 255), "#e8f6ff"),
    ((233, 0, 37), "#ff315c"), ((255, 217, 0), "#ffe84d"),
    ((248, 181, 204), "#ff8bc5"), ((244, 135, 185), "#ff55b4"),
    ((190, 147, 86), "#ffc46f"), ((255, 249, 176), "#fff1a1"),
    ((109, 34, 43), "#c14972"), ((74, 61, 62), "#6c5ba3"),
    ((73, 188, 221), "#46cfff"), ((169, 228, 218), "#97ffe5"),
]


def artwork(image, palette, transparent, face_region=None):
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    outside = set()
    if transparent:
        outside = {(x, y) for y in range(height) for x in range(width) if pixels[x, y][3] < ALPHA_THRESHOLD}
    else:
        # Flood only the connected white background; keep enclosed white faces and highlights.
        background = Image.new("L", image.size)
        background.putdata([255 if min(pixels[x, y][:3]) >= BACKGROUND_THRESHOLD and max(pixels[x, y][:3]) - min(pixels[x, y][:3]) <= BACKGROUND_CHROMA else 0 for y in range(height) for x in range(width)])
        queue = deque([(x, y) for x in range(width) for y in (0, height - 1)] + [(x, y) for y in range(height) for x in (0, width - 1)])
        while queue:
            x, y = queue.popleft()
            if not (0 <= x < width and 0 <= y < height) or (x, y) in outside:
                continue
            if not background.getpixel((x, y)):
                continue
            outside.add((x, y))
            queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
        if face_region:
            face = Image.new("L", image.size)
            ImageDraw.Draw(face).polygon(face_region, fill=255)
            outside = {(x, y) for x, y in outside if not face.getpixel((x, y))}
    mask = Image.new("RGBA", image.size)
    mask.putdata([pixels[x, y] if (x, y) not in outside else (0, 0, 0, 0) for y in range(height) for x in range(width)])
    bounds = mask.getbbox()
    mask = mask.crop(bounds)
    mask.thumbnail((RESOLUTION, RESOLUTION), Image.Resampling.LANCZOS)
    width, height = mask.size
    rows = []
    for y in range(height):
        row = ""
        for x in range(width):
            *rgb, alpha = mask.getpixel((x, y))
            if alpha < ALPHA_THRESHOLD:
                row += "."
            else:
                index = min(range(len(palette)), key=lambda i: sum((rgb[channel] - palette[i][0][channel]) ** 2 for channel in range(3)))
                row += SYMBOLS[index]
        rows.append(row)
    return {"palette": [color for _, color in palette], "rows": rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hat", type=Path, required=True)
    parser.add_argument("--sheet", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "src/domain/character-art.json")
    args = parser.parse_args()
    result = {"heartHat": artwork(Image.open(args.hat), HAT_PALETTE, True)}
    sheet = Image.open(args.sheet)
    for key, crop in POSTER_CROPS.items():
        face = [(x - crop[0], y - crop[1]) for x, y in POSTER_FACE_REGIONS.get(key, [])]
        result[key] = artwork(sheet.crop(crop), [POSTER_PALETTE[index] for index in POSTER_COLORS[key]], False, face)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Prepared {len(result)} character masks at {args.output}")


if __name__ == "__main__":
    main()
