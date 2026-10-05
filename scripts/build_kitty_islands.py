#!/usr/bin/env python3
"""
Gera os sprites das 7 ilhas flutuantes do Mundo da Hello Kitty (modo DEV).

Saída: frontend/public/idle/islands/island-1.webp ... island-7.webp (720x672, fundo transparente)
Uso:   python3 scripts/build_kitty_islands.py [--preview /tmp/preview.png]
Requer: pip install cairosvg pillow
Os desenhos são vetoriais (SVG) e ficam todos neste arquivo: edite as funções `theme_*` para ajustar uma ilha.
"""
import io, math, random, sys, os
import cairosvg
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "idle", "islands")
W, H = 600, 560

# ---------------------------------------------------------------- helpers
def smooth_blob(cx, cy, rx, ry, jitter=0.05, n=14, seed=1):
    rnd = random.Random(seed)
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + rnd.uniform(-jitter, jitter)
        pts.append((cx + math.cos(a) * rx * k, cy + math.sin(a) * ry * k))
    d = ""
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        mid1 = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
        mid2 = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
        d += ("M" if i == 0 else "L") + f"{mid1[0]:.1f},{mid1[1]:.1f} " if i == 0 else ""
        d += f"Q{p1[0]:.1f},{p1[1]:.1f} {mid2[0]:.1f},{mid2[1]:.1f} "
    return d + "Z"

def circle(x, y, r, fill, extra=""):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" {extra}/>'

def ell(x, y, rx, ry, fill, extra=""):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'

def rect(x, y, w, h, fill, r=0, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" {extra}/>'

def poly(points, fill, extra=""):
    return f'<polygon points="{" ".join(f"{x},{y}" for x, y in points)}" fill="{fill}" {extra}/>'

def path(d, fill="none", stroke="none", sw=0, extra=""):
    if isinstance(stroke, str) and "=" in stroke:  # atalho: path(d, fill, 'stroke="#fff" stroke-width="2"')
        extra, stroke, sw = stroke, None, 0
    attrs = f'd="{d}" fill="{fill}"'
    if stroke is not None and "stroke=" not in extra:
        attrs += f' stroke="{stroke}" stroke-width="{sw}"'
    elif stroke is not None and "stroke-width=" not in extra and "stroke=" in extra:
        pass
    return f'<path {attrs} {extra}/>'

OUTLINE = "#5b3a4a"

def heart(x, y, s, fill="#ff6f9f"):
    return path(f"M{x},{y+s*.35} C{x-s*.9},{y-s*.4} {x-s*.2},{y-s*.95} {x},{y-s*.3} C{x+s*.2},{y-s*.95} {x+s*.9},{y-s*.4} {x},{y+s*.35}Z", fill)

def kitty_face(x, y, s):
    """Carinha de gatinha (placa) no estilo 'Hello Kitty': cabeça branca, laço vermelho, olhos e nariz."""
    g = f'<g transform="translate({x},{y}) scale({s})">'
    g += path("M-26,-6 L-24,-26 L-10,-16 Q0,-19 10,-16 L24,-26 L26,-6 Q31,8 15,17 Q0,22 -15,17 Q-31,8 -26,-6Z", "#fffdfb", OUTLINE, 1.6)
    g += ell(-10, 2, 2.3, 3, "#4a3340") + ell(10, 2, 2.3, 3, "#4a3340") + ell(0, 8, 3.2, 2.2, "#ffc94a")
    for sy in (-1, 3):
        g += path(f"M-26,{3+sy} L-36,{sy}", "none", "#4a3340", 1.3) + path(f"M26,{3+sy} L36,{sy}", "none", "#4a3340", 1.3)
    g += path("M12,-20 q8,-8 16,-1 q-3,9 -9,6 q-6,3 -7,-5z", "#f0405f", OUTLINE, 1.2) + circle(19, -17, 2.3, "#ffd45a")
    return g + "</g>"

def sign(x, y, s=1, face=True, text_color="#fff"):
    g = f'<g transform="translate({x},{y}) scale({s})">'
    g += rect(-3, 0, 6, 34, "#9a6a4a", 2) + rect(-30, -38, 60, 42, "#e6b787", 7, f'stroke="{OUTLINE}" stroke-width="2.2"')
    g += rect(-26, -34, 52, 34, "#f6d3a8", 5)
    if face: g += kitty_face(0, -17, .62)
    return g + "</g>"

def flower(x, y, c="#ffffff", s=1):
    g = ""
    for a in range(5):
        r = math.radians(a * 72)
        g += circle(round(x + math.cos(r) * 4 * s, 1), round(y + math.sin(r) * 4 * s, 1), 3.2 * s, c)
    return g + circle(x, y, 2.4 * s, "#ffd34d")

def bush(x, y, s=1, c1="#58b04a", c2="#7ecb5a"):
    return circle(x - 12 * s, y, 13 * s, c1) + circle(x + 10 * s, y + 1, 15 * s, c1) + circle(x, y - 8 * s, 15 * s, c2) + circle(x - 5 * s, y - 12 * s, 6 * s, "#a6e27c", 'opacity=".7"')

def tree_round(x, y, s=1, canopy=("#4f9f45", "#6fbd57", "#98dc78"), trunk="#8c5b3d"):
    g = f'<g transform="translate({x},{y}) scale({s})">'
    g += path("M-9,0 Q-7,-34 -5,-60 L7,-60 Q8,-34 11,0Z", trunk, OUTLINE, 1.6) + path("M-2,-4 Q0,-30 0,-56", "none", "#b88460", 2)
    for cx, cy, r, c in [(-30, -78, 30, canopy[0]), (30, -78, 30, canopy[0]), (0, -102, 36, canopy[1]), (-14, -64, 28, canopy[1]), (18, -64, 26, canopy[1])]:
        g += circle(cx, cy, r, c)
    g += circle(-12, -112, 14, canopy[2], 'opacity=".75"') + circle(14, -98, 8, canopy[2], 'opacity=".6"') + circle(-34, -86, 8, canopy[2], 'opacity=".55"')
    return g + "</g>"

def pine(x, y, s=1, snow=False, c=("#2f7d54", "#3f9a66")):
    g = f'<g transform="translate({x},{y}) scale({s})">' + rect(-5, -6, 10, 16, "#7b5238", 2)
    for i, (w, top) in enumerate([(34, -34), (28, -58), (22, -80)]):
        g += poly([(-w, top + 30), (0, top - 24), (w, top + 30)], c[i % 2], f'stroke="{OUTLINE}" stroke-width="1.4" stroke-linejoin="round"')
        if snow:
            g += path(f"M{-w*.78:.0f},{top+13} Q{-w*.3:.0f},{top+4} 0,{top-20} Q{w*.3:.0f},{top+4} {w*.78:.0f},{top+13} Q{w*.4:.0f},{top+20} 0,{top+12} Q{-w*.4:.0f},{top+20} {-w*.78:.0f},{top+13}Z", "#f8fcff")
    return g + "</g>"

def fence(x, y, n, step=18, c="#c68d5e"):
    g = ""
    for i in range(n):
        g += rect(x + i * step, y - 18, 7, 24, c, 2, f'stroke="{OUTLINE}" stroke-width="1.2"')
    g += rect(x - 2, y - 12, (n - 1) * step + 11, 4.5, "#d9a371", 2, f'stroke="{OUTLINE}" stroke-width="1"') + rect(x - 2, y - 2, (n - 1) * step + 11, 4.5, "#d9a371", 2, f'stroke="{OUTLINE}" stroke-width="1"')
    return g

def cloud_puff(x, y, s=1, c="#ffffff", c2="#ffe6f2"):
    g = f'<g transform="translate({x},{y}) scale({s})">'
    for cx, cy, r in [(-34, 4, 20), (-10, -8, 27), (22, -4, 24), (46, 8, 17), (6, 10, 24)]:
        g += circle(cx, cy, r, c)
    g += ell(6, 22, 56, 10, c2, 'opacity=".8"')
    return g + "</g>"

def waterfall(x, top, bottom, w=26, c1="#9ee0f7", c2="#d9f6ff"):
    return (path(f"M{x-w/2},{top} L{x+w/2},{top} Q{x+w*.6},{(top+bottom)/2} {x+w*.35},{bottom} L{x-w*.35},{bottom} Q{x-w*.6},{(top+bottom)/2} {x-w/2},{top}Z", c1)
            + rect(x - w * .18, top, w * .12, bottom - top - 8, c2, 3, 'opacity=".9"') + rect(x + w * .08, top + 6, w * .1, bottom - top - 18, c2, 3, 'opacity=".7"')
            + ell(x, bottom + 2, w * .55, 6, "#ffffff", 'opacity=".85"') + circle(x - w * .5, bottom + 10, 3.5, "#ffffff", 'opacity=".8"') + circle(x + w * .55, bottom + 14, 3, "#ffffff", 'opacity=".7"'))

# ---------------------------------------------------------------- island base
def island(top, lip, rock, rock_dark, strata, extras_before="", decor="", extras_after="", fall=None, seed=3, rocky=True):
    rnd = random.Random(seed)
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
    s += f'<defs><linearGradient id="rk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{rock}"/><stop offset="1" stop-color="{rock_dark}"/></linearGradient>'
    s += f'<linearGradient id="tp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top[0]}"/><stop offset="1" stop-color="{top[1]}"/></linearGradient>'
    s += f'<radialGradient id="tpr" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="{top[2]}" stop-opacity=".9"/><stop offset="1" stop-color="{top[2]}" stop-opacity="0"/></radialGradient></defs>'
    s += extras_before
    # sombra suave sob a ilha
    if rocky: s += ell(300, 548, 150, 9, "#5a6fa8", 'opacity=".12"')
    # rocha
    if rocky: s += path("M48,236 C50,320 120,392 205,442 C240,466 262,506 300,538 C334,506 360,468 396,442 C478,392 552,322 552,236 Z", "url(#rk)", OUTLINE, 2.2, 'stroke-opacity=".55" stroke-linejoin="round"')
    for i, (d, c) in enumerate(strata if rocky else []):
        s += path(d, "none", c, 3.2, 'stroke-linecap="round" opacity=".75"')
    for _ in range(6 if rocky else 0):
        x, y = rnd.randint(110, 490), rnd.randint(285, 430)
        s += ell(x, y, rnd.randint(7, 15), rnd.randint(4, 8), "#ffffff", 'opacity=".10"')
    # pedras penduradas
    if rocky: s += poly([(236, 468), (252, 486), (246, 512), (230, 488)], rock_dark, 'opacity=".95"') + poly([(360, 450), (382, 470), (366, 500), (352, 474)], rock_dark, 'opacity=".95"')
    if fall: s += fall
    # gramado: lateral + topo
    s += path("M40,214 C36,236 54,256 92,270 C190,300 410,300 508,270 C546,256 564,236 560,214 Z", lip, OUTLINE, 2, 'stroke-opacity=".4"')
    s += path(smooth_blob(300, 206, 262, 92, .012, 16, seed), "url(#tp)", OUTLINE, 2.2, 'stroke-opacity=".45"')
    s += ell(268, 188, 190, 54, "url(#tpr)")
    s += decor
    s += extras_after
    return s + "</svg>"

def to_webp(svg, name):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=720)
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    im.save(os.path.join(OUT, name), "WEBP", quality=92, method=6)
    return im

# ---------------------------------------------------------------- themes
def theme_1():
    decor = ""
    decor += path("M150,262 Q300,232 470,258", "none", "#e8d29a", 20, 'stroke-linecap="round" opacity=".9"') + path("M150,262 Q300,232 470,258", "none", "#f6e7b8", 10, 'stroke-linecap="round"')
    decor += "".join(flower(x, y, c) for x, y, c in [(84, 222, "#ffffff"), (110, 240, "#ffb3cf"), (500, 224, "#ffffff"), (470, 238, "#ffd75c"), (190, 248, "#ffb3cf"), (420, 252, "#ffffff"), (118, 212, "#ffffff")])
    decor += fence(60, 238, 3) + fence(468, 236, 3)
    decor += bush(112, 198, 1.0) + bush(512, 202, .9) + bush(455, 190, .8, "#4f9f45", "#6fbd57")
    decor += tree_round(215, 196, 1.12) + sign(374, 196, 1.2)
    decor += heart(300, 248, 5, "#ff9fbd") + flower(300, 262, "#ffffff", .9)
    return island(("#b6e578", "#8ccf58", "#d8f6a0"), "#4f9f45", "#c18b73", "#7a5068",
        [("M92,292 Q220,330 330,318", "#e0a897"), ("M140,350 Q250,378 340,372", "#a46d7a"), ("M390,300 Q470,296 520,282", "#e0a897"), ("M370,396 Q430,380 470,350", "#a46d7a")],
        decor=decor, fall=waterfall(430, 262, 372, 24), seed=11)

def theme_2():
    decor = ""
    decor += pine(86, 214, .95, True) + pine(120, 226, .72, True) + pine(498, 212, 1.0, True) + pine(460, 224, .72, True) + pine(150, 202, .6, True)
    # cabana
    decor += f'<g transform="translate(300,166)">'
    decor += rect(-62, -14, 124, 74, "#a6683f", 6, f'stroke="{OUTLINE}" stroke-width="2.2"') + rect(-62, -14, 124, 10, "#8a542f", 4)
    for i in range(1, 6): decor += path(f"M-62,{-14+i*12} L62,{-14+i*12}", "none", "#7c4a29", 1.3)
    decor += poly([(-80, -8), (0, -70), (80, -8)], "#d8483f", f'stroke="{OUTLINE}" stroke-width="2.2" stroke-linejoin="round"')
    decor += path("M-84,-6 Q-60,-26 -34,-16 Q-12,-34 14,-18 Q40,-30 62,-14 Q74,-24 84,-6 Q70,2 58,-2 Q40,10 22,-2 Q0,10 -14,-2 Q-38,8 -54,-2 Q-72,4 -84,-6Z", "#fdfeff", 'stroke="#c8dcec" stroke-width="1.2"')
    decor += rect(-14, 18, 28, 42, "#6e4126", 5) + circle(8, 40, 2.2, "#ffd34d") + rect(-50, 12, 24, 22, "#bfe8ff", 4, f'stroke="{OUTLINE}" stroke-width="1.8"') + rect(26, 12, 24, 22, "#bfe8ff", 4, f'stroke="{OUTLINE}" stroke-width="1.8"')
    decor += rect(-38, 12, 2, 22, OUTLINE) + rect(38, 12, 2, 22, OUTLINE) + rect(-50, 22, 24, 2, OUTLINE) + rect(26, 22, 24, 2, OUTLINE)
    decor += rect(36, -62, 16, 28, "#8a542f", 3) + rect(34, -66, 20, 8, "#fdfeff", 4)
    decor += f'<g transform="translate(0,-44)">' + kitty_face(0, 0, .5) + "</g></g>"
    # boneco de neve
    decor += f'<g transform="translate(410,226)">' + circle(0, 0, 26, "#f4fbff", f'stroke="#c8dcec" stroke-width="1.4"') + circle(0, -34, 19, "#f8fdff", f'stroke="#c8dcec" stroke-width="1.4"')
    decor += circle(-6, -37, 2.2, "#3a2a35") + circle(6, -37, 2.2, "#3a2a35") + poly([(0, -33), (14, -31), (0, -29)], "#ff8a3d") + path("M-14,-24 Q0,-17 14,-24", "none", "#e04a5f", 5, 'stroke-linecap="round"') + circle(0, -8, 2.5, "#3a2a35") + circle(0, 5, 2.5, "#3a2a35")
    decor += rect(-14, -58, 28, 6, "#3a2a35", 2) + rect(-9, -72, 18, 16, "#3a2a35", 3) + "</g>"
    decor += fence(190, 252, 5, 17, "#d8a77a")
    decor += "".join(circle(x, y, 2, "#ffffff") for x, y in [(140, 190), (230, 238), (360, 258), (470, 250), (520, 228), (300, 130)])
    ice = ""
    for x in range(86, 520, 36): ice += poly([(x - 8, 262), (x + 8, 262), (x, 262 + 18 + (x % 5) * 3)], "#d6f1ff", 'opacity=".95"')
    return island(("#fbfdff", "#e4f1fb", "#ffffff"), "#d6e8f6", "#9bb6d6", "#6b7fa6",
        [("M92,292 Q220,330 330,318", "#d4e6f8"), ("M140,350 Q250,378 340,372", "#7e92bd"), ("M390,300 Q470,296 520,282", "#d4e6f8")],
        decor=decor, extras_after=ice, fall=waterfall(448, 262, 380, 22, "#a9dcff", "#effaff"), seed=5)

def theme_3():
    water = ell(300, 262, 292, 72, "#7fdcf0", 'opacity=".55"') + ell(300, 262, 274, 62, "#53c6e8", 'opacity=".45"')
    decor = ""
    decor += path("M180,252 Q300,276 430,252", "none", "#fff2cd", 5, 'opacity=".8" stroke-linecap="round"')
    # palmeiras
    def palm(x, y, s, lean):
        g = f'<g transform="translate({x},{y}) scale({s})">'
        g += path(f"M0,0 Q{lean*.5},-40 {lean},-92", "none", "#9a6a46", 11, 'stroke-linecap="round"') + path(f"M0,0 Q{lean*.5},-40 {lean},-92", "none", "#c8935f", 4, 'stroke-linecap="round" opacity=".7"')
        for a, l in [(-165, 64), (-130, 70), (-95, 56), (-55, 70), (-20, 64), (15, 52)]:
            r = math.radians(a)
            ex, ey = lean + math.cos(r) * l, -92 + math.sin(r) * l * .7 + 14
            g += path(f"M{lean},-92 Q{lean + math.cos(r)*l*.5:.0f},{-92 + math.sin(r)*l*.55 - 16:.0f} {ex:.0f},{ey:.0f}", "none", "#3e9a52", 9, 'stroke-linecap="round"')
            g += path(f"M{lean},-92 Q{lean + math.cos(r)*l*.5:.0f},{-92 + math.sin(r)*l*.55 - 16:.0f} {ex:.0f},{ey:.0f}", "none", "#78cf7a", 3.4, 'stroke-linecap="round" opacity=".8"')
        g += circle(lean - 4, -88, 5, "#7d5a3a") + circle(lean + 5, -86, 5, "#7d5a3a")
        return g + "</g>"
    decor += palm(96, 214, 1.05, -14) + palm(138, 204, .8, 18) + palm(508, 214, .95, 10)
    # guarda-sol
    decor += f'<g transform="translate(232,206)">' + rect(-2, -62, 4, 70, "#d0d4dc", 2) + path("M-52,-58 Q0,-110 52,-58 Q26,-66 0,-58 Q-26,-66 -52,-58Z", "#ff6f86", f'stroke="{OUTLINE}" stroke-width="1.8"')
    decor += path("M-26,-84 Q-14,-70 -6,-60 L6,-60 Q14,-70 26,-84 Q8,-96 -8,-96Z", "#ffffff", 'opacity=".95"') + path("M-52,-58 Q-40,-50 -26,-58 Q-12,-50 0,-58 Q12,-50 26,-58 Q40,-50 52,-58", "none", "#ffd0da", 3) + "</g>"
    # espreguiçadeiras
    for x, c in [(300, "#ffb0c8"), (346, "#ffdc6a")]:
        decor += f'<g transform="translate({x},238)">' + path("M-18,-6 L10,-26 L22,-18 L-4,6Z", c, OUTLINE, 1.5) + path("M-18,-6 L-30,8 L-6,12 L-4,6Z", c, OUTLINE, 1.5) + path("M-14,-4 L8,-20", "none", "#ffffff", 2.4, 'opacity=".7"') + "</g>"
    # estrela do mar / conchas
    decor += poly([(172, 254), (176, 262), (185, 262), (178, 268), (181, 276), (172, 271), (163, 276), (166, 268), (159, 262), (168, 262)], "#ff8fa8") + ell(142, 250, 8, 6, "#ffd8e2", f'stroke="{OUTLINE}" stroke-width="1" stroke-opacity=".5"')
    # placa
    decor += sign(166, 224, .86)
    # doca + veleiro
    dock = f'<g transform="translate(430,246)">' + rect(0, 0, 120, 16, "#c68d5e", 3, f'stroke="{OUTLINE}" stroke-width="1.6"')
    for i in range(6): dock += rect(8 + i * 19, 0, 2, 16, "#a56f45")
    dock += rect(10, 14, 6, 26, "#8a5a38", 2) + rect(54, 14, 6, 26, "#8a5a38", 2) + rect(98, 14, 6, 26, "#8a5a38", 2) + "</g>"
    boat = f'<g transform="translate(496,214)">' + rect(-2, -80, 4, 80, "#7a5238", 1) + poly([(4, -76), (4, -8), (44, -8)], "#ffffff", f'stroke="{OUTLINE}" stroke-width="1.6" stroke-linejoin="round"') + poly([(-4, -66), (-4, -10), (-30, -10)], "#ffd2de", f'stroke="{OUTLINE}" stroke-width="1.6" stroke-linejoin="round"')
    boat += path("M-34,-6 L48,-6 Q40,12 24,12 L-18,12 Q-30,10 -34,-6Z", "#ff7c8e", OUTLINE, 1.8) + rect(-30, -4, 74, 4, "#ffffff", 2, 'opacity=".8"') + poly([(4, -76), (22, -70), (4, -64)], "#ff4f6d") + "</g>"
    return island(("#ffeab4", "#f6d27e", "#fff6d6"), "#e2b45f", "#c79a78", "#7b5870",
        [("M92,292 Q220,330 330,318", "#e8c1a2"), ("M140,350 Q250,378 340,372", "#9a6b78"), ("M390,300 Q470,296 520,282", "#e8c1a2")],
        extras_before=water, decor=decor + dock + boat, fall=waterfall(150, 270, 378, 24), seed=7)

def theme_4():
    def sakura(x, y, s=1):
        g = f'<g transform="translate({x},{y}) scale({s})">' + path("M-8,0 Q-6,-30 -2,-52 Q12,-40 14,-24 Q6,-22 8,0Z", "#7b4a3a", OUTLINE, 1.4)
        for cx, cy, r, c in [(-34, -66, 28, "#ff9fc4"), (30, -68, 28, "#ff9fc4"), (0, -92, 34, "#ffb5d2"), (-12, -62, 28, "#ffb5d2"), (16, -60, 26, "#ffc4dc")]:
            g += circle(cx, cy, r, c)
        for cx, cy in [(-14, -100), (12, -84), (-36, -74), (30, -60), (-4, -70), (22, -98)]: g += circle(cx, cy, 5, "#ffe3ee", 'opacity=".9"')
        return g + "</g>"
    decor = ""
    decor += path("M120,250 Q230,226 330,246 Q430,266 500,246", "none", "#cbbba8", 18, 'stroke-linecap="round"') + path("M120,250 Q230,226 330,246 Q430,266 500,246", "none", "#e6dac8", 10, 'stroke-linecap="round"')
    decor += sakura(100, 214, 1.05) + sakura(506, 210, .95) + sakura(460, 200, .78) + sakura(150, 198, .7)
    # lagoa + ponte
    decor += ell(318, 246, 78, 20, "#7fd0ec", f'stroke="{OUTLINE}" stroke-opacity=".4" stroke-width="1.6"') + ell(308, 242, 46, 9, "#b8ecfb", 'opacity=".7"')
    decor += path("M262,244 Q318,214 374,244", "none", "#8a4f3a", 12, 'stroke-linecap="round"') + path("M262,244 Q318,214 374,244", "none", "#c27a56", 5, 'stroke-linecap="round"') + path("M270,232 Q318,206 366,232", "none", "#d94a52", 3.4)
    # torii
    decor += f'<g transform="translate(232,196)">' + rect(-44, -62, 10, 72, "#e04a4f", 2, f'stroke="{OUTLINE}" stroke-width="1.6"') + rect(34, -62, 10, 72, "#e04a4f", 2, f'stroke="{OUTLINE}" stroke-width="1.6"')
    decor += path("M-62,-70 Q0,-54 62,-70 L58,-58 Q0,-44 -58,-58Z", "#2f2a3a", OUTLINE, 1.6) + rect(-50, -44, 100, 9, "#e04a4f", 3, f'stroke="{OUTLINE}" stroke-width="1.4"') + rect(-5, -48, 10, 16, "#2f2a3a", 2) + "</g>"
    # casa japonesa
    decor += f'<g transform="translate(430,176)">' + rect(-44, -4, 88, 54, "#f3e4cb", 4, f'stroke="{OUTLINE}" stroke-width="2"') + rect(-44, 28, 88, 6, "#9a6b4a")
    decor += path("M-64,2 Q-40,-8 -32,-26 L0,-48 L32,-26 Q40,-8 64,2 Q40,10 0,6 Q-40,10 -64,2Z", "#4c4a66", OUTLINE, 2) + path("M-52,0 Q0,12 52,0", "none", "#6c6a8c", 3) + rect(-12, 14, 24, 36, "#a06d4a", 3) + rect(-38, 10, 18, 18, "#fff1c2", 3, f'stroke="{OUTLINE}" stroke-width="1.4"') + rect(20, 10, 18, 18, "#fff1c2", 3, f'stroke="{OUTLINE}" stroke-width="1.4"') + "</g>"
    for x in (176, 372):
        decor += f'<g transform="translate({x},242)">' + rect(-3, -22, 6, 26, "#9aa0ac", 2) + rect(-9, -40, 18, 20, "#ff7f8e", 5, f'stroke="{OUTLINE}" stroke-width="1.4"') + rect(-11, -44, 22, 6, "#6a6f80", 2) + circle(0, -30, 4, "#fff2b8") + "</g>"
    petals = "".join(f'<ellipse cx="{x}" cy="{y}" rx="4" ry="2.4" transform="rotate({r} {x} {y})" fill="#ffc4dc" opacity=".9"/>' for x, y, r in [(150, 236, 20), (206, 258, -30), (300, 268, 10), (420, 262, 40), (520, 244, -20), (70, 242, 30), (270, 150, -10), (350, 130, 25)])
    return island(("#bde77e", "#8fd05e", "#e0f8aa"), "#58a14b", "#bf8a78", "#79526a",
        [("M92,292 Q220,330 330,318", "#e0aea0"), ("M140,350 Q250,378 340,372", "#a46d80"), ("M390,300 Q470,296 520,282", "#e0aea0")],
        decor=decor + petals, fall=waterfall(120, 270, 372, 22), seed=13)

def theme_5():
    decor = ""
    decor += path("M110,248 Q230,226 330,250 Q420,270 500,246", "none", "#fff2f6", 16, 'stroke-linecap="round" opacity=".95"')
    # casinha-bolo com laço
    decor += f'<g transform="translate(300,170)">' + path("M-92,56 Q-96,-6 -64,-24 Q-30,-60 0,-58 Q30,-60 64,-24 Q96,-6 92,56Z", "#ffb6cd", OUTLINE, 2.2, 'stroke-opacity=".6"')
    decor += path("M-82,2 Q-74,-14 -64,-4 Q-56,-18 -44,-6 Q-34,-20 -24,-6 Q-12,-22 0,-8 Q12,-22 24,-6 Q34,-20 44,-6 Q56,-18 64,-4 Q74,-14 82,2 Q70,22 60,10 Q46,26 36,10 Q22,26 10,10 Q0,26 -10,10 Q-22,26 -36,10 Q-46,26 -60,10 Q-72,22 -82,2Z", "#fff3f6")
    for x, y, c in [(-60, -10, "#ff5f88"), (-30, -34, "#ffd34d"), (28, -36, "#7fd0ec"), (58, -12, "#ff5f88"), (0, -24, "#ffffff")]: decor += circle(x, y, 4, c)
    decor += rect(-26, 18, 52, 40, "#c78b5e", 8, f'stroke="{OUTLINE}" stroke-width="1.8"') + path("M-26,34 L26,34", "none", "#a36d45", 2) + circle(14, 40, 2.6, "#ffd34d") + rect(-70, 20, 28, 26, "#fff0c8", 5, f'stroke="{OUTLINE}" stroke-width="1.6"') + rect(42, 20, 28, 26, "#fff0c8", 5, f'stroke="{OUTLINE}" stroke-width="1.6"')
    decor += heart(-56, 33, 8, "#ff6f9f") + heart(56, 33, 8, "#ff6f9f")
    # laço vermelho no topo
    decor += path("M0,-56 C-18,-92 -62,-86 -56,-58 C-52,-44 -20,-48 0,-56Z", "#ee3b5f", OUTLINE, 2) + path("M0,-56 C18,-92 62,-86 56,-58 C52,-44 20,-48 0,-56Z", "#ee3b5f", OUTLINE, 2) + circle(0, -58, 11, "#ff6f87", f'stroke="{OUTLINE}" stroke-width="2"') + circle(-3, -61, 3.4, "#ffc4d0")
    decor += path("M-34,-66 Q-44,-74 -50,-66", "none", "#ff9eb0", 3, 'opacity=".8"') + "</g>"
    # pirulitos e bengalas
    def lolli(x, y, c1, c2, s=1):
        g = f'<g transform="translate({x},{y}) scale({s})">' + rect(-2.2, -4, 4.4, 56, "#fff6fa", 2, f'stroke="{OUTLINE}" stroke-width="1" stroke-opacity=".5"') + circle(0, -22, 23, c1, f'stroke="{OUTLINE}" stroke-width="1.6"')
        g += path("M0,-22 m-17,0 a17,17 0 1 1 34,0", "none", c2, 5, 'opacity=".95"') + path("M0,-22 m-9,0 a9,9 0 1 0 18,0", "none", c2, 4.4) + circle(-8, -30, 4.5, "#ffffff", 'opacity=".6"')
        return g + "</g>"
    decor += lolli(98, 232, "#ff8fb3", "#fff3f6", 1.0) + lolli(140, 218, "#9fe0f2", "#ffffff", .8) + lolli(510, 226, "#ffd86a", "#ff7f9f", .95) + lolli(462, 214, "#c9a8ff", "#ffffff", .75)
    decor += sign(212, 252, .78) + sign(398, 252, .0001, False)
    decor += "".join(heart(x, y, 5, c) for x, y, c in [(176, 262, "#ff9fbd"), (440, 260, "#ffc2d4"), (330, 270, "#ff9fbd")])
    sprinkles = "".join(f'<rect x="{x}" y="{y}" width="8" height="3" rx="1.5" transform="rotate({r} {x} {y})" fill="{c}"/>' for x, y, r, c in [(140, 252, 20, "#ff5f88"), (260, 262, -20, "#7fd0ec"), (360, 266, 30, "#ffd34d"), (480, 250, -30, "#ff5f88"), (80, 236, 40, "#c9a8ff"), (520, 232, 10, "#7fd0ec")])
    # gotejado na lateral (cobertura)
    drip = path("M42,224 Q52,246 70,236 Q84,262 104,246 Q124,272 144,254 Q172,284 198,262 Q230,292 262,268 Q300,294 340,270 Q376,292 410,266 Q438,284 462,258 Q488,268 506,244 Q530,246 558,224 Q560,236 548,250 Q500,282 300,296 Q110,288 52,250Z", "#fff3f6", OUTLINE, 1.4, 'stroke-opacity=".3"')
    return island(("#ffd3e2", "#ffb9d0", "#fff0f5"), "#ff9dbb", "#f5b6b0", "#c0788f",
        [("M92,292 Q220,330 330,318", "#ffd2c8"), ("M140,350 Q250,378 340,372", "#b36684"), ("M390,300 Q470,296 520,282", "#ffd2c8")],
        decor=decor + sprinkles, extras_after="", fall=waterfall(450, 268, 380, 24, "#ffc2da", "#fff0f6"), seed=17).replace("</svg>", drip.replace("fill=", 'fill=', 1) + "</svg>") if False else \
        island(("#ffd3e2", "#ffb9d0", "#fff0f5"), "#ff9dbb", "#f5b6b0", "#c0788f",
        [("M92,292 Q220,330 330,318", "#ffd2c8"), ("M140,350 Q250,378 340,372", "#b36684"), ("M390,300 Q470,296 520,282", "#ffd2c8")],
        decor=decor + sprinkles, fall=waterfall(450, 268, 380, 24, "#ffc2da", "#fff0f6"), seed=17)

def theme_6():
    decor = ""
    decor += path("M150,258 Q290,238 440,260", "none", "#cdbf9c", 16, 'stroke-linecap="round" opacity=".9"')
    # torre de pedra
    decor += f'<g transform="translate(260,150)">' + rect(-34, -34, 68, 100, "#c4c0cc", 4, f'stroke="{OUTLINE}" stroke-width="2.2"')
    for r in range(6):
        for c in range(3): decor += rect(-34 + c * 23 + (r % 2) * 11 - (11 if r % 2 else 0), -34 + r * 17, 22, 16, "none", 2, 'stroke="#a09cae" stroke-width="1.3"')
    for x in (-34, -12, 10, 32): decor += rect(x - 4, -48, 14, 16, "#c4c0cc", 2, f'stroke="{OUTLINE}" stroke-width="1.6"')
    decor += path("M-10,66 L-10,34 Q0,22 10,34 L10,66Z", "#5a4660", OUTLINE, 1.6) + rect(-5, -14, 10, 18, "#4a3a55", 4)
    decor += rect(-2, -86, 4, 40, "#7a5238", 1) + poly([(2, -86), (40, -76), (2, -66)], "#ee4a5a", f'stroke="{OUTLINE}" stroke-width="1.4"') + path("M-34,-8 q-10,16 -2,28", "none", "#58b04a", 5, 'stroke-linecap="round"') + circle(-32, 6, 6, "#58b04a") + "</g>"
    # muralha quebrada
    decor += f'<g transform="translate(150,226)">' + rect(-52, -30, 40, 34, "#bdb9c8", 4, f'stroke="{OUTLINE}" stroke-width="2"') + rect(-8, -16, 34, 20, "#bdb9c8", 3, f'stroke="{OUTLINE}" stroke-width="2"') + rect(-52, -40, 14, 12, "#bdb9c8", 2, f'stroke="{OUTLINE}" stroke-width="1.6"') + bush(-30, -30, .6) + "</g>"
    decor += tree_round(420, 200, .85) + bush(505, 214, .9) + bush(86, 222, 1.0)
    # bandeira gatinha em poste
    decor += f'<g transform="translate(472,232)">' + rect(-2, -62, 4, 66, "#7a5238", 1) + rect(2, -60, 36, 40, "#ff8fb3", 3, f'stroke="{OUTLINE}" stroke-width="1.6"') + kitty_face(20, -40, .5) + "</g>"
    # ponte de madeira
    decor += f'<g transform="translate(336,250)">' + rect(0, 0, 80, 11, "#c68d5e", 3, f'stroke="{OUTLINE}" stroke-width="1.5"')
    for i in range(5): decor += rect(5 + i * 15, 0, 2, 11, "#a56f45")
    decor += rect(4, -12, 4, 14, "#8a5a38") + rect(72, -12, 4, 14, "#8a5a38") + path("M6,-10 L74,-10", "none", "#d9a371", 3) + "</g>"
    decor += "".join(flower(x, y, c, .9) for x, y, c in [(214, 244, "#ffffff"), (240, 254, "#ffb3cf"), (92, 244, "#ffd75c"), (516, 240, "#ffffff")])
    return island(("#b6dd7a", "#86c657", "#d4f2a0"), "#4a9a46", "#b3877a", "#6f4f68",
        [("M92,292 Q220,330 330,318", "#d9b0a2"), ("M140,350 Q250,378 340,372", "#9a6978"), ("M390,300 Q470,296 520,282", "#d9b0a2")],
        decor=decor, fall=waterfall(408, 268, 384, 28), seed=19)

def theme_7():
    # base de nuvem rosada no lugar da rocha
    clouds = ""
    for x, y, s, c in [(120, 300, 1.2, "#ffffff"), (480, 300, 1.2, "#ffffff"), (300, 322, 1.7, "#fff7fb"), (210, 340, 1.3, "#ffffff"), (392, 342, 1.3, "#ffffff"), (300, 366, 1.2, "#ffe9f3"), (250, 392, .9, "#ffffff"), (350, 394, .9, "#ffffff")]:
        clouds += cloud_puff(x, y, s, c)
    base_glow = ell(300, 400, 250, 100, "#ffd3e6", 'opacity=".35"')
    decor = ""
    decor += path("M300,270 L300,214", "none", "#f6dcc0", 36, 'stroke-linecap="round"')
    for i in range(5): decor += rect(268 + i * 3, 232 + i * 8, 64 - i * 6, 6, "#ffd6e6", 3, f'stroke="#ff9fc0" stroke-width="1"')
    def tower(x, y, w, h, roof, c="#ffc8dc"):
        g = f'<g transform="translate({x},{y})">' + rect(-w / 2, -h, w, h, c, 4, f'stroke="{OUTLINE}" stroke-width="1.8" stroke-opacity=".7"')
        g += rect(-w / 2 + 3, -h + 3, w * .22, h - 6, "#ffe3ee", 3, 'opacity=".6"')
        g += poly([(-w / 2 - 6, -h + 2), (0, -h - w * 1.05), (w / 2 + 6, -h + 2)], roof, f'stroke="{OUTLINE}" stroke-width="1.8" stroke-opacity=".7" stroke-linejoin="round"')
        g += rect(-5, -h * .62, 10, 18, "#ffeaa8", 5, f'stroke="{OUTLINE}" stroke-width="1.2"') + circle(0, -h - w * 1.05, 3.5, "#ffd34d")
        return g + "</g>"
    decor += tower(180, 232, 48, 90, "#ff7fa6") + tower(420, 232, 48, 90, "#ff7fa6") + tower(236, 220, 40, 66, "#ff9bb9", "#ffd6e6") + tower(364, 220, 40, 66, "#ff9bb9", "#ffd6e6")
    # castelo central
    decor += f'<g transform="translate(300,236)">' + rect(-62, -92, 124, 92, "#ffd1e3", 5, f'stroke="{OUTLINE}" stroke-width="2" stroke-opacity=".7"') + rect(-56, -88, 24, 84, "#ffeaf3", 4, 'opacity=".55"')
    decor += rect(-28, -150, 56, 66, "#ffc3da", 5, f'stroke="{OUTLINE}" stroke-width="2" stroke-opacity=".7"') + poly([(-36, -146), (0, -228), (36, -146)], "#ff6f9f", f'stroke="{OUTLINE}" stroke-width="2" stroke-opacity=".7" stroke-linejoin="round"')
    decor += circle(0, -230, 5, "#ffd34d") + path("M0,-234 L0,-252", "none", OUTLINE, 2) + poly([(0, -252), (20, -246), (0, -240)], "#ff4f7a")
    decor += path("M-18,0 L-18,-34 Q0,-56 18,-34 L18,0Z", "#a95e86", OUTLINE, 1.8) + heart(0, -122, 12, "#ff5f90") + circle(0, -98, 11, "#fff0b8", f'stroke="{OUTLINE}" stroke-width="1.4"')
    for x in (-44, 44): decor += rect(x - 9, -70, 18, 26, "#bde8ff", 7, f'stroke="{OUTLINE}" stroke-width="1.4"')
    decor += "</g>"
    decor += "".join(f'<g transform="translate({x},{y})">' + circle(0, 0, 20, "#ffb7d1") + circle(-12, -8, 17, "#ffc9de") + circle(12, -6, 17, "#ffc9de") + circle(0, -16, 18, "#ffd9e8") + rect(-3, 10, 6, 14, "#a9786a") + "</g>" for x, y in [(86, 238), (516, 238), (128, 262), (474, 262)])
    sparkle = "".join(poly([(x, y - 9), (x + 2.6, y - 2.6), (x + 9, y), (x + 2.6, y + 2.6), (x, y + 9), (x - 2.6, y + 2.6), (x - 9, y), (x - 2.6, y - 2.6)], "#fff3b0") for x, y in [(90, 120), (520, 150), (300, 40), (210, 86), (400, 84), (60, 300), (544, 296)])
    # sem rocha: as nuvens fazem a base da ilha
    return island(("#ffe7f1", "#ffcde0", "#ffffff"), "#ffb0cc", "#ffd9ec", "#ffb4d2", [], extras_before=clouds, decor=decor + sparkle, seed=23, rocky=False)

THEMES = [theme_1, theme_2, theme_3, theme_4, theme_5, theme_6, theme_7]

def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new("RGBA", (720 * 4 // 2, 672 * 2 // 2 + 336), (150, 200, 245, 255))
    for i, fn in enumerate(THEMES, start=1):
        im = to_webp(fn(), f"island-{i}.webp")
        thumb = im.resize((360, 336))
        sheet.alpha_composite(thumb, ((i - 1) % 4 * 360, (i - 1) // 4 * 336))
    if "--preview" in sys.argv:
        sheet.convert("RGB").save(sys.argv[sys.argv.index("--preview") + 1])
    print("ok:", ", ".join(f"island-{i}.webp" for i in range(1, 8)))

if __name__ == "__main__":
    main()
