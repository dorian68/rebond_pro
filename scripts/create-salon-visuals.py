"""Render the event displays from the site's brand assets and licensed fonts.

Run from the checkout root: python scripts/create-salon-visuals.py
Dependencies: reportlab, Pillow. Rasterize output with pdftoppm at 72 dpi.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "salon"
FONT = OUT / "fonts"
for name, file in [("News", "newsreader-regular.ttf"), ("NewsItalic", "newsreader-italic.ttf"),
                   ("Jakarta", "jakarta-regular.ttf"), ("JakartaBold", "jakarta-bold.ttf"),
                   ("JakartaExtra", "jakarta-extrabold.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONT / file)))

NAVY, TEAL, CREAM, GREEN, MUTED = map(HexColor, ["#15314c", "#23756e", "#faf5ec", "#5fb14e", "#52606e"])
TARGET = "https://lebonrebond.fr/salon.html"
LOGO = ROOT / "public/brand/logo-le-bon-rebond.png"
PHOTO = OUT / "portrait.webp"
QR = OUT / "qr-le-bon-rebond.png"


def text(c, words, x, y, font, size, color=NAVY):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, words)


def tracked(c, words, x, y, size=20, tracking=2):
    obj = c.beginText(x, y)
    obj.setFont("JakartaExtra", size)
    obj.setFillColor(TEAL)
    obj.setCharSpace(tracking)
    obj.textOut(words)
    c.drawText(obj)


def image(c, path, x, y, w, h, radius=0):
    c.saveState()
    if radius:
        clip = c.beginPath()
        clip.roundRect(x, y, w, h, radius)
        c.clipPath(clip, stroke=0)
    source = Image.open(path)
    fitted = ImageOps.fit(source, (round(w * 2), round(h * 2)), centering=(.5, .38))
    c.drawImage(ImageReader(fitted), x, y, w, h, mask="auto")
    c.restoreState()


def render(name, w, h):
    c = canvas.Canvas(str(OUT / (name + ".pdf")), pagesize=(w, h), pageCompression=1)
    c.setTitle("Votre prochain rebond commence ici — Le Bon Rebond")
    c.setAuthor("Le Bon Rebond")
    c.setFillColor(CREAM)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#c8dbbd"))
    c.setLineWidth(1.5)
    c.circle(w + 60, h + 10, w * .46, fill=0, stroke=1)
    c.circle(w + 60, h + 10, w * .54, fill=0, stroke=1)
    if h > w:
        c.drawImage(str(LOGO), 80, 1696, width=340, height=180, preserveAspectRatio=True, mask="auto", anchor="c")
        tracked(c, "ORIENTATION · FORMATION · RECONVERSION", 80, 1610, 20, 1.7)
        for words, y, font in [("Votre prochain", 1466, "News"), ("rebond", 1355, "NewsItalic"), ("commence ici.", 1244, "News")]:
            text(c, words, 80, y, font, 114, TEAL if font == "NewsItalic" else NAVY)
        for line, y in [("Vous cherchez votre voie, une formation", 1136), ("ou un nouveau départ professionnel ?", 1087)]:
            text(c, line, 80, y, "Jakarta", 32)
        for line, y in [("Faites le point sur votre projet.", 979), ("Explorez vos possibilités.", 933), ("Choisissez votre prochaine étape.", 887)]:
            text(c, line, 80, y, "Jakarta", 28, MUTED)
        image(c, PHOTO, 610, 576, 390, 405, 100)
        text(c, "Un accompagnement", 80, 719, "News", 44)
        text(c, "humain.", 80, 666, "NewsItalic", 44, TEAL)
        text(c, "Un cap, à votre rythme.", 80, 605, "Jakarta", 25, MUTED)
        c.setStrokeColor(HexColor("#d3dace"))
        c.line(80, 534, 1000, 534)
        c.setFillColor(HexColor("#ffffff"))
        c.roundRect(80, 182, 310, 310, 18, fill=1, stroke=0)
        image(c, QR, 86, 188, 298, 298)
        c.linkURL(TARGET, (80, 182, 390, 492), relative=0)
        for line, y in [("Scannez.", 430), ("Découvrez.", 364), ("Avancez.", 298)]:
            text(c, line, 435, y, "News", 65)
        text(c, "lebonrebond.fr/salon.html", 435, 222, "JakartaBold", 25, TEAL)
        c.linkURL(TARGET, (435, 212, 1000, 250), relative=0)
        text(c, "+33 7 83 96 01 92", 80, 105, "JakartaBold", 25)
        text(c, "contact.lebonrebond@gmail.com", 80, 61, "Jakarta", 25, MUTED)
    else:
        c.drawImage(str(LOGO), 90, 863, width=330, height=175, preserveAspectRatio=True, mask="auto", anchor="c")
        tracked(c, "ORIENTATION · FORMATION · RECONVERSION", 90, 800, 19, 1.7)
        for words, y, font in [("Votre prochain", 673, "News"), ("rebond", 560, "NewsItalic"), ("commence ici.", 447, "News")]:
            text(c, words, 90, y, font, 122, TEAL if font == "NewsItalic" else NAVY)
        text(c, "Vous cherchez votre voie, une formation", 95, 365, "Jakarta", 28)
        text(c, "ou un nouveau départ professionnel ?", 95, 324, "Jakarta", 28)
        image(c, PHOTO, 1140, 338, 670, 635, 150)
        c.setStrokeColor(HexColor("#d3dace"))
        c.line(90, 278, 1830, 278)
        c.setFillColor(HexColor("#ffffff"))
        c.roundRect(90, 39, 220, 220, 16, fill=1, stroke=0)
        image(c, QR, 95, 44, 210, 210)
        c.linkURL(TARGET, (90, 39, 310, 259), relative=0)
        text(c, "Scannez. Découvrez.", 350, 181, "News", 59)
        text(c, "Avancez.", 350, 118, "News", 59)
        text(c, "lebonrebond.fr/salon.html", 352, 61, "JakartaBold", 24, TEAL)
        c.linkURL(TARGET, (350, 50, 1000, 90), relative=0)
        for line, y in [("Faites le point sur votre projet.", 208), ("Explorez vos possibilités.", 167), ("Choisissez votre prochaine étape.", 126)]:
            text(c, line, 1110, y, "Jakarta", 24, MUTED)
        text(c, "+33 7 83 96 01 92", 1110, 66, "JakartaBold", 23)
        text(c, "contact.lebonrebond@gmail.com", 1410, 66, "Jakarta", 20, MUTED)
    c.showPage()
    c.save()
    print(str(OUT / (name + ".pdf")))


render("le-bon-rebond-portrait", 1080, 1920)
render("le-bon-rebond-paysage", 1920, 1080)
