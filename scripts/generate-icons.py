"""Generate Touchline Manager app icons (192x192 and 512x512)."""
from PIL import Image, ImageDraw

# Touchline Manager colors
BG = (13, 13, 26)         # #0d0d1a — deep navy
PRIMARY = (26, 58, 42)    # #1a3a2a — pitch green
ACCENT = (251, 191, 36)   # #fbbf24 — amber accent
WHITE = (255, 255, 255)


def draw_icon(size: int, path: str) -> None:
    img = Image.new("RGBA", (size, size), BG + (255,))
    draw = ImageDraw.Draw(img)

    # Outer rounded square (maskable icon safe zone — 80% of canvas)
    margin = int(size * 0.08)
    radius = int(size * 0.18)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=PRIMARY,
    )

    # Soccer ball — simple white circle with pentagon pattern hint
    cx, cy = size // 2, size // 2
    r = int(size * 0.22)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE, outline=ACCENT, width=max(2, size // 96))

    # Pentagon hint — small dark pentagon in center
    pr = int(r * 0.35)
    import math
    points = []
    for i in range(5):
        angle = -math.pi / 2 + i * 2 * math.pi / 5
        points.append((cx + pr * math.cos(angle), cy + pr * math.sin(angle)))
    draw.polygon(points, fill=BG)

    # Goal posts — amber accent bars at top
    post_w = max(2, size // 80)
    post_h = int(size * 0.08)
    post_y = margin + int(size * 0.05)
    draw.rectangle([margin + int(size * 0.15), post_y, margin + int(size * 0.15) + post_w, post_y + post_h], fill=ACCENT)
    draw.rectangle([size - margin - int(size * 0.15) - post_w, post_y, size - margin - int(size * 0.15), post_y + post_h], fill=ACCENT)
    # Crossbar
    draw.rectangle([margin + int(size * 0.15), post_y, size - margin - int(size * 0.15), post_y + post_w], fill=ACCENT)

    img.save(path, "PNG", optimize=True)
    print(f"Created {path} ({size}x{size})")


if __name__ == "__main__":
    draw_icon(192, "/home/z/my-project/public/icon-192.png")
    draw_icon(512, "/home/z/my-project/public/icon-512.png")
    # Also create favicon
    draw_icon(32, "/home/z/my-project/public/favicon-32.png")
    draw_icon(16, "/home/z/my-project/public/favicon-16.png")
    print("All icons generated.")
