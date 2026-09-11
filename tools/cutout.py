#!/usr/bin/env python3
"""Turn a product photo on a plain background into a transparent PNG.

    python3 tools/cutout.py in.jpg assets/products/out.png [--thresh 30]

Reads the background colour from the corners, floods inward from every edge so
enclosed detail is never punched out, feathers the edge and trims to the
product. Works on white, grey or any flat studio backdrop.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SENTINEL = (1, 254, 1)


def cutout(src, dst, thresh=30, feather=0.7, shrink=0.55):
    im = Image.open(src).convert("RGB")
    w, h = im.size

    corners = [im.getpixel(p) for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    work = im.copy()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        try:
            ImageDraw.floodfill(work, s, SENTINEL, thresh=thresh)
        except ValueError:
            pass

    # sentinel -> transparent, everything else opaque
    r, g, b = work.split()
    mask = ImageChops.lighter(
        ImageChops.lighter(r.point(lambda v: 0 if v == SENTINEL[0] else 255),
                           g.point(lambda v: 0 if v == SENTINEL[1] else 255)),
        b.point(lambda v: 0 if v == SENTINEL[2] else 255))

    alpha = mask.filter(ImageFilter.GaussianBlur(feather))
    # pull the edge in slightly so a light backdrop leaves no halo on black
    lo = int(255 * shrink)
    alpha = alpha.point(lambda v: 0 if v <= lo else min(255, int((v - lo) * 255 / (255 - lo))))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    box = out.getbbox()
    if box:
        out = out.crop(box)
    out.save(dst, optimize=True)
    kept = sum(1 for v in alpha.getdata() if v > 8)
    print(f"{dst}  bg={bg}  {out.size[0]}x{out.size[1]}  kept {kept*100.0/(w*h):.1f}% of frame")
    return out


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    t = 30
    for x in sys.argv[1:]:
        if x.startswith("--thresh"):
            t = int(x.split("=")[1]) if "=" in x else t
    cutout(a[0], a[1], thresh=t)
