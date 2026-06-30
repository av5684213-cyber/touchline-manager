"""Generate high-quality Android app icon (512x512) for Touchline Manager."""
from PIL import Image, ImageDraw
import math

# Touchline Manager colors
BG = (13, 13, 26)         # #0d0d1a — deep navy
PRIMARY = (26, 58, 42)    # #1a3a2a — pitch green
ACCENT = (251, 191, 36)   # #fbbf24 — amber accent
WHITE = (255, 255, 255)


def draw_icon(size: int, path: str, with_padding: bool = False) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))  # transparent
    draw = ImageDraw.Draw(img)

    # Full-bleed rounded square background (Android adaptive icon style)
    if with_padding:
        margin = int(size * 0.10)  # 10% padding for safe zone
    else:
        margin = 0
    radius = int(size * 0.20)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=PRIMARY,
    )

    # Soccer ball — white circle with pentagon pattern
    cx, cy = size // 2, size // 2
    r = int(size * 0.26)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE, outline=ACCENT, width=max(3, size // 80))

    # Pentagon in center (dark)
    pr = int(r * 0.42)
    points = []
    for i in range(5):
        angle = -math.pi / 2 + i * 2 * math.pi / 5
        points.append((cx + pr * math.cos(angle), cy + pr * math.sin(angle)))
    draw.polygon(points, fill=BG)

    # Pentagon edges (lines from center pentagon vertices to ball edge)
    for i in range(5):
        angle = -math.pi / 2 + i * 2 * math.pi / 5
        x1 = cx + pr * math.cos(angle)
        y1 = cy + pr * math.sin(angle)
        x2 = cx + r * math.cos(angle)
        y2 = cy + r * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=BG, width=max(2, size // 120))

    # Goal posts — amber accent bars at top
    post_w = max(3, size // 60)
    post_h = int(size * 0.10)
    post_y = margin + int(size * 0.06)
    inner_pad = int(size * 0.18)
    # Left post
    draw.rectangle([margin + inner_pad, post_y, margin + inner_pad + post_w, post_y + post_h], fill=ACCENT)
    # Right post
    draw.rectangle([size - margin - inner_pad - post_w, post_y, size - margin - inner_pad, post_y + post_h], fill=ACCENT)
    # Crossbar
    draw.rectangle([margin + inner_pad, post_y, size - margin - inner_pad, post_y + post_w], fill=ACCENT)

    img.save(path, "PNG", optimize=True)
    print(f"Created {path} ({size}x{size}, {img.fp.seek(0,2) if hasattr(img,'fp') and img.fp else 'unknown'} bytes)")


if __name__ == "__main__":
    # Main android icon (no padding, full bleed)
    draw_icon(512, "/home/z/my-project/android-icon.png")
    draw_icon(192, "/home/z/my-project/android-icon-192.png")
    print("Android icons generated.")
