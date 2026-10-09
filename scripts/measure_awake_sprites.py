#!/usr/bin/env python3
"""
Calcula o ajuste de tamanho/posição (AWAKE_HOME_FIT em frontend/components/idle/kittydev/kittyDevHelpers.ts)
para que o sprite DESPERTADO apareça na tela inicial do mundo com o mesmo tamanho do sprite NORMAL.

Uso (na raiz do repositório):  python3 scripts/measure_awake_sprites.py
Rode de novo sempre que trocar/adicionar um sprite em frontend/public/idle/characters/awake/.
Cole a saída na tabela AWAKE_HOME_FIT. A Hello Kitty fica de fora de propósito (ajuste manual).
"""
import math, os, re, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
PUBLIC = os.path.join(ROOT, "frontend", "public")
CONFIG = os.path.join(ROOT, "backend", "src", "idle", "idleConfig.ts")
KDCONF = os.path.join(ROOT, "backend", "src", "idle", "kittyDevConfig.ts")


def content_box(path):
    im = Image.open(path).convert("RGBA")
    alpha = im.split()[3].point(lambda v: 255 if v > 16 else 0)
    box = alpha.getbbox()
    w, h = im.size
    s = 1 / max(w, h)  # object-fit: contain dentro de uma caixa quadrada 1x1
    cw, ch = (box[2] - box[0]) * s, (box[3] - box[1]) * s
    cx = ((box[0] + box[2]) / 2 - w / 2) * s
    cy = ((box[1] + box[3]) / 2 - h / 2) * s
    return cw, ch, cx, cy


normal = dict(re.findall(r'\{ id: "([a-z0-9-]+)", name: "[^"]+", asset: "(/idle/characters/v2/[^"]+)"', open(CONFIG, encoding="utf-8").read()))
awake = dict(re.findall(r'"?([a-z0-9-]+)"?: "(/idle/characters/awake/[^"]+)"', open(KDCONF, encoding="utf-8").read()))

for cid, awake_path in awake.items():
    if cid == "hello-kitty" or cid not in normal:
        continue
    nw, nh, ncx, ncy = content_box(os.path.join(PUBLIC, normal[cid].lstrip("/")))
    aw, ah, acx, acy = content_box(os.path.join(PUBLIC, awake_path.lstrip("/")))
    scale = math.sqrt((nw * nh) / (aw * ah))                 # mesma "massa" visual
    tx = ncx - scale * acx                                    # mesmo centro horizontal
    ty = (ncy + nh / 2) - scale * (acy + ah / 2)              # mesma linha do chão
    print(f'  "{cid}": {{ scale: {scale:.3f}, x: {tx * 100:.1f}, y: {ty * 100:.1f} }},')
