import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]

r = orig[:, :, 0].astype(float)
g = orig[:, :, 1].astype(float)
b = orig[:, :, 2].astype(float)

# 2. Precise detection of hair and eyebrows
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
# Eyebrows
yy, xx = np.indices((h, w))
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 20) & (yy < 330)

# True hair/brow mask in the eye/forehead region
hair_or_brow = np.zeros((h, w), dtype=bool)
# Bangs above and crossing eyes:
hair_or_brow[240:390, 180:720] = (is_hair | is_brow)[240:390, 180:720]
# Exclude open eye pupil/iris which might have slight reddish tint:
# Pupil/iris is strictly in [335:435, 275:385] (left) and [335:435, 515:625] (right)
hair_or_brow[335:435, 275:385] = False
hair_or_brow[335:435, 515:625] = False
# Restore center bang tip between eyes
hair_or_brow[335:380, 415:460] = is_hair[335:380, 415:460]

# 3. Eye socket mask for left and right eye
# Left eye: center (310, 375), radii (86, 62)
# Right eye: center (590, 375), radii (86, 62)
eye_mask = np.zeros((h, w), dtype=np.float32)
cv2.ellipse(eye_mask, (310, 375), (86, 62), 0, 0, 360, 1.0, -1)
cv2.ellipse(eye_mask, (590, 375), (86, 62), 0, 0, 360, 1.0, -1)

# Hair is never eye
eye_mask[hair_or_brow] = 0.0

# Feather eye mask with smooth Gaussian blur (sigma=3.0)
eye_mask_blurred = cv2.GaussianBlur(eye_mask, (15, 15), 3.0)
# Re-zero hair from blurred mask to keep hair 100% crisp
eye_mask_blurred[hair_or_brow] = 0.0

# 4. Synthesize seamless eyelid skin:
# In neko-chibi:
# Top skin (y=300): [239, 167, 148] (warm shaded peach)
# Nose bridge (x=450, y=375): [251, 224, 190]
# Cheek blush (y=440): [251, 175, 160]
# Temple (x=210): [238, 168, 148]
skin_canvas = orig.copy()
for y in range(295, 445):
    ty = (y - 295) / (445 - 295)
    for x in range(200, 700):
        m = eye_mask_blurred[y, x]
        if m > 0.001:
            # Distance from nose bridge center (450)
            tx = abs(x - 450) / 250.0  # 0 at nose bridge, 1 at temples
            
            # Interpolate 4 corners:
            # Bridge: [251, 224, 190]
            # Temple: [238, 168, 148]
            # Forehead: [240, 170, 150]
            # Blush: [251, 175, 160]
            
            # Base color at this (x, y)
            r_val = 251.0 * (1.0 - tx) + 238.0 * tx
            g_val = (224.0 * (1.0 - ty) + 175.0 * ty) * (1.0 - tx) + (170.0 * (1.0 - ty) + 168.0 * ty) * tx
            b_val = (190.0 * (1.0 - ty) + 160.0 * ty) * (1.0 - tx) + (150.0 * (1.0 - ty) + 148.0 * ty) * tx
            
            orig_rgb = orig[y, x, :3].astype(float)
            target_rgb = np.array([r_val, g_val, b_val])
            blended = orig_rgb * (1.0 - m) + target_rgb * m
            skin_canvas[y, x, :3] = np.clip(blended, 0, 255).astype(np.uint8)

# 5. Composite pure stroke lashes:
lash_l = Image.open('apps/web/public/neko/chibi/_pure_stroke_l_nobox.png').convert('RGBA')
lash_r = lash_l.transpose(Image.FLIP_LEFT_RIGHT)

scale = 1.15
wl, hl = int(lash_l.width * scale), int(lash_l.height * scale)
wr, hr = int(lash_r.width * scale), int(lash_r.height * scale)

cur_l = lash_l.resize((wl, hl), Image.Resampling.LANCZOS)
cur_r = lash_r.resize((wr, hr), Image.Resampling.LANCZOS)

pos_lx = int(308 - wl * 0.47)
pos_ly = int(395 - hl * 0.62)

pos_rx = int(590 - wr * 0.53)
pos_ry = int(395 - hr * 0.62)

pil_comp = Image.fromarray(skin_canvas)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_arr = np.array(pil_comp)

# Re-enforce original hair bangs and eyebrows on top
for c in range(3):
    final_arr[hair_or_brow, c] = orig[hair_or_brow, c]

# Save face preview
res = Image.fromarray(final_arr)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_flawless_crop.png')
print("Flawless test saved!")
