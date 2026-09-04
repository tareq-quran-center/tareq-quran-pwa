# Generate all Mosque brand assets and PWA icons
import os
from PIL import Image, ImageDraw
import numpy as np

src_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'logo-source.png')
if not os.path.exists(src_path):
    # fallback to uploaded path
    src_path = r'C:/Users/PC/.gemini/antigravity/brain/f364c9b7-0dd8-4f85-84a4-e362b2b9797f/.user_uploaded/media_1787581138045.png'

img = Image.open(src_path).convert('RGB')
arr = np.array(img, dtype=float)

public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
img_dir = os.path.join(public_dir, 'images')
icons_dir = os.path.join(public_dir, 'icons')
os.makedirs(img_dir, exist_ok=True)
os.makedirs(icons_dir, exist_ok=True)

# Save source copy
img.save(os.path.join(img_dir, 'logo-source.png'))

def extract_rgba(slice_rgb, gold_boost=1.1, gold_tint=None):
    norm = slice_rgb / 255.0
    darkness = 1.0 - np.min(norm, axis=2)
    alpha = np.clip(darkness * 2.2, 0.0, 1.0)
    alpha_safe = np.maximum(alpha, 1e-4)[:, :, np.newaxis]
    unmult = np.clip((norm - (1.0 - alpha[:, :, np.newaxis])) / alpha_safe, 0.0, 1.0)
    if gold_tint is not None:
        r_t, g_t, b_t = gold_tint
        unmult[:, :, 0] = r_t / 255.0
        unmult[:, :, 1] = g_t / 255.0
        unmult[:, :, 2] = b_t / 255.0
    else:
        unmult[:, :, 0] = np.clip(unmult[:, :, 0] * gold_boost, 0, 1)
        unmult[:, :, 1] = np.clip(unmult[:, :, 1] * (gold_boost * 0.95), 0, 1)
        unmult[:, :, 2] = np.clip(unmult[:, :, 2] * (gold_boost * 0.75), 0, 1)
    res = np.zeros((slice_rgb.shape[0], slice_rgb.shape[1], 4), dtype=np.uint8)
    res[:, :, :3] = (unmult * 255).astype(np.uint8)
    res[:, :, 3] = (alpha * 255).astype(np.uint8)
    res[alpha < 0.04, 3] = 0
    return Image.fromarray(res, 'RGBA')

full_slice = arr[20:560, 260:785]
full_rgba = extract_rgba(full_slice)
pad = 24
full_canvas = Image.new('RGBA', (full_rgba.width + pad*2, full_rgba.height + pad*2), (0,0,0,0))
full_canvas.paste(full_rgba, (pad, pad), full_rgba)
full_canvas.save(os.path.join(img_dir, 'logo-full.png'))

full_rgba_gold = extract_rgba(full_slice, gold_tint=(218, 180, 95))
full_canvas_gold = Image.new('RGBA', (full_rgba_gold.width + pad*2, full_rgba_gold.height + pad*2), (0,0,0,0))
full_canvas_gold.paste(full_rgba_gold, (pad, pad), full_rgba_gold)
full_canvas_gold.save(os.path.join(img_dir, 'logo-full-gold.png'))

arches_slice = arr[20:476, 264:780]
arches_rgba = extract_rgba(arches_slice)
pad_a = 16
arches_canvas = Image.new('RGBA', (arches_rgba.width + pad_a*2, arches_rgba.height + pad_a*2), (0,0,0,0))
arches_canvas.paste(arches_rgba, (pad_a, pad_a), arches_rgba)
arches_canvas.save(os.path.join(img_dir, 'logo-icon.png'))

arches_gold = extract_rgba(arches_slice, gold_tint=(228, 190, 105))
arches_gold_canvas = Image.new('RGBA', (arches_gold.width + pad_a*2, arches_gold.height + pad_a*2), (0,0,0,0))
arches_gold_canvas.paste(arches_gold, (pad_a, pad_a), arches_gold)
arches_gold_canvas.save(os.path.join(img_dir, 'logo-icon-gold.png'))

center_slice = arr[20:476, 418:628]
center_rgba = extract_rgba(center_slice)
center_canvas = Image.new('RGBA', (center_rgba.width + pad_a*2, center_rgba.height + pad_a*2), (0,0,0,0))
center_canvas.paste(center_rgba, (pad_a, pad_a), center_rgba)
center_canvas.save(os.path.join(img_dir, 'logo-icon-center.png'))

center_gold = extract_rgba(center_slice, gold_tint=(235, 198, 112))
center_gold_canvas = Image.new('RGBA', (center_gold.width + pad_a*2, center_gold.height + pad_a*2), (0,0,0,0))
center_gold_canvas.paste(center_gold, (pad_a, pad_a), center_gold)
center_gold_canvas.save(os.path.join(img_dir, 'logo-icon-center-gold.png'))

def make_pwa_icon(size, is_maskable=False):
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = 0 if is_maskable else int(size * 0.22)
    for y in range(size):
        factor = y / float(size)
        r = int(4 + factor * 8)
        g = int(58 + factor * 28)
        b = int(43 + factor * 18)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    if not is_maskable:
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)
        canvas.putalpha(mask)
    scale_factor = 0.65 if is_maskable else 0.72
    target_h = int(size * scale_factor)
    target_w = int(arches_gold_canvas.width * (target_h / float(arches_gold_canvas.height)))
    resized_emblem = arches_gold_canvas.resize((target_w, target_h), Image.Resampling.LANCZOS)
    pos_x = (size - target_w) // 2
    pos_y = (size - target_h) // 2
    canvas.paste(resized_emblem, (pos_x, pos_y), resized_emblem)
    return canvas

make_pwa_icon(192, False).save(os.path.join(icons_dir, 'icon-192x192.png'))
make_pwa_icon(512, False).save(os.path.join(icons_dir, 'icon-512x512.png'))
make_pwa_icon(192, True).save(os.path.join(icons_dir, 'icon-maskable-192x192.png'))
make_pwa_icon(512, True).save(os.path.join(icons_dir, 'icon-maskable-512x512.png'))
make_pwa_icon(192, False).save(os.path.join(public_dir, 'apple-touch-icon.png'))
fav = make_pwa_icon(32, False)
fav.save(os.path.join(public_dir, 'favicon.png'))
fav.save(os.path.join(public_dir, 'favicon.ico'))
print('All brand assets generated successfully!')
