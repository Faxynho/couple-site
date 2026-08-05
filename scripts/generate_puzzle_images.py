"""Gera imagens de exemplo, coloridas e com boa variação visual, para o
quebra-cabeça. Servem apenas como placeholder inicial -- basta trocar os
arquivos em frontend/public/images/puzzle/ por fotos reais depois.

Propositalmente usa proporções diferentes (quadrada, paisagem, retrato)
para validar que o quebra-cabeça respeita a proporção original da imagem."""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "images", "puzzle")


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def diagonal_gradient(w, h, color_top_left, color_bottom_right):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            px[x, y] = lerp_color(color_top_left, color_bottom_right, t)
    return img


def add_blobs(img, colors, count, seed, min_r, max_r, alpha=90):
    random.seed(seed)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = img.size
    for _ in range(count):
        color = random.choice(colors)
        r = random.randint(min_r, max_r)
        x = random.randint(0, w)
        y = random.randint(0, h)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(*color, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(min(w, h) // 14))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def add_grain(img, intensity=4):
    random.seed(42)
    px = img.load()
    w, h = img.size
    for _ in range(w * h // 40):
        x, y = random.randint(0, w - 1), random.randint(0, h - 1)
        r, g, b = px[x, y]
        n = random.randint(-intensity, intensity)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return img


def make_aurora(w, h):
    img = diagonal_gradient(w, h, (253, 246, 238), (201, 224, 242))
    img = add_blobs(img, [(246, 211, 222), (223, 203, 240), (201, 224, 242)], count=12, seed=1, min_r=w // 8, max_r=w // 4)
    return img


def make_jardim(w, h):
    img = diagonal_gradient(w, h, (241, 228, 211), (199, 219, 201))
    img = add_blobs(img, [(199, 219, 201), (246, 211, 222), (223, 203, 240)], count=16, seed=2, min_r=w // 12, max_r=w // 7)
    return img


def make_oceano(w, h):
    img = diagonal_gradient(w, h, (201, 224, 242), (143, 176, 222))
    img = add_blobs(img, [(255, 255, 255), (223, 203, 240), (201, 224, 242)], count=10, seed=3, min_r=w // 6, max_r=w // 3)
    return img


def make_por_do_sol(w, h):
    img = diagonal_gradient(w, h, (246, 211, 222), (241, 228, 211))
    draw_img = img.convert("RGBA")
    draw = ImageDraw.Draw(draw_img)
    cx, cy, r = w * 0.72, h * 0.32, min(w, h) * 0.16
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(233, 148, 170, 200))
    img = draw_img.convert("RGB").filter(ImageFilter.GaussianBlur(2))
    img = add_blobs(img, [(217, 117, 143), (223, 203, 240)], count=8, seed=4, min_r=w // 10, max_r=w // 5, alpha=60)
    return img


# (arquivo, gerador, largura, altura) — proporções propositalmente variadas
GENERATORS = [
    ("aurora.jpg", make_aurora, 900, 900),        # 1:1 quadrada
    ("jardim.jpg", make_jardim, 1200, 900),       # 4:3 paisagem
    ("oceano.jpg", make_oceano, 720, 1280),       # 9:16 retrato
    ("por-do-sol.jpg", make_por_do_sol, 1280, 720),  # 16:9 paisagem larga
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, generator, w, h in GENERATORS:
        img = generator(w, h)
        img = add_grain(img, intensity=4)
        path = os.path.join(OUT_DIR, filename)
        img.save(path, quality=90)
        print(f"Gerado: {path} ({w}x{h})")


if __name__ == "__main__":
    main()

