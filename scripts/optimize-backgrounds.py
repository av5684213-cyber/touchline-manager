#!/usr/bin/env python3
"""
Touchline Manager — Background image optimizer
PNG (1080x1920, ~2.5MB each) → WebP (~150-300KB, quality=78)
Hedef: 20 görsel × ~200KB = ~4MB toplam (APK'ya eklenebilir)
"""
import os
import sys
from pathlib import Path
from PIL import Image

SRC_DIR = Path("/home/z/my-project/upload/bg-extracted")
DEST_DIR = Path("/home/z/my-project/public/backgrounds")
BACKUP_DIR = Path("/home/z/my-project/design-assets/backgrounds-originals")

# 1080x1920 mobil için yeterli; retina için 2x gerekirse ayrı ekle
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
WEBP_QUALITY = 78  # görsel olarak fark edilmeyen kalite/boyut dengesi

def main():
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    png_files = sorted(SRC_DIR.glob("bg_*.png"))
    if not png_files:
        print("Kaynak PNG bulunamadı!")
        sys.exit(1)

    print(f"{len(png_files)} görsel işlenecek...")
    print(f"Kaynak: {SRC_DIR}")
    print(f"Hedef:  {DEST_DIR}")
    print("-" * 60)

    total_original = 0
    total_optimized = 0

    for png_path in png_files:
        # WebP çıktı adı
        webp_name = png_path.stem + ".webp"  # bg_dashboard.webp
        webp_path = DEST_DIR / webp_name

        # Orijinali yedekle (build'e dahil değil)
        backup_path = BACKUP_DIR / png_path.name
        if not backup_path.exists():
            import shutil
            shutil.copy2(png_path, backup_path)

        try:
            img = Image.open(png_path).convert("RGB")

            # Boyut kontrolü — zaten 1080x1920 ama emin olalım
            if img.size != (TARGET_WIDTH, TARGET_HEIGHT):
                img = img.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.LANCZOS)

            # WebP olarak kaydet (optimize=True küçük dosya için)
            img.save(webp_path, "webp", quality=WEBP_QUALITY, method=6, optimize=True)

            orig_size = png_path.stat().st_size
            webp_size = webp_path.stat().st_size
            ratio = (1 - webp_size / orig_size) * 100

            total_original += orig_size
            total_optimized += webp_size

            print(f"✅ {png_path.name:25s}  {orig_size/1024:6.0f}KB → {webp_size/1024:5.0f}KB  (-{ratio:.0f}%)")

        except Exception as e:
            print(f"❌ {png_path.name}: {e}")
            sys.exit(1)

    print("-" * 60)
    print(f"Toplam: {total_original/1024/1024:.1f}MB → {total_optimized/1024/1024:.1f}MB  "
          f"(-{(1 - total_optimized/total_original)*100:.0f}%)")
    print(f"Ortalama: {(total_optimized/len(png_files))/1024:.0f}KB / görsel")
    print(f"\n✓ {len(png_files)} WebP görsel {DEST_DIR}'a kaydedildi")
    print(f"✓ Orijinaller {BACKUP_DIR}/'a yedeklendi (build'e dahil değil)")

if __name__ == "__main__":
    main()
