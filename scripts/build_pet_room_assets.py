"""Build the shared pet room catalog and optimized sprites.

Two collections share the same slots, so equipping an item of one replaces the other:
  * feminine  - the original catalog (10 legacy items + 79 from the supplied ZIP)
  * masculine - the "59 novas decorações de max" sprites that already live in the repo

Usage: python3 scripts/build_pet_room_assets.py /path/to/assetsquarto.zip   (feminine sprites + catalog)
       python3 scripts/build_pet_room_assets.py --catalog-only              (catalog only)
       python3 scripts/build_pet_room_assets.py --optimize-masculine        (trim/resize masculine sprites in place + catalog)
Requires Pillow. The two generated JSON files are checked for parity in tests.
"""
import json
import sys
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend/public/images/pets/room"
FRONT = ROOT / "frontend/pets/catalog.json"
BACK = ROOT / "backend/src/pets/catalog.json"


def entry(id, name, price, category, slot, position, layer, stack, *, kind="decor", light=None, conflicts=None,
          collection="feminine"):
    folder = "structure" if kind == "structure" else "decor"
    result = dict(id=id, name=name, price=price, asset=f"/images/pets/room/{folder}/{id}.webp",
                  collection=collection, category=category, slot=slot, kind=kind, position=position,
                  layer=layer, stack=stack)
    if light:
        result["light"] = light
    if conflicts:
        result["conflictsWithSlots"] = conflicts
    return result


anchors = {
    "wall-heart": (dict(left=7, top=15, width=11.5), "wall", 30),
    "wall-paw": (dict(left=7, top=28.5, width=11.5), "wall", 31),
    "wall-shelf": (dict(left=70, top=29, width=27), "wall", 32),
    "floor-plant": (dict(left=-1, bottom=33.5, width=31), "rear", 60),
    "floor-rug": (dict(left=12, bottom=3.5, width=76), "rear", 50),
    "floor-bed": (dict(left=0, bottom=21.5, width=38), "rear", 70),
    "floor-dresser": (dict(left=77.5, bottom=27, width=21), "rear", 65),
    "floor-lamp": (dict(left=82.25, bottom=42.5, width=11.5), "rear", 125),
    "floor-bowls": (dict(left=73, bottom=7.5, width=25), "front", 74),
    "floor-bone": (dict(left=71, bottom=16.5, width=13.5), "rear", 72),
    "window-curtain": (dict(left=50, top=8.5, width=55), "wall", 40),
    "wall-garland": (dict(left=23, top=8.5, width=54), "wall", 45),
    "wall-right-accent": (dict(left=82, top=15, width=16), "wall", 35),
    "floor-left-accent": (dict(left=1.5, bottom=9, width=18), "rear", 76),
    "floor-right-accent": (dict(left=80, bottom=15.5, width=17), "front", 78),
    "wall-left-feature": (dict(left=6.2, top=14.5, width=12.8), "wall", 34),
    "room-wall": (dict(left=0, top=0, width=100), "wall", 0),
    "room-floor": (dict(left=0, top=61, width=100), "rear", 0),
    "room-baseboard": (dict(left=0, top=59.9, width=100), "wall", 1),
}

legacy = [
    ("heart-frame", "Quadro coração", 140, "Parede", "wall-heart"),
    ("paw-poster", "Quadro patinha", 120, "Parede", "wall-paw"),
    ("shelf", "Prateleira", 260, "Parede", "wall-shelf"),
    ("plant", "Planta", 220, "Chão", "floor-plant"),
    ("rug", "Tapete", 320, "Chão", "floor-rug"),
    ("bed", "Caminha", 500, "Móveis", "floor-bed"),
    ("dresser", "Cômoda", 400, "Móveis", "floor-dresser"),
    ("lamp", "Abajur", 180, "Móveis", "floor-lamp"),
    ("bowls", "Potes", 100, "Chão", "floor-bowls"),
    ("bone", "Ossinho", 80, "Brinquedos", "floor-bone"),
]

# filename prefix (after file_00000000), semantic ID, display name, price,
# category, persistent slot, optional position adjustment and lamp light origin.
new = [
    ("0184", "rug-celestial", "Tapete celestial", 2500, "Chão", "floor-rug"),
    ("6928", "rug-paw", "Tapete patinha", 300, "Chão", "floor-rug", dict(left=20, width=60)),
    ("6d20", "rug-cloud", "Tapete nuvem", 800, "Chão", "floor-rug"),
    ("73cc", "rug-flower", "Tapete flor", 450, "Chão", "floor-rug"),
    ("9e48", "rug-bow", "Tapete laço", 1300, "Chão", "floor-rug"),
    ("1f24", "bed-bow", "Caminha com laço", 500, "Móveis", "floor-bed"),
    ("37d0", "bed-flower", "Caminha flor", 850, "Móveis", "floor-bed"),
    ("b050", "bed-heart", "Caminha coração", 1100, "Móveis", "floor-bed"),
    ("4fe0", "bed-cloud", "Caminha nuvem", 1400, "Móveis", "floor-bed"),
    ("1640", "bed-princess", "Caminha princesa", 2200, "Móveis", "floor-bed", dict(left=-1, width=40)),
    ("8678", "bed-winged", "Caminha alada", 3800, "Móveis", "floor-bed", dict(left=-1.5, bottom=21, width=41)),
    ("d09c", "plant-compact", "Planta compacta", 250, "Chão", "floor-plant", dict(left=.5, width=25)),
    ("ac08", "plant-daisies", "Vaso de margaridas", 320, "Chão", "floor-plant", dict(left=0, width=27)),
    ("2304", "plant-hanging", "Planta pendente", 600, "Chão", "floor-plant", dict(left=1, top=40, width=20, bottom=None)),
    ("fb84", "plant-heart-topiary", "Topiaria coração", 1100, "Chão", "floor-plant", dict(left=0, bottom=33.2, width=26)),
    ("8798", "plant-roses", "Arranjo de rosas", 1800, "Chão", "floor-plant", dict(left=0, width=28)),
    ("1154", "dresser-stars", "Cômoda estrelas", 600, "Móveis", "floor-dresser"),
    ("250c", "dresser-heart", "Cômoda coração", 700, "Móveis", "floor-dresser", dict(left=76, width=23)),
    ("a768", "dresser-bow", "Cômoda com laço", 950, "Móveis", "floor-dresser", dict(left=76, width=23)),
    ("e7a4", "dresser-floral", "Cômoda floral", 1500, "Móveis", "floor-dresser", dict(left=76, width=23)),
    ("566c", "dresser-mini-cabinet", "Mini armário coração", 1600, "Móveis", "floor-dresser"),
    ("f84c", "dresser-gold", "Cômoda rosé dourada", 2600, "Móveis", "floor-dresser", dict(left=76, width=23)),
    ("5fc8", "lamp-floral", "Abajur floral", 300, "Móveis", "floor-lamp", {}, dict(originX=50, originY=26)),
    ("06bc", "lamp-moon", "Abajur lua", 700, "Móveis", "floor-lamp", {}, dict(originX=50, originY=31)),
    ("d6f8", "lamp-cloud", "Abajur nuvem", 1200, "Móveis", "floor-lamp", {}, dict(originX=50, originY=27)),
    ("ca28", "lamp-star", "Abajur estrela", 2100, "Móveis", "floor-lamp", {}, dict(originX=50, originY=25)),
    ("23a8", "dresser-cookie-jar-bow", "Pote de biscoitos com laço", 500, "Móveis", "floor-lamp", dict(left=83.1, bottom=42.8, width=10.5)),
    ("4ad4", "dresser-cookie-jar-heart", "Pote de biscoitos coração", 900, "Móveis", "floor-lamp", dict(left=83.1, bottom=42.8, width=10.5)),
    ("6804", "dresser-snowglobe", "Globo de neve coelhinho", 1300, "Móveis", "floor-lamp", dict(left=83.2, bottom=42.5, width=10.5)),
    ("e540", "dresser-music-box", "Caixinha de música", 1800, "Móveis", "floor-lamp", dict(left=83, bottom=42.3, width=11)),
    ("3590", "bowls-polka", "Potes poá", 120, "Chão", "floor-bowls"),
    ("4e6c", "bowls-strawberry", "Potes moranguinho", 220, "Chão", "floor-bowls"),
    ("f78c", "bowls-bow", "Potes com laços", 380, "Chão", "floor-bowls"),
    ("4568", "bowls-porcelain", "Potes porcelana", 750, "Chão", "floor-bowls"),
    ("51e0", "toy-rope-pink", "Cordinha rosa", 140, "Brinquedos", "floor-bone", dict(left=68.5, width=17)),
    ("47c4", "toy-bone-plush", "Ossinho de pelúcia", 260, "Brinquedos", "floor-bone"),
    ("5d14", "toy-bone-bow", "Ossinho com laço", 380, "Brinquedos", "floor-bone", dict(left=69.5, width=16)),
    ("fb44", "toy-mouse", "Ratinho de pelúcia", 450, "Brinquedos", "floor-bone", dict(left=70, bottom=16.2, width=14.5)),
    ("df5c", "toy-rope-pastel", "Corda trançada pastel", 500, "Brinquedos", "floor-bone", dict(left=68.5, width=17)),
    ("ed1c", "toy-ball-paw", "Bola de patinha", 500, "Brinquedos", "floor-bone", dict(left=71, width=13.5)),
    ("61fc", "frame-bow", "Quadro laço", 180, "Parede", "wall-heart"),
    ("26c8", "frame-flower", "Quadro flor", 220, "Parede", "wall-heart"),
    ("9fdc", "frame-stars", "Quadro estrelinhas", 320, "Parede", "wall-heart"),
    ("2a6c", "frame-crown", "Quadro coroa", 520, "Parede", "wall-heart"),
    ("3db0", "frame-husky", "Retrato husky", 900, "Parede", "wall-heart"),
    ("b284", "frame-puppy", "Retrato cãozinho", 900, "Parede", "wall-heart"),
    ("31dc", "frame-bone", "Quadro ossinho", 180, "Parede", "wall-paw"),
    ("af10", "frame-paw-classic", "Quadro patinha clássico", 240, "Parede", "wall-paw"),
    ("4670", "frame-medal", "Quadro medalha", 650, "Parede", "wall-paw"),
    ("f558", "frame-double", "Quadro duplo coração e patinha", 1200, "Parede", "wall-left-feature"),
    ("2740", "shelf-books-candle", "Prateleira com livros e vela", 350, "Parede", "wall-shelf"),
    ("19a0", "curtain-floral", "Cortina floral", 700, "Parede", "window-curtain"),
    ("4c94", "curtain-stars", "Cortina estrelas", 1100, "Parede", "window-curtain"),
    ("7520", "curtain-cloud", "Cortina nuvem", 1600, "Parede", "window-curtain"),
    ("a544", "curtain-hearts", "Cortina corações", 2600, "Parede", "window-curtain"),
    ("4dcc", "garland-hearts", "Guirlanda de corações", 750, "Parede", "wall-garland"),
    ("1d10", "garland-hearts-light", "Luzes de corações", 900, "Parede", "wall-garland"),
    ("8320", "garland-stars", "Guirlanda de estrelas", 1100, "Parede", "wall-garland"),
    ("b878", "garland-stars-light", "Luzes de estrelas", 1300, "Parede", "wall-garland"),
    ("d550", "wall-nameplate", "Placa decorativa", 450, "Parede", "wall-right-accent", dict(left=76.5, top=16, width=21)),
    ("e1ac", "wall-clock-bow", "Relógio de laço", 500, "Parede", "wall-right-accent", dict(left=82, top=14.5, width=14)),
    ("1374", "wall-mirror-bow", "Espelho de laço", 950, "Parede", "wall-right-accent", dict(left=81, top=14, width=17)),
    ("05e8", "wall-led-heart", "Coração LED", 1400, "Parede", "wall-right-accent", dict(left=82, top=15, width=14)),
    ("5868", "wall-neon-heart", "Coração neon", 2200, "Parede", "wall-right-accent", dict(left=82, top=15, width=14)),
    ("9394", "accent-teddy", "Ursinho rosa", 450, "Chão", "floor-left-accent"),
    ("e1f4", "accent-storage-box", "Caixa organizadora", 850, "Chão", "floor-left-accent"),
    ("d08c", "accent-blankets", "Cesta de mantinhas", 900, "Chão", "floor-left-accent"),
    ("a254", "accent-chest", "Baú coração", 1700, "Chão", "floor-left-accent"),
    ("b32c", "accent-toy-basket", "Cesta de brinquedos", 350, "Chão", "floor-right-accent"),
    ("cbb0", "accent-toy-basket-premium", "Cesta de brinquedos premium", 900, "Chão", "floor-right-accent"),
    ("2a40", "floor-rose", "Piso madeira rosé", 850, "Estrutura", "room-floor"),
    ("4274", "floor-whitewash", "Piso madeira clara", 1200, "Estrutura", "room-floor"),
    ("a974", "floor-honey", "Piso madeira mel", 1400, "Estrutura", "room-floor"),
    ("0cb0", "wall-floral", "Parede floral rosa", 1200, "Estrutura", "room-wall"),
    ("a890", "wall-striped-hearts", "Parede listrada com corações", 1400, "Estrutura", "room-wall"),
    ("ca10", "wall-mauve-paws", "Parede mauve com patinhas", 1700, "Estrutura", "room-wall"),
    ("7b70", "baseboard-pink", "Rodapé rosa liso", 500, "Estrutura", "room-baseboard"),
    ("a92c", "baseboard-rosewood", "Rodapé madeira rosé", 700, "Estrutura", "room-baseboard"),
    ("bfe8", "baseboard-hearts", "Rodapé de corações", 900, "Estrutura", "room-baseboard"),
]

# Masculine collection ("59 novas decorações de max"). The sprites are already in the repo, so there is no
# ZIP prefix: id (== file name), display name, price, category, shared slot, optional position override and
# lamp light origin. Slots, layers and stacking come from `anchors`, exactly like the feminine items, so a
# masculine item replaces whatever feminine item sits in the same slot (and vice versa).
# Prices follow the feminine ladders slot by slot: simplest piece cheapest, most elaborate the dearest.
masculine = [
    # Beds
    ("blue-dog-bed", "Caminha azul", 500, "Móveis", "floor-bed", dict(width=39)),
    ("blue-star-dog-bed", "Caminha estrelas", 1100, "Móveis", "floor-bed"),
    ("blue-paw-pet-tent", "Cabana patinha", 2600, "Móveis", "floor-bed", dict(left=2, width=33)),
    # Rugs
    ("blue-striped-carpet-mat", "Capacho listrado azul", 300, "Chão", "floor-rug", dict(left=20, width=60)),
    ("round-paw-print-carpet", "Tapete redondo patinha", 750, "Chão", "floor-rug", dict(left=19, width=62)),
    ("blue-paw-print-rug", "Tapete patinha azul", 1300, "Chão", "floor-rug", dict(left=20, width=60)),
    # Plants
    ("blue-paw-planter", "Vaso patinha azul", 250, "Chão", "floor-plant", dict(left=0, width=26, bottom=33.2)),
    ("blue-flower-planter", "Vaso de flores azuis", 350, "Chão", "floor-plant", dict(left=0, width=26, bottom=33.2)),
    ("hanging-paw-print-planter", "Planta pendente patinha", 600, "Chão", "floor-plant", dict(left=1, top=40, width=21, bottom=None)),
    ("blue-paw-planter-gold-rim", "Vaso patinha borda dourada", 700, "Chão", "floor-plant", dict(left=0, width=25, bottom=33.2)),
    ("hanging-blue-paw-planter", "Planta pendente com laço", 1100, "Chão", "floor-plant", dict(left=1, top=40, width=20, bottom=None)),
    # Dressers
    ("blue-paw-nightstand", "Criado-mudo patinha", 450, "Móveis", "floor-dresser", dict(left=77, width=22, bottom=29)),
    ("blue-storage-bench", "Banco baú de osso", 850, "Móveis", "floor-dresser", dict(left=72, width=27, bottom=31.4)),
    ("blue-paw-dresser", "Cômoda patinha azul", 1200, "Móveis", "floor-dresser", dict(left=73, width=26, bottom=29.8)),
    # Lamps
    ("blue-paw-table-lamp", "Abajur patinha azul", 300, "Móveis", "floor-lamp", {}, dict(originX=50, originY=22)),
    ("crescent-moon-lamp", "Abajur lua crescente", 700, "Móveis", "floor-lamp", {}, dict(originX=45, originY=40)),
    ("rocket-base-table-lamp", "Abajur foguete", 1200, "Móveis", "floor-lamp", dict(left=82.6, width=10.5), dict(originX=50, originY=16)),
    ("glowing-star-ornament", "Abajur estrela brilhante", 2100, "Móveis", "floor-lamp", dict(left=82, width=12), dict(originX=50, originY=38)),
    # Pieces that sit on top of the dresser (same slot as the lamps)
    ("blue-bone-storage-canister", "Lata de petiscos azul", 500, "Móveis", "floor-lamp", dict(left=82.9, bottom=42.8, width=11)),
    ("blue-bone-storage-jar", "Pote de petiscos patinha", 900, "Móveis", "floor-lamp", dict(left=82.8, bottom=42.8, width=11.2)),
    ("puppy-snow-globe", "Globo de neve cãozinho", 1300, "Móveis", "floor-lamp", dict(left=83.2, bottom=42.5, width=10.5)),
    ("puppy-music-box", "Caixinha de música cãozinho", 1800, "Móveis", "floor-lamp", dict(left=83, bottom=42.3, width=11)),
    # Bowls
    ("blue-double-pet-bowls", "Potes azuis", 140, "Chão", "floor-bowls"),
    ("paw-bone-feeding-station", "Comedouro patinha e osso", 380, "Chão", "floor-bowls", dict(left=72.5, width=25.5)),
    # Toys
    ("blue-rope-dog-toy", "Cordinha azul", 140, "Brinquedos", "floor-bone", dict(left=68.5, width=17)),
    ("blue-paw-ball", "Bola patinha azul", 260, "Brinquedos", "floor-bone"),
    ("blue-bone-cushion", "Almofada de osso", 380, "Brinquedos", "floor-bone", dict(left=70, width=15)),
    ("blue-toy-airplane", "Aviãozinho de brinquedo", 500, "Brinquedos", "floor-bone", dict(left=70, bottom=16, width=15)),
    # Floor accents
    ("puppy-plush-toy", "Cachorrinho de pelúcia", 450, "Chão", "floor-left-accent"),
    ("blue-paw-pet-basket", "Cesta de mantinhas azul", 900, "Chão", "floor-left-accent"),
    ("blue-dog-toy-basket", "Cesta de brinquedos azul", 600, "Chão", "floor-right-accent"),
    # Wall frames, hangings and shelves
    ("blue-paw-banner", "Flâmula patinha", 220, "Parede", "wall-heart"),
    ("puppy-portrait", "Retrato do filhote", 900, "Parede", "wall-heart"),
    ("paw-print-wall-plaque", "Quadro patinha azul", 240, "Parede", "wall-paw"),
    ("puppy-bow-wall-plaque", "Medalha do filhote", 650, "Parede", "wall-paw"),
    ("cloud-star-bone-mobile", "Móbile nuvem e ossinhos", 1200, "Parede", "wall-left-feature", dict(left=6, top=11, width=14)),
    ("bone-wall-hanger", "Placa de osso", 450, "Parede", "wall-right-accent", dict(left=77, top=15, width=20)),
    ("blue-paw-wall-clock", "Relógio patinha", 500, "Parede", "wall-right-accent", dict(left=82, top=14.5, width=14.5)),
    ("blue-paw-mirror", "Espelho azul", 950, "Parede", "wall-right-accent", dict(left=82, top=14, width=13.5)),
    ("bone-shaped-wall-shelf", "Prateleira de osso", 300, "Parede", "wall-shelf", dict(left=72, width=25.5)),
    ("puppy-plant-wall-shelf", "Prateleira cãozinho e plantas", 500, "Parede", "wall-shelf", dict(left=74.5, width=24)),
    # Garlands
    ("blue-star-bone-bunting", "Bandeirinhas estrela e osso", 750, "Parede", "wall-garland", dict(left=19, width=62)),
    ("blue-paw-flag-garland", "Bandeirinhas patinha", 900, "Parede", "wall-garland", dict(left=19, width=62)),
    ("paw-and-bone-string-lights", "Luzes de patinhas e ossinhos", 1100, "Parede", "wall-garland", dict(left=19, width=62)),
    ("gold-star-bone-garland", "Guirlanda dourada estrelas e ossos", 1300, "Parede", "wall-garland", dict(left=19, width=62)),
    # Curtains (replace the window curtain, like the feminine ones)
    ("blue-paw-curtains-beige-bows", "Cortina patinhas laço bege", 700, "Parede", "window-curtain"),
    ("navy-bone-print-curtains", "Cortina ossinhos marinho", 1100, "Parede", "window-curtain"),
    ("blue-paw-curtains-white-bows", "Cortina patinhas laço branco", 1600, "Parede", "window-curtain"),
    ("blue-paw-curtains-navy-bows", "Cortina patinhas laço marinho", 2100, "Parede", "window-curtain"),
    ("blue-star-curtains-blue-bows", "Cortina estrelas azul", 2600, "Parede", "window-curtain"),
    # Structure
    ("floor-warm-wood", "Piso madeira quente", 850, "Estrutura", "room-floor"),
    ("floor-dark-wood", "Piso madeira escura", 1200, "Estrutura", "room-floor"),
    ("floor-light-wood", "Piso madeira clara", 1400, "Estrutura", "room-floor"),
    ("wall-navy-paw-bone", "Parede marinho com ossinhos", 1200, "Estrutura", "room-wall"),
    ("wall-blue-paw-boner", "Parede listrada patinhas e ossos", 1400, "Estrutura", "room-wall"),
    ("wall-blue-star-paw", "Parede listrada estrelas e patinhas", 1700, "Estrutura", "room-wall"),
    ("baseboard-wooden", "Rodapé madeira", 500, "Estrutura", "room-baseboard"),
    ("baseboard-blue-creamr", "Rodapé azul e creme", 700, "Estrutura", "room-baseboard"),
    ("baseboard-blue-paw-bone", "Rodapé azul patinhas e ossos", 900, "Estrutura", "room-baseboard"),
]


def make(id, name, price, category, slot, options, *, collection):
    pos, layer, stack = anchors[slot]
    position = {**pos, **(options[0] if options else {})}
    position = {key: val for key, val in position.items() if val is not None}
    kind = "structure" if slot.startswith("room-") else "curtain" if slot == "window-curtain" else "decor"
    # The large left-wall feature replaces both small frames (and each small frame replaces the feature).
    conflicts = (["wall-heart", "wall-paw"] if slot == "wall-left-feature" else
                 ["wall-left-feature"] if slot in ("wall-heart", "wall-paw") else None)
    return entry(id, name, price, category, slot, position, layer, stack, kind=kind,
                 light=options[1] if len(options) > 1 else None, conflicts=conflicts, collection=collection)


def catalog():
    items = []
    for id, name, price, category, slot in legacy:
        pos, layer, stack = anchors[slot]
        items.append(entry(id, name, price, category, slot, pos, layer, stack,
                           light=dict(originX=50, originY=18) if id == "lamp" else None,
                           conflicts=["wall-left-feature"] if slot in ("wall-heart", "wall-paw") else None))
    for prefix, id, name, price, category, slot, *options in new:
        items.append(make(id, name, price, category, slot, options, collection="feminine"))
    for id, name, price, category, slot, *options in masculine:
        items.append(make(id, name, price, category, slot, options, collection="masculine"))
    assert len({item["id"] for item in items}) == len(items), "duplicate catalog ids"
    return items


def optimize_masculine_assets():
    """Trim transparent margins and downscale the masculine sprites in place (idempotent).

    Positions in the catalog are percentages of the *sprite box*, so every sprite has to be cropped to its
    visible pixels first - the raw 1254px exports carry large empty borders. Same rules as the feminine pass.
    """
    for item in (item for item in catalog() if item["collection"] == "masculine"):
        path = ROOT / "frontend/public" / item["asset"].lstrip("/")
        image = Image.open(path).convert("RGBA")
        bbox = image.getchannel("A").point(lambda value: 255 if value >= 3 else 0).getbbox()
        assert bbox, item["id"]
        margin = 3
        image = image.crop((max(0, bbox[0]-margin), max(0, bbox[1]-margin),
                            min(image.width, bbox[2]+margin), min(image.height, bbox[3]+margin)))
        limit = 1200 if item["kind"] == "structure" else 950
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        temporary = path.with_suffix(".webp.tmp")
        image.save(temporary, "WEBP", quality=85, method=6)
        temporary.replace(path)
    print(f"Optimized {len(masculine)} masculine WebP assets")


def write_catalog(items):
    for dest in (FRONT, BACK):
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build(zip_path, only_ids=None):
    items = catalog()
    write_catalog(items)
    if zip_path == "--catalog-only":
        return
    if zip_path == "--optimize-masculine":
        optimize_masculine_assets()
        return
    with ZipFile(zip_path) as archive:
        source_files = json.loads((ROOT / "scripts/pet_room_source_files.json").read_text(encoding="utf-8"))
        available = {name[13:17]: name for name in archive.namelist()}
        assert len(new) == len(archive.namelist()) == 79
        assert len({row[0] for row in new}) == len(new)
        assert set(available) == {row[0] for row in new}
        assert {id: available[prefix] for prefix, id, *_ in new} == source_files, "ZIP filenames differ from approved mapping"
        for prefix, id, *_ in new:
            if only_ids is not None and id not in only_ids:
                continue
            item = next(item for item in items if item["id"] == id)
            image = Image.open(BytesIO(archive.read(available[prefix]))).convert("RGBA")
            alpha = image.getchannel("A")
            bbox = alpha.point(lambda value: 255 if value >= 3 else 0).getbbox()
            assert bbox, id
            margin = 3
            image = image.crop((max(0, bbox[0]-margin), max(0, bbox[1]-margin),
                                min(image.width, bbox[2]+margin), min(image.height, bbox[3]+margin)))
            compact = id in {"dresser-floral", "plant-roses", "dresser-snowglobe", "wall-neon-heart"}
            limit = 640 if compact else 1200 if item["kind"] == "structure" else 950
            image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
            dest = ROOT / "frontend/public" / item["asset"].lstrip("/")
            dest.parent.mkdir(parents=True, exist_ok=True)
            temporary = dest.with_suffix(".webp.tmp")
            image.save(temporary, "WEBP", quality=80 if compact else 85, method=6)
            temporary.replace(dest)
    print(f"Generated {len(new)} WebP assets and {len(items)} catalog entries")


if __name__ == "__main__":
    build(sys.argv[1])
