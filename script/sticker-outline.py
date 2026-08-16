"""
Put a white sticker border around a cut-out.

    script/sticker-outline.py assets/stickers/thats-nuts.webp --width 12

Takes one or more images with transparency and grows a band of flat colour out
from the artwork's edge, the way a die-cut sticker has a white margin around the
print. Writes in place unless --out is given.

The band is the image's own alpha channel dilated by a disc and filled — so it
follows the silhouette exactly, including any holes, and inherits the edge's
antialiasing rather than coming out stepped. The artwork is then composited back
over the top, so nothing of the original is covered.

The canvas grows by the border's width on all four sides. Dilating in place
would push the band off the edge of the image and flatten the outline against
it; the stickers are positioned by their centres, so a symmetric grow does not
move them.

Needs Pillow: python3 -m pip install pillow
"""

import argparse
import os

from PIL import Image, ImageChops


def disc_offsets(radius):
    """Every (dx, dy) inside a circle of this radius.

    A circle rather than a square: the border follows the artwork at a constant
    distance, so a corner comes out round instead of mitred. Square is what a
    single box-blur or a MaxFilter would give, and it shows badly on anything
    with a curve.
    """
    offsets = []

    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy <= radius * radius:
                offsets.append((dx, dy))

    return offsets


def dilate(mask, radius):
    """Grow a greyscale mask by a disc.

    Done as a max over the mask shifted to every offset in the disc. That is a
    lot of passes — a radius of 12 is some 450 of them — but each is one C-level
    operation over the whole image, the images here are a few hundred pixels
    square, and it is exact. The alternative, repeated 3x3 max filters, only
    approximates a disc and compounds its error with the radius.
    """
    grown = mask

    for dx, dy in disc_offsets(radius):
        if dx == 0 and dy == 0:
            continue

        shifted = ImageChops.offset(mask, dx, dy)
        grown = ImageChops.lighter(grown, shifted)

    return grown


def outline(source, width, color):
    art = Image.open(source).convert("RGBA")

    # Room for the border on every side. ImageChops.offset WRAPS rather than
    # clipping, so without the margin the artwork's own edge pixels would come
    # back in on the opposite side and print a band there.
    pad = width
    padded = Image.new("RGBA", (art.width + pad * 2, art.height + pad * 2), (0, 0, 0, 0))
    padded.paste(art, (pad, pad))

    band = Image.new("RGBA", padded.size, color)
    band.putalpha(dilate(padded.getchannel("A"), width))

    # The band under the artwork, not over it: it is a margin around the print,
    # and compositing the other way round would eat the artwork's soft edge.
    return Image.alpha_composite(band, padded)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+")
    parser.add_argument("--width", type=int, default=12,
                        help="border in pixels, at the image's own resolution")
    parser.add_argument("--out", help="directory to write to (default: in place)")
    args = parser.parse_args()

    for source in args.images:
        result = outline(source, args.width, (255, 255, 255, 255))

        target = source
        if args.out:
            os.makedirs(args.out, exist_ok=True)
            target = os.path.join(args.out, os.path.basename(source))

        # Lossless: these are flat-edged cut-outs on transparency, and WebP's
        # lossy mode puts a halo along exactly the edge this script just drew.
        result.save(target, lossless=True)
        print(f"{target}  {result.width}x{result.height}  +{args.width}px")


if __name__ == "__main__":
    main()
