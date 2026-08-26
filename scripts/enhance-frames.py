#!/usr/bin/env python3
"""Regenerate the cinematic frames at high resolution.

Upscales every 640x360 WebP in public/frames/ (originals stay available in
portfolio_frames_webp_max10mb.zip) to TARGET_W with Lanczos resampling and an
unsharp pass, which restores perceived sharpness when the canvas scales the
frames to fullscreen (the 640px source looked blurry at 3-4x upscale).

Run once after changing frames:
    python3 scripts/enhance-frames.py
"""

from __future__ import annotations

import os
import sys
import time

from PIL import Image, ImageFilter

FRAMES_DIR = os.path.join("public", "frames")
FRAME_COUNT = 240
TARGET_W = 1440  # 1440x810 — sweet spot between sharpness and payload
QUALITY = 78
UNSHARP = dict(radius=2, percent=130, threshold=2)


def main() -> int:
    if not os.path.isdir(FRAMES_DIR):
        print(f"missing {FRAMES_DIR}", file=sys.stderr)
        return 1

    started = time.time()
    total_bytes = 0
    for index in range(1, FRAME_COUNT + 1):
        name = f"frame_{index:06d}.webp"
        path = os.path.join(FRAMES_DIR, name)
        with Image.open(path) as image:
            target_h = round(TARGET_W * image.height / image.width)
            enhanced = image.resize((TARGET_W, target_h), Image.LANCZOS)
            enhanced = enhanced.filter(ImageFilter.UnsharpMask(**UNSHARP))
            enhanced.save(path, "WEBP", quality=QUALITY, method=6)
        total_bytes += os.path.getsize(path)

    print(
        f"enhanced {FRAME_COUNT} frames -> {TARGET_W}px, "
        f"{total_bytes / 1_048_576:.1f} MB total, "
        f"{time.time() - started:.1f}s"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
