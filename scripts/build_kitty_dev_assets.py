#!/usr/bin/env python3
"""
Gera os assets do modo DEV do Mundo da Hello Kitty (além das ilhas, que vêm de build_kitty_islands.py):
  frontend/public/idle/dev/constellation-bg.webp fundo do espaço da tela de constelações
  frontend/public/idle/dev/awake-aura.webp       halo dourado/rosa que fica atrás do personagem despertado
Uso: python3 scripts/build_kitty_dev_assets.py     (requer cairosvg, pillow)
"""
import io, math, os, random
import cairosvg
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "idle", "dev")
os.makedirs(OUT, exist_ok=True)

def save(svg, name, w, h=None, quality=90):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=w, output_height=h)
    Image.open(io.BytesIO(png)).convert("RGBA").save(os.path.join(OUT, name), "WEBP", quality=quality, method=6)

def star_pts(cx, cy, ro, ri, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i * 180 / n)
        pts.append(f"{cx + r*math.cos(a):.1f},{cy + r*math.sin(a):.1f}")
    return " ".join(pts)

# ------------------------------------------------------------------ fundo do espaço
W, H = 940, 1672
rnd = random.Random(42)
stars = ""
for _ in range(330):
    x, y = rnd.uniform(0, W), rnd.uniform(0, H)
    r = rnd.choice([.8, 1, 1, 1.3, 1.6, 2.2])
    o = rnd.uniform(.35, .95)
    c = rnd.choice(["#ffffff", "#ffe9f4", "#dcd2ff", "#fff3c4"])
    stars += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{c}" opacity="{o:.2f}"/>'
for _ in range(26):
    x, y = rnd.uniform(40, W - 40), rnd.uniform(40, H - 40)
    s = rnd.uniform(5, 10)
    stars += f'<polygon points="{x:.0f},{y-s*2:.0f} {x+s*.4:.0f},{y-s*.4:.0f} {x+s*2:.0f},{y:.0f} {x+s*.4:.0f},{y+s*.4:.0f} {x:.0f},{y+s*2:.0f} {x-s*.4:.0f},{y+s*.4:.0f} {x-s*2:.0f},{y:.0f} {x-s*.4:.0f},{y-s*.4:.0f}" fill="#fff8d8" opacity="{rnd.uniform(.5,.95):.2f}"/>'
bg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1647"/><stop offset=".45" stop-color="#2d1b5e"/><stop offset=".78" stop-color="#4a2370"/><stop offset="1" stop-color="#6a2a78"/></linearGradient>
<radialGradient id="n1" cx=".2" cy=".22" r=".5"><stop offset="0" stop-color="#8a5cff" stop-opacity=".55"/><stop offset="1" stop-color="#8a5cff" stop-opacity="0"/></radialGradient>
<radialGradient id="n2" cx=".85" cy=".5" r=".55"><stop offset="0" stop-color="#ff5fa8" stop-opacity=".42"/><stop offset="1" stop-color="#ff5fa8" stop-opacity="0"/></radialGradient>
<radialGradient id="n3" cx=".3" cy=".85" r=".5"><stop offset="0" stop-color="#4fa8ff" stop-opacity=".35"/><stop offset="1" stop-color="#4fa8ff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
<rect width="{W}" height="{H}" fill="url(#n1)"/><rect width="{W}" height="{H}" fill="url(#n2)"/><rect width="{W}" height="{H}" fill="url(#n3)"/>
<path d="M-40,520 C180,420 300,640 520,560 C720,490 820,420 1000,470" fill="none" stroke="#ffffff" stroke-opacity=".05" stroke-width="140" stroke-linecap="round"/>
<path d="M-40,1180 C200,1100 320,1300 560,1220 C760,1150 860,1100 1000,1150" fill="none" stroke="#ffb3dc" stroke-opacity=".05" stroke-width="120" stroke-linecap="round"/>
{stars}
</svg>'''
save(bg, "constellation-bg.webp", W, H, quality=82)

# ------------------------------------------------------------------ halo do despertar
rays = "".join(f'<polygon points="256,256 {256+250*math.cos(math.radians(a-3)):.0f},{256+250*math.sin(math.radians(a-3)):.0f} {256+250*math.cos(math.radians(a+3)):.0f},{256+250*math.sin(math.radians(a+3)):.0f}" fill="#fff0b0" opacity=".28"/>' for a in range(0, 360, 20))
aura = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d6" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd1ec" stop-opacity=".6"/><stop offset=".7" stop-color="#ffb4dc" stop-opacity=".22"/><stop offset="1" stop-color="#ffb4dc" stop-opacity="0"/></radialGradient></defs>
{rays}<circle cx="256" cy="256" r="250" fill="url(#r)"/>
<circle cx="256" cy="256" r="196" fill="none" stroke="#ffe39a" stroke-width="3" opacity=".7" stroke-dasharray="3 12" stroke-linecap="round"/>
<circle cx="256" cy="256" r="150" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".6"/>
</svg>'''
save(aura, "awake-aura.webp", 512, 512)
print("ok")
