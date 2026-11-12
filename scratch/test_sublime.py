import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]

# 2. Extract authentic hair bangs and eyebrows mask from original neko-chibi
# Hair is red/pink or dark red:
r = orig[:, :, 0].astype(float)
g = orig[:, :, 1].astype(float)
b = orig[:, :, 2].astype(float)

is_hair = (r > 120) & ((r - g) > 35) & (g < 155)
is_brow = (r < 190) & (g < 95) & (b < 105) & (r > g + 20)

hair_mask = np.zeros((h, w), dtype=bool)
# Bangs above left eye
hair_mask[240:340, 200:400] = (is_hair | is_brow)[240:340, 200:400]
# Bangs between eyes
hair_mask[240:395, 400:470] = (is_hair | is_brow)[240:395, 400:470]
# Bangs over right eye
hair_mask[240:375, 470:560] = (is_hair | is_brow)[240:375, 470:560]
hair_mask[240:365, 560:640] = (is_hair | is_brow)[240:365, 560:640]
# Side hair
hair_mask[240:460, 150:235] = (is_hair | is_brow)[240:460, 150:235]
hair_mask[240:460, 665:750] = (is_hair | is_brow)[240:460, 665:750]
# Eyebrows
hair_mask[270:345, 210:370] |= is_brow[270:345, 210:370]
hair_mask[270:345, 530:690] |= is_brow[270:345, 530:690]

hair_mask_smooth = cv2.GaussianBlur(hair_mask.astype(float), (3, 3), 0.5)

# 3. Build eye socket mask
# The open eye in chibi:
# Left eye: sclera + iris + open lash
# x in [220, 395], y in [305, 436]
# Right eye: sclera + iris + open lash
# x in [505, 680], y in [305, 436]
eye_socket_mask = np.zeros((h, w), dtype=np.float32)

# Polygon precisely covering the open eye socket without bleeding into cheeks:
pts_l = np.array([
    [220, 385],
    [230, 340],
    [270, 308],
    [320, 305],
    [365, 320],
    [395, 375],
    [390, 420],
    [365, 436],
    [310, 438],
    [255, 435],
    [225, 415]
], dtype=np.int32)
cv2.fillPoly(eye_socket_mask, [pts_l], 1.0)

pts_r = np.array([
    [505, 375],
    [535, 320],
    [580, 305],
    [630, 308],
    [670, 340],
    [680, 385],
    [675, 415],
    [645, 435],
    [590, 438],
    [535, 436],
    [510, 420]
], dtype=np.int32)
cv2.fillPoly(eye_socket_mask, [pts_r], 1.0)

# Feather the eye socket boundary with 7px Gaussian blur:
eye_socket_blurred = cv2.GaussianBlur(eye_socket_mask, (15, 15), 3.5)

# 4. Fill eye socket with Miu's face skin tone
# Formula matching surrounding forehead (y=300: [253, 224, 191]) to lower lid (y=438: [252, 222, 189]):
skin_canvas = orig.copy()
for y in range(295, 445):
    t = (y - 295) / (445 - 295)
    r_val = 252.5
    g_val = 224.5 - 2.5 * t
    b_val = 191.0 - 2.0 * t
    
    # Cheek blush warmth near lower lid (y > 410)
    for x in range(210, 690):
        m = eye_socket_blurred[y, x]
        if m > 0.001:
            blush = 0.0
            if y > 410:
                # Add slight blush tint towards bottom
                blush = (y - 410) / 35.0 * 0.4
            
            tgt_r = r_val
            tgt_g = g_val - blush * 35.0
            tgt_b = b_val - blush * 25.0
            
            orig_rgb = orig[y, x, :3].astype(float)
            target_rgb = np.array([tgt_r, tgt_g, tgt_b])
            blended = orig_rgb * (1.0 - m) + target_rgb * m
            skin_canvas[y, x, :3] = np.clip(blended, 0, 255).astype(np.uint8)

# 5. Load pure stroke lashes (nobox)
lash_l = Image.open('apps/web/public/neko/chibi/_pure_stroke_l_nobox.png').convert('RGBA')
lash_r = lash_l.transpose(Image.FLIP_LEFT_RIGHT)

# Scale lashes to fit chibi eyes naturally:
# Chibi eye width is 175 px, lash width in crop is ~145 px.
# Scale 1.15 -> 167 px.
scale = 1.15
wl, hl = int(lash_l.width * scale), int(lash_l.height * scale)
wr, hr = int(lash_r.width * scale), int(lash_r.height * scale)

cur_l = lash_l.resize((wl, hl), Image.Resampling.LANCZOS)
cur_r = lash_r.resize((wr, hr), Image.Resampling.LANCZOS)

# Position:
# Left eye center: (308, 385)
# In cur_l: lash center is around (wl * 0.47, hl * 0.62)
# We want lash center at (308, 395)
pos_lx = int(308 - wl * 0.47)
pos_ly = int(395 - hl * 0.62)

pos_rx = int(590 - wr * 0.53)
pos_ry = int(395 - hr * 0.62)

pil_comp = Image.fromarray(skin_canvas)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

arr_comp = np.array(pil_comp)

# 6. Restore original hair bangs and eyebrows on top!
for c in range(3):
    arr_comp[:, :, c] = np.clip(
        arr_comp[:, :, c].astype(float) * (1.0 - hair_mask_smooth) +
        orig[:, :, c].astype(float) * hair_mask_smooth,
        0, 255
    ).astype(np.uint8)

# Save result preview
res = Image.fromarray(arr_comp)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_sublime_crop.png')
print("Sublime test saved!")
