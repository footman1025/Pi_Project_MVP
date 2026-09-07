from PIL import Image, ImageFilter, ImageDraw

src = r"d:\Italy-Pi project\Pi_project\pi-demo\public\pi-hello.jpg"
out = r"d:\Italy-Pi project\Pi_project\pi-demo\public\pi-hello-soft.png"
SCENE = (1, 6, 12)

im = Image.open(src).convert("RGBA")
w, h = im.size
rgb = im.convert("RGB")
px = rgb.load()
out_rgb = Image.new("RGB", (w, h))
opx = out_rgb.load()
cx, cy = w / 2, h / 2

for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        dx, dy = (x - cx) / (w * 0.42), (y - cy) / (h * 0.42)
        d = (dx * dx + dy * dy) ** 0.5
        t = max(0.0, min(1.0, (d - 0.55) / 0.55))
        t = t * t
        opx[x, y] = (
            int(r * (1 - t) + SCENE[0] * t),
            int(g * (1 - t) + SCENE[1] * t),
            int(b * (1 - t) + SCENE[2] * t),
        )

mask = Image.new("L", (w, h), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([int(w * 0.07), int(h * 0.05), int(w * 0.93), int(h * 0.95)], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(radius=90))

r, g, b = out_rgb.split()
soft = Image.merge("RGBA", (r, g, b, mask))
soft.save(out, optimize=True)
print("saved", out, soft.size, "alpha", soft.getchannel("A").getextrema())
