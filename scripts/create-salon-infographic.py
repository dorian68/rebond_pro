"""Build the self-contained SVG flyers and their matching PNG/PDF exports.

Requires fontTools, reportlab, Pillow, OpenCV and the checkout's sharp package.
Text is outlined with the site's licensed fonts: browser rendering has no font
or external image dependency. Run from the checkout root.
"""
from pathlib import Path
from base64 import b64encode
from html import escape
import re
import subprocess
from io import BytesIO
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/salon"
NAVY, TEAL, GREEN, CREAM, ORANGE = "#15314c", "#23756e", "#5fb14e", "#faf5ec", "#e07c39"
TARGET = "https://lebonrebond.fr/salon.html"
LINKS = ["https://lebonrebond.fr/bilan-de-competences", "https://lebonrebond.fr/marketplace", "https://lebonrebond.fr/bilan-orientation"]
FONTS = {name: TTFont(OUT / "fonts" / file) for name, file in [
    ("news", "newsreader-regular.ttf"), ("italic", "newsreader-italic.ttf"),
    ("sans", "jakarta-regular.ttf"), ("bold", "jakarta-bold.ttf"), ("extra", "jakarta-extrabold.ttf")]}


def data_image(path, max_width=None):
    data=path.read_bytes()
    if max_width:
        image=Image.open(path)
        image.thumbnail((max_width,max_width),Image.Resampling.LANCZOS)
        output=BytesIO()
        image.save(output,format="PNG",optimize=True)
        data=output.getvalue()
    return "data:image/png;base64," + b64encode(data).decode()


class Flyer:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.parts, self.glyphs = [], {}
        self.boxes = []

    def add(self, svg):
        self.parts.append(svg)

    def rect(self, x, y, w, h, fill, r=0, stroke="none", sw=1):
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

    def circle(self, x, y, r, fill, stroke="none", sw=1):
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

    def path(self, d, stroke=NAVY, sw=4, fill="none"):
        self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>')

    def image(self, uri, x, y, w, h):
        self.add(f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" xlink:href="{uri}"/>')

    def text(self, words, x, y, font="sans", size=28, fill=NAVY, center=False, max_width=None):
        face = FONTS[font]
        cmap, glyph_set = face.getBestCmap(), face.getGlyphSet()
        units = face["head"].unitsPerEm
        widths = face["hmtx"].metrics
        advance = sum(widths[cmap[ord(char)]][0] for char in words)
        width = advance * size / units
        if max_width:
            assert width <= max_width, (words, round(width), max_width)
        if center:
            x -= width / 2
        assert x >= 0 and x + width <= self.width, (words, x, width)
        uses, offset = [], 0
        for char in words:
            glyph = cmap[ord(char)]
            key = font + "-" + str(ord(char))
            if key not in self.glyphs:
                pen = SVGPathPen(glyph_set)
                glyph_set[glyph].draw(pen)
                self.glyphs[key] = pen.getCommands()
            uses.append(f'<use xlink:href="#{key}" x="{offset}"/>')
            offset += widths[glyph][0]
        self.add(f'<g fill="{fill}" aria-label="{escape(words, quote=True)}" transform="translate({x:.3f} {y}) scale({size/units:.6f} {-size/units:.6f})">' + "".join(uses) + "</g>")
        return width

    def arrow(self, x1, y1, x2, y2, stroke=TEAL, sw=3):
        self.path(f"M{x1} {y1} L{x2} {y2}", stroke, sw)
        if y1 == y2:
            self.path(f"M{x2-8} {y2-7} L{x2} {y2} L{x2-8} {y2+7}", stroke, sw)
        else:
            self.path(f"M{x2-7} {y2-8} L{x2} {y2} L{x2+7} {y2-8}", stroke, sw)

    def icon(self, kind, x, y, scale=1, light=False):
        color = "#c6e8d1" if light else TEAL
        self.add(f'<g transform="translate({x} {y}) scale({scale})">')
        if kind == 0:
            self.circle(78, 78, 69, "#edf3e9" if not light else "#244e62")
            self.circle(78, 78, 48, "none", color, 3)
            for dx, dy in [(78, 15), (141, 78), (78, 141), (15, 78)]:
                self.circle(dx, dy, 5, GREEN)
            self.path("M96 42 L90 90 L50 113 L65 66 Z", color, 3, "#ffffff")
            self.path("M96 42 L65 66 L78 78 Z", color, 2, color)
            self.circle(78, 78, 5, ORANGE)
        elif kind == 1:
            self.rect(8, 17, 142, 123, "#244e62", 24)
            self.path("M25 108 L25 91 L58 91 L58 68 L91 68 L91 45 L130 45", color, 5)
            self.path("M112 29 L130 45 L112 61", color, 5)
            self.circle(25, 110, 8, ORANGE)
            self.circle(130, 45, 8, GREEN)
            self.path("M25 132 L132 132", "#7db3ab", 3)
        else:
            self.circle(78, 79, 73, "#f8fbf5")
            self.path("M78 130 L78 84 L29 39 M78 84 L128 39 M78 84 L78 25", "#a8bdaa", 4)
            self.path("M78 130 L78 84 L128 39", color, 6)
            self.circle(29, 39, 13, "#d5e6cb")
            self.circle(78, 25, 13, "#d5e6cb")
            self.circle(128, 39, 15, GREEN)
            self.circle(78, 130, 10, ORANGE)
        self.add("</g>")

    def finish(self, filename):
        defs = "".join(f'<path id="{key}" d="{value}"/>' for key, value in self.glyphs.items())
        description = "Bilan de compétences : vos forces, vos envies, un cap et un plan d'action. Formations professionnelles : votre projet, une formation, un centre adapté. Bilan d'orientation pour collégiens, lycéens et étudiants : études, métiers, des choix plus clairs. Partagez votre projet avec Le Bon Rebond."
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}" role="img" aria-labelledby="title desc"><title id="title">Le Bon Rebond - trois façons de préparer votre avenir</title><desc id="desc">{escape(description)}</desc><defs>{defs}</defs>' + "".join(self.parts) + "</svg>"
        (OUT / filename).write_bytes(svg.encode())


LOGO = data_image(ROOT / "public/brand/logo-le-bon-rebond.png",720)
QR = data_image(OUT / "qr-le-bon-rebond.png")


def landscape():
    f = Flyer(1920, 1080)
    f.rect(0, 0, 1920, 1080, CREAM)
    f.image(LOGO, 80, 35, 310, 125)
    f.circle(1825, -45, 440, "none", "#d1dfc8", 2)
    f.circle(1825, -45, 375, "none", "#d1dfc8", 2)
    f.rect(1410, 60, 430, 62, "#e8efdf", 31)
    f.circle(1444, 91, 7, GREEN)
    f.text("Un accompagnement humain", 1470, 101, "bold", 24)
    heading_width=f.text("Quel est votre", 80, 255, "news", 96)
    f.text("prochain rebond ?", 80+heading_width+25, 255, "italic", 96, TEAL)
    for i, x in enumerate([80, 680, 1280]):
        f.rect(x, 330, 560, 430, ["#ffffff", NAVY, "#e9f1e2"][i], 28)
        color = "#ffffff" if i == 1 else NAVY
        muted = "#c6e8d1" if i == 1 else TEAL
        f.text(["FAIRE LE POINT", "DÉVELOPPER VOS COMPÉTENCES", "POUR LES JEUNES"][i], x+28, 377, "extra", 22, muted, max_width=505)
        for line, yy in zip([["Bilan de", "compétences"], ["Formations", "professionnelles"], ["Bilan", "d’orientation"]][i], [451, 518]):
            size=51 if i==1 and yy==518 else 61
            f.text(line, x+28, yy, "news", size, color, max_width=420)
        f.icon(i, x+455, 401, .48, i == 1)
        if i == 0:
            for xx, label in [(x+30, "Vos forces"), (x+300, "Vos envies")]:
                f.rect(xx, 566, 230, 56, "#edf3e9", 28)
                f.text(label, xx+115, 602, "bold", 25, TEAL, center=True)
            f.path(f"M{x+145} 634 L{x+145} 648 L{x+415} 648 L{x+415} 634", "#b8cdbb", 3)
            f.arrow(x+280, 648, x+280, 672)
            f.text("Un cap + un plan d’action", x+280, 720, "bold", 27, center=True, max_width=505)
        elif i == 1:
            for j, label in enumerate(["Votre projet", "Formation", "Un centre"]):
                xx=x+28+j*170
                f.rect(xx, 575, 145, 58, "#244e62", 13)
                f.text(label, xx+72.5, 613, "bold", 21, "#ffffff", center=True, max_width=139)
                if j < 2:
                    f.arrow(xx+151, 604, xx+162, 604, "#a9d5b4", 2)
            f.text("Une mise en relation adaptée", x+280, 718, "bold", 26, "#ffffff", center=True, max_width=505)
        else:
            f.text("Collégiens · lycéens · étudiants", x+280, 580, "bold", 24, center=True, max_width=505)
            for j, label in enumerate(["Études", "Métiers", "Parcours"]):
                f.rect(x+28+j*170, 607, 145, 53, "#ffffff", 26)
                f.text(label, x+100.5+j*170, 641, "bold", 24, TEAL, center=True)
            f.text("Des choix plus clairs", x+280, 719, "bold", 28, center=True)
        f.boxes.append((x,330,560,430,LINKS[i]))
    f.rect(80, 815, 206, 206, "#ffffff", 20)
    f.image(QR, 83, 818, 200, 200)
    f.text("Parlons de votre projet.", 325, 868, "news", 57)
    f.rect(325, 899, 615, 87, ORANGE, 44)
    f.text("Je partage mon projet", 632.5, 955, "extra", 31, center=True)
    f.text("lebonrebond.fr/salon.html", 325, 1031, "bold", 25, TEAL)
    for i, (xx, label) in enumerate([(1072, "Votre besoin"), (1373, "Un échange"), (1691, "La suite")]):
        if i<2:
            f.arrow(xx+40, 843, xx+240, 843, "#b2c8b3", 3)
        f.circle(xx, 843, 25, TEAL)
        f.text(str(i+1), xx, 853, "bold", 27, "#ffffff", center=True)
        f.text(label, xx, 905, "bold", 26, center=True)
    f.text("+33 7 83 96 01 92", 1047, 996, "bold", 25)
    f.text("contact.lebonrebond@gmail.com", 1410, 996, "sans", 23)
    f.boxes.extend([(325,899,615,87,"https://lebonrebond.fr/questionnaire"),(80,815,206,206,TARGET)])
    f.finish("flyer-paysage-v2.svg")
    return f


def portrait():
    f=Flyer(1080,1920)
    f.rect(0,0,1080,1920,CREAM)
    f.image(LOGO,60,28,360,145)
    f.circle(1110,-40,420,"none","#d1dfc8",2)
    f.circle(1110,-40,355,"none","#d1dfc8",2)
    f.text("Un accompagnement",652,90,"bold",30,TEAL)
    f.text("humain.",652,132,"bold",30,TEAL)
    f.text("Quel est votre",60,280,"news",105)
    f.text("prochain rebond ?",60,390,"italic",105,TEAL,max_width=960)
    for i,(y,h) in enumerate([(460,270),(754,270),(1048,300)]):
        f.rect(60,y,960,h,["#ffffff",NAVY,"#e9f1e2"][i],28)
        color="#ffffff" if i==1 else NAVY
        f.icon(i,95,y+48,1.12,i==1)
        if i<2:
            for label,yy in zip([["Bilan de","compétences"],["Formations","professionnelles"]][i],[y+91,y+168]):
                f.text(label,310,yy,"news",72,color,max_width=680)
            f.text(["Forces + envies = votre cap","Votre projet → le bon centre"][i],310,y+231,"bold",43,"#c6e8d1" if i==1 else TEAL,max_width=680)
        else:
            f.text("Bilan d’orientation",310,y+86,"news",67,color,max_width=680)
            f.text("Collégiens · lycéens",310,y+147,"bold",43,max_width=680)
            f.text("et étudiants",310,y+196,"bold",43,max_width=680)
            f.text("Des choix plus clairs",310,y+258,"bold",43,TEAL,max_width=680)
        f.boxes.append((60,y,960,h,LINKS[i]))
    for i,(xx,label) in enumerate([(190,"Votre besoin"),(540,"Un échange"),(890,"La suite")]):
        if i<2:
            f.arrow(xx+50,1413,xx+300,1413,"#b2c8b3",4)
        f.circle(xx,1413,29,TEAL)
        f.text(str(i+1),xx,1425,"bold",34,"#ffffff",center=True)
        f.text(label,xx,1490,"bold",41,center=True)
    f.rect(60,1560,240,240,"#ffffff",22)
    f.image(QR,63,1563,234,234)
    f.text("On en parle ?",342,1618,"news",63)
    f.rect(342,1656,678,134,ORANGE,67)
    f.text("Je partage mon projet",681,1739,"extra",44,center=True,max_width=630)
    f.text("lebonrebond.fr/salon.html",342,1849,"bold",34,TEAL)
    f.text("+33 7 83 96 01 92",60,1902,"bold",36)
    f.boxes.extend([(342,1656,678,134,"https://lebonrebond.fr/questionnaire"),(60,1560,240,240,TARGET)])
    f.finish("flyer-portrait-v2.svg")
    return f


if __name__ == "__main__":
    flyers=[("paysage",landscape()),("portrait",portrait())]
    # Hotspot geometry is compiled from the same artboards as the visible flyer.
    classes=["offer-1","offer-2","offer-3","primary","qr"]
    rules=[]
    for name,flyer in flyers:
        css=[]
        for cls,(x,y,w,h,url) in zip(classes,flyer.boxes):
            assert 0<=x<x+w<=flyer.width and 0<=y<y+h<=flyer.height
            css.append(f'.{cls}'+'{'+f'left:{x/flyer.width*100:.5f}%;top:{y/flyer.height*100:.5f}%;width:{w/flyer.width*100:.5f}%;height:{h/flyer.height*100:.5f}%;'+'}')
        rules.append(''.join(css) if name=='paysage' else '@media(max-width:850px){'+''.join(css)+'}')
    page=ROOT/'public/salon.html'
    html=page.read_text(encoding='utf-8')
    html,count=re.subn(r'<style id="flyer-hotspots">.*?</style>','<style id="flyer-hotspots">'+''.join(rules)+'</style>',html,flags=re.S)
    assert count==1,'Expected exactly one hotspot stylesheet'
    page.write_bytes(html.replace('\r\n','\n').encode())
    js="const sharp=require('sharp'); Promise.all(['paysage','portrait'].map(n=>sharp('public/salon/flyer-'+n+'-v2.svg').png().toFile('public/salon/le-bon-rebond-'+n+'.png'))).catch(e=>{console.error(e);process.exitCode=1});"
    subprocess.run(["node","-e",js],cwd=ROOT,check=True)
    for name,flyer in flyers:
        pdf=canvas.Canvas(str(OUT/f"le-bon-rebond-{name}.pdf"),pagesize=(flyer.width,flyer.height))
        pdf.setTitle("Le Bon Rebond - Bilan, formations, orientation")
        pdf.setAuthor("Le Bon Rebond")
        pdf.drawImage(str(OUT/f"le-bon-rebond-{name}.png"),0,0,width=flyer.width,height=flyer.height)
        for x,y,w,h,url in flyer.boxes:
            pdf.linkURL(url,(x,flyer.height-y-h,x+w,flyer.height-y),relative=0)
        pdf.showPage()
        pdf.save()
    import cv2
    for name,flyer in flyers:
        decoded,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.imread(str(OUT/f"le-bon-rebond-{name}.png")))
        assert decoded==TARGET,(name,decoded)
        print({"format":name,"dimensions":[flyer.width,flyer.height],"qr":decoded,"links":len(flyer.boxes)})
