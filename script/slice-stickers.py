"""
Slice assets/stickers.png (the Zomato iMessage pack, 3x2 on a white sheet) into
individual transparent PNGs for the hero.

The white is knocked out with a flood fill from the sheet's border rather than a
global threshold: three of the six stickers sit on their own light card (an
off-white square, a lavender blob, a yellow rounded square) and a global
"remove everything near white" pass would eat those cards along with the gutter.
A fill that only travels through connected near-white stops at each card's edge.

Edge pixels are un-premultiplied off white, so a line that was antialiased
against the sheet gets its own ink back instead of staying milky over a dark
background.
"""

import os
from collections import deque

from PIL import Image

SRC = "assets/stickers.png"
OUT = "assets/stickers"
COLS, ROWS = 3, 2

# How far from white still counts as background the fill may travel through.
# Anything further from white than this is card or ink and stops the fill.
#
# This is deliberately tight. Two stickers sit on a card the fill must NOT enter
# — the date sticker's lavender blob is only 16 off white — so the band has to
# stop short of that. The cost is a narrow feather on ink edges, which is a
# faint LIGHT fringe and therefore invisible against the hero's white panel.
# The lettuce sticker's card is 3 off white, i.e. indistinguishable from the
# sheet itself, so it goes with the gutter and that sticker ends up art-only.
TOLERANCE = 14
# Below this the pixel is white as far as anyone can tell, so it is dropped
# outright. Without the floor, a card that is a hair off white gets a low alpha
# and un-premultiplies into a dark tint — which is exactly how the lettuce
# sticker's card first came back as a grey square.
FLOOR = 6
# Transparent margin left around each sticker, in source pixels.
PAD = 6
# Longest edge of the exported sticker. They render at ~90-190px on screen, so
# this is a 2x retina cap.
MAX_EDGE = 400

TILES = [
    (0, 0, "nacho"),
    (1, 0, "lettuce-party"),
    (2, 0, "nuts"),
    (0, 1, "sup-dog"),
    (1, 1, "is-this-a-date"),
    (2, 1, "espresso"),
]


def knockout_white(im):
    """Flood white away from the sheet border, leaving a soft antialiased edge."""
    w, h = im.size
    px = im.load()

    # alpha[i] is None until the fill reaches that pixel.
    seen = bytearray(w * h)
    queue = deque()

    for x in range(w):
        for y in (0, h - 1):
            queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue

        r, g, b, a = px[x, y]
        # Distance from white. 0 is pure white, 255 is pure ink.
        d = 255 - min(r, g, b)
        if d >= TOLERANCE:
            # Card or ink: the fill stops here and the pixel keeps its alpha.
            continue

        seen[i] = 1
        alpha = 0 if d <= FLOOR else round((d - FLOOR) / (TOLERANCE - FLOOR) * 255)
        if alpha == 0:
            px[x, y] = (255, 255, 255, 0)
        else:
            # Un-premultiply off white: the pixel is ink over white at `alpha`,
            # so recover the ink itself.
            f = alpha / 255
            px[x, y] = (
                max(0, min(255, round((r - 255 * (1 - f)) / f))),
                max(0, min(255, round((g - 255 * (1 - f)) / f))),
                max(0, min(255, round((b - 255 * (1 - f)) / f))),
                alpha,
            )

        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return im


def despeckle(cell, min_pixels=64):
    """Drop stray marks so they cannot drag the crop box out with them.

    The sheet carries a few loose pen dots in the gutter. They survive the
    knockout, and getbbox() honours them, which pads a sticker with a strip of
    empty space on whichever side the speck landed.
    """
    w, h = cell.size
    px = cell.load()
    seen = bytearray(w * h)

    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or px[sx, sy][3] == 0:
                continue

            blob, queue = [], deque([(sx, sy)])
            seen[sy * w + sx] = 1
            while queue:
                x, y = queue.popleft()
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3] > 0:
                        seen[ny * w + nx] = 1
                        queue.append((nx, ny))

            if len(blob) < min_pixels:
                for x, y in blob:
                    px[x, y] = (255, 255, 255, 0)

    return cell


def main():
    sheet = knockout_white(Image.open(SRC).convert("RGBA"))
    w, h = sheet.size
    cw, ch = w // COLS, h // ROWS
    os.makedirs(OUT, exist_ok=True)

    for col, row, name in TILES:
        cell = despeckle(sheet.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch)))
        box = cell.getbbox()  # tightest box holding any non-transparent pixel
        if box is None:
            raise SystemExit(f"{name}: cell is empty after knockout")

        x0, y0, x1, y1 = box
        cell = cell.crop(
            (max(0, x0 - PAD), max(0, y0 - PAD), min(cw, x1 + PAD), min(ch, y1 + PAD))
        )

        scale = min(1.0, MAX_EDGE / max(cell.size))
        if scale < 1.0:
            cell = cell.resize(
                (round(cell.width * scale), round(cell.height * scale)),
                Image.LANCZOS,
            )

        path = os.path.join(OUT, f"{name}.png")
        cell.save(path, optimize=True)
        print(f"{path:40s} {cell.width}x{cell.height}  {os.path.getsize(path) // 1024}kB")


if __name__ == "__main__":
    main()
