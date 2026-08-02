"""Gera imagens de exemplo, coloridas e com boa variação visual, para o
quebra-cabeça. Servem apenas como placeholder inicial -- basta trocar os
arquivos em frontend/public/images/puzzle/ por fotos reais depois."""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

SIZE = 800
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "images", "puzzle")


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def diagonal_gradient(size, color_top_left, color_bottom_right):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = lerp_color(color_top_left, color_bottom_right, t)
    return img


def add_blobs(img, colors, count, seed, min_r, max_r, alpha=90):
    random.seed(seed)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    size = img.size[0]
    for _ in range(count):
        color = random.choice(colors)
        r = random.randint(min_r, max_r)
        x = random.randint(0, size)
        y = random.randint(0, size)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(*color, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(size // 14))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def add_grain(img, intensity=6):
    random.seed(42)
    px = img.load()
    w, h = img.size
    for _ in range(w * h // 40):
        x, y = random.randint(0, w - 1), random.randint(0, h - 1)
        r, g, b = px[x, y]
        n = random.randint(-intensity, intensity)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return img


def make_aurora():
    img = diagonal_gradient(SIZE, (253, 246, 238), (201, 224, 242))
    img = add_blobs(img, [(246, 211, 222), (223, 203, 240), (201, 224, 242)], count=10, seed=1, min_r=120, max_r=260)
    return img


def make_jardim():
    img = diagonal_gradient(SIZE, (241, 228, 211), (199, 219, 201))
    img = add_blobs(img, [(199, 219, 201), (246, 211, 222), (223, 203, 240)], count=14, seed=2, min_r=70, max_r=160)
    return img


def make_oceano():
    img = diagonal_gradient(SIZE, (201, 224, 242), (143, 176, 222))
    img = add_blobs(img, [(255, 255, 255), (223, 203, 240), (201, 224, 242)], count=8, seed=3, min_r=140, max_r=300)
    return img


def make_por_do_sol():
    img = diagonal_gradient(SIZE, (246, 211, 222), (241, 228, 211))
    draw_img = img.convert("RGBA")
    draw = ImageDraw.Draw(draw_img)
    cx, cy, r = SIZE * 0.7, SIZE * 0.35, 130
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(233, 148, 170, 200))
    img = draw_img.convert("RGB").filter(ImageFilter.GaussianBlur(2))
    img = add_blobs(img, [(217, 117, 143), (223, 203, 240)], count=6, seed=4, min_r=100, max_r=220, alpha=60)
    return img


GENERATORS = {
    "aurora.jpg": make_aurora,
    "jardim.jpg": make_jardim,
    "oceano.jpg": make_oceano,
    "por-do-sol.jpg": make_por_do_sol,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, generator in GENERATORS.items():
        img = generator()
        img = add_grain(img, intensity=4)
        path = os.path.join(OUT_DIR, filename)
        img.save(path, quality=90)
        print(f"Gerado: {path}")


if __name__ == "__main__":
    main()
