#!/usr/bin/env python3
"""
Gera os assets da tela de constelações (visual "castelo dos sonhos") em frontend/public/idle/dev/cst/:
  cst-bg.webp         cenário (céu, lua, castelos, nuvens)
  cst-crystal.webp    estrela de cristal acesa        cst-crystal-off.webp   estrela apagada (vidro escuro)
  cst-rays.webp       raios de luz (girados por CSS)  cst-glow.webp          clarão suave
  cst-ring.webp       anel de luz                     cst-flare.webp         faixa de brilho horizontal
Uso (na raiz do repositório): python3 scripts/build_constellation_assets.py     (requer playwright + chromium, pillow, numpy)
Os efeitos grandes viram imagens pequenas (em vez de gradientes CSS gigantes): o celular só precisa mover uma textura pronta.
"""
import io, math, os, random
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "idle", "dev", "cst")
os.makedirs(OUT, exist_ok=True)


def webp(img, name, quality=85, size=None):
    if size:
        img = img.resize(size, Image.LANCZOS)
    img.save(os.path.join(OUT, name), "WEBP", quality=quality, method=6)
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")


def star_pts(cx, cy, ro, ri, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def fmt(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


# ------------------------------------------------------------------ cenário
W, H = 1080, 2340
rnd = random.Random(7)


def castle(x, y, scale, color, windows="#ffd98a", seed=1):
    r = random.Random(seed)
    parts = []
    # corpo central + torres
    base_w = 230 * scale
    parts.append(f'<rect x="{x - base_w/2:.0f}" y="{y - 120*scale:.0f}" width="{base_w:.0f}" height="{120*scale:.0f}" fill="{color}"/>')
    for i, (dx, tw, th) in enumerate([(-125, 52, 250), (-60, 46, 330), (0, 64, 420), (62, 46, 300), (128, 54, 230)]):
        tx = x + dx * scale
        w, h = tw * scale, th * scale
        parts.append(f'<rect x="{tx - w/2:.0f}" y="{y - h:.0f}" width="{w:.0f}" height="{h:.0f}" fill="{color}"/>')
        parts.append(f'<polygon points="{tx - w*0.68:.0f},{y - h:.0f} {tx + w*0.68:.0f},{y - h:.0f} {tx:.0f},{y - h - w*1.55:.0f}" fill="{color}"/>')
        parts.append(f'<circle cx="{tx:.0f}" cy="{y - h - w*1.55 - 6*scale:.0f}" r="{5*scale:.1f}" fill="#ffe7a8"/>')
        for k in range(int(h // (46 * scale))):
            if r.random() < .55:
                parts.append(f'<rect x="{tx - 4*scale:.0f}" y="{y - h + 26*scale + k*46*scale:.0f}" width="{8*scale:.0f}" height="{14*scale:.0f}" rx="{4*scale:.0f}" fill="{windows}" opacity=".9"/>')
    # ameias
    for i in range(9):
        parts.append(f'<rect x="{x - base_w/2 + i*base_w/9:.0f}" y="{y - 120*scale - 16*scale:.0f}" width="{base_w/18:.0f}" height="{16*scale:.0f}" fill="{color}"/>')
    return "".join(parts)


def cloud(cx, cy, w, h, color, op, seed):
    r = random.Random(seed)
    blobs = ""
    for _ in range(9):
        bx = cx + r.uniform(-w / 2, w / 2) * .9
        by = cy + r.uniform(-h / 3, h / 3)
        rx = r.uniform(w * .16, w * .3)
        ry = r.uniform(h * .3, h * .55)
        blobs += f'<ellipse cx="{bx:.0f}" cy="{by:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="{color}"/>'
    return f'<g opacity="{op}" filter="url(#blur22)">{blobs}</g>'


stars = ""
for _ in range(260):
    x, y = rnd.uniform(0, W), rnd.uniform(0, H * .82)
    r = rnd.choice([1, 1.2, 1.5, 1.9, 2.4])
    stars += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{rnd.choice(["#fff","#ffeaf6","#e0d8ff","#fff1c4"])}" opacity="{rnd.uniform(.35, .95):.2f}"/>'
for _ in range(34):
    x, y = rnd.uniform(40, W - 40), rnd.uniform(40, H * .72)
    s = rnd.uniform(6, 13)
    stars += (f'<path d="M{x:.0f},{y - s*2.2:.0f} Q{x + s*.2:.0f},{y - s*.2:.0f} {x + s*2.2:.0f},{y:.0f} Q{x + s*.2:.0f},{y + s*.2:.0f} {x:.0f},{y + s*2.2:.0f} '
              f'Q{x - s*.2:.0f},{y + s*.2:.0f} {x - s*2.2:.0f},{y:.0f} Q{x - s*.2:.0f},{y - s*.2:.0f} {x:.0f},{y - s*2.2:.0f}Z" fill="#fff6d8" opacity="{rnd.uniform(.5, .95):.2f}"/>')

arches = ""
for cx, op in [(540, .13), (540, .07)]:
    pass
arch_line = '<path d="M150,1700 L150,640 Q150,170 540,100 Q930,170 930,640 L930,1700" fill="none" stroke="#f2d48e" stroke-width="5" opacity=".10"/>'
arch_line += '<path d="M100,1800 L100,600 Q100,60 540,-20 Q980,60 980,600 L980,1800" fill="none" stroke="#f2d48e" stroke-width="3" opacity=".07"/>'

turret = lambda x, flip=1: (
    f'<g transform="translate({x},2060)">'
    f'<rect x="-46" y="0" width="92" height="300" fill="#d9b3e8"/><rect x="-60" y="-22" width="120" height="30" rx="8" fill="#eed0f5"/>'
    f'<polygon points="-58,-22 58,-22 0,-170" fill="#c28fe0"/>'
    f'<polygon points="{fmt(star_pts(0, -214, 46, 20))}" fill="#ffd45a" stroke="#fff3bd" stroke-width="4"/>'
    f'<circle cx="0" cy="-214" r="70" fill="#ffe08a" opacity=".35" filter="url(#blur22)"/>'
    f'<rect x="-8" y="60" width="16" height="34" rx="8" fill="#ffe7a8"/><rect x="-8" y="140" width="16" height="34" rx="8" fill="#ffe7a8"/></g>'
)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<filter id="blur22" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="blur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="2.2"/></filter>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#150f45"/><stop offset=".22" stop-color="#2a1a6e"/><stop offset=".48" stop-color="#5a31a0"/>
<stop offset=".7" stop-color="#9a55bd"/><stop offset=".86" stop-color="#e48ec6"/><stop offset="1" stop-color="#ffc6dc"/></linearGradient>
<radialGradient id="n1" cx=".18" cy=".2" r=".55"><stop offset="0" stop-color="#8c63ff" stop-opacity=".55"/><stop offset="1" stop-color="#8c63ff" stop-opacity="0"/></radialGradient>
<radialGradient id="n2" cx=".85" cy=".45" r=".55"><stop offset="0" stop-color="#ff6fb4" stop-opacity=".4"/><stop offset="1" stop-color="#ff6fb4" stop-opacity="0"/></radialGradient>
<radialGradient id="n3" cx=".3" cy=".62" r=".5"><stop offset="0" stop-color="#5aa9ff" stop-opacity=".28"/><stop offset="1" stop-color="#5aa9ff" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".46" r=".78"><stop offset=".45" stop-color="#0e0734" stop-opacity="0"/><stop offset="1" stop-color="#0e0734" stop-opacity=".62"/></radialGradient>
<radialGradient id="moonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff0c0" stop-opacity=".75"/><stop offset=".45" stop-color="#ffd1ee" stop-opacity=".25"/><stop offset="1" stop-color="#ffd1ee" stop-opacity="0"/></radialGradient>
<mask id="moonMask"><rect width="{W}" height="{H}" fill="#000"/><circle cx="880" cy="330" r="112" fill="#fff"/><circle cx="930" cy="296" r="104" fill="#000"/></mask>
<linearGradient id="bank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbd2ea"/><stop offset=".5" stop-color="#e8a8d8"/><stop offset="1" stop-color="#b878d0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
<rect width="{W}" height="{H}" fill="url(#n1)"/><rect width="{W}" height="{H}" fill="url(#n2)"/><rect width="{W}" height="{H}" fill="url(#n3)"/>
{stars}
{arch_line}
<circle cx="880" cy="330" r="330" fill="url(#moonGlow)"/>
<rect width="{W}" height="{H}" fill="#fff4cf" mask="url(#moonMask)"/>
{cloud(260, 700, 700, 150, "#e8d6ff", .22, 3)}{cloud(860, 980, 640, 140, "#ffc9e6", .2, 5)}{cloud(420, 1210, 800, 160, "#f4dcff", .26, 8)}
<g filter="url(#blur2)" opacity=".62">{castle(190, 1700, 1.5, "#4a3590", seed=2)}{castle(900, 1640, 1.25, "#523a98", seed=9)}</g>
{cloud(220, 1640, 760, 190, "#f3d2ff", .55, 11)}{cloud(840, 1620, 700, 170, "#ffd0ea", .5, 12)}
{cloud(540, 1790, 1100, 230, "#ffe0f0", .6, 14)}{cloud(120, 1930, 560, 180, "#fff0f8", .6, 15)}{cloud(980, 1950, 560, 180, "#fff0f8", .6, 16)}
<path d="M0,2080 C90,2020 170,2070 260,2030 C370,1990 430,2060 540,2040 C650,2020 730,1990 830,2040 C930,2080 1000,2020 1080,2060 L1080,2340 L0,2340Z" fill="url(#bank)"/>
<path d="M0,2150 C120,2110 200,2160 320,2130 C460,2100 560,2170 700,2140 C840,2110 950,2160 1080,2130 L1080,2340 L0,2340Z" fill="#ffd9ee" opacity=".7"/>
{turret(70)}{turret(1010)}
<rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>'''

STAR_ON = lambda: None


def crystal(on):
    pts = star_pts(100, 104, 86, 38)
    inner = star_pts(100, 104, 86, 38)
    cx, cy = 100, 104
    # 10 facetas triangulares (centro → ponta → vale)
    cols_on = ["#fff7c8", "#ffe27a", "#ffb7ee", "#c9a8ff", "#8fd0ff", "#ffe27a", "#ffc2f0", "#b9a2ff", "#9fe0ff", "#fff0a0"]
    cols_off = ["#6f5fa8", "#5f4f98", "#7a68b0", "#58498c", "#6c5ca4", "#5b4b92", "#7563ab", "#54468a", "#6a5aa0", "#5e4f95"]
    facets = ""
    for i in range(10):
        a, b = pts[i], pts[(i + 1) % 10]
        c = (cols_on if on else cols_off)[i]
        facets += f'<polygon points="{cx},{cy} {a[0]:.1f},{a[1]:.1f} {b[0]:.1f},{b[1]:.1f}" fill="{c}" stroke="{"#fffbe8" if on else "#b8a8f0"}" stroke-opacity="{.85 if on else .5}" stroke-width="2" stroke-linejoin="round"/>'
    shine = f'<polygon points="{fmt(star_pts(100, 104, 52, 22))}" fill="#fff" opacity="{.34 if on else .08}"/>'
    glint = (f'<ellipse cx="78" cy="74" rx="16" ry="7" fill="#fff" opacity=".85" transform="rotate(-38 78 74)"/><circle cx="128" cy="140" r="4" fill="#fff" opacity=".9"/>' if on else
             '<ellipse cx="78" cy="74" rx="14" ry="6" fill="#fff" opacity=".22" transform="rotate(-38 78 74)"/>')
    glow = (f'' if on else "")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="208" viewBox="0 0 200 208">
<defs><filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter></defs>
{glow}<polygon points="{fmt(pts)}" fill="#2a1a5e" stroke="{"#ffe9a0" if on else "#9a88d8"}" stroke-width="7" stroke-linejoin="round"/>
{facets}{shine}{glint}</svg>'''


def raster(page, markup, w, h, transparent=True):
    page.set_viewport_size({"width": w, "height": h})
    page.set_content(f'<html><body style="margin:0;background:transparent">{markup}</body></html>')
    page.wait_for_timeout(250)
    return Image.open(io.BytesIO(page.screenshot(omit_background=transparent))).convert("RGBA")


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page()
    bg = raster(page, svg, W, H, transparent=False).convert("RGB")
    webp(bg, "cst-bg.webp", 76, size=(828, 1794))
    webp(raster(page, crystal(True), 200, 208), "cst-crystal.webp", 90, size=(256, 266))
    webp(raster(page, crystal(False), 200, 208), "cst-crystal-off.webp", 90, size=(256, 266))
    browser.close()

# ------------------------------------------------------------------ efeitos de luz (numpy)
N = 512
yy, xx = np.mgrid[0:N, 0:N]
dx, dy = (xx - N / 2 + .5) / (N / 2), (yy - N / 2 + .5) / (N / 2)
dist = np.sqrt(dx ** 2 + dy ** 2)
ang = np.arctan2(dy, dx)


def rgba(rgb, alpha):
    a = np.clip(alpha, 0, 1)
    out = np.zeros((N, N, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = rgb
    out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


# raios: 18 feixes suaves com queda radial
beams = np.clip(np.cos(ang * 9) * .5 + .5, 0, 1) ** 3.2
fall = np.clip(1 - dist, 0, 1) ** 1.25
webp(rgba((255, 236, 170), beams * fall * .95), "cst-rays.webp", 80)
# clarão suave
webp(rgba((255, 238, 190), np.clip(1 - dist, 0, 1) ** 2.1), "cst-glow.webp", 85, size=(256, 256))
# anel de luz
ring = np.exp(-((dist - .82) / .045) ** 2)
webp(rgba((255, 226, 140), ring * .95 + np.exp(-((dist - .82) / .14) ** 2) * .25), "cst-ring.webp", 85, size=(256, 256))
# faixa horizontal (lens flare)
flare = np.exp(-(dy / .035) ** 2) * np.clip(1 - np.abs(dx), 0, 1) ** 1.6
webp(rgba((255, 240, 200), flare), "cst-flare.webp", 85, size=(512, 128))
