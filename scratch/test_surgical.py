import cv2
import numpy as np
from PIL import Image

# Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]

r = orig[:, :, 0].astype(float)
g = orig[:, :, 1].astype(float)
b = orig[:, :, 2].astype(float)

# 1. Precise mask of the open eyeball + open upper lash ONLY:
# Left eye: x in [220, 395], y in [305, 436]
# Right eye: x in [505, 680], y in [305, 436]

# Sclera / eye white:
is_white = (r > 200) & (g > 200) & (b > 200)
# Iris (red/brown tones):
is_iris = (r > 80) & (r < 220) & (g < 110) & (b < 110) & ((r - g) > 20)
# Dark pupil and open lash:
is_dark = (r < 75) & (g < 75) & (b < 75)

# Combined eyeball content
is_eyeball = is_white | is_iris | is_dark

# Restrict to the eye sockets (excluding eyebrows and hair bangs)
# Left eye socket polygon:
poly_l = np.array([
    [222, 385],
    [235, 340],
    [270, 310],
    [320, 305],
    [365, 320],
    [395, 375],
    [390, 420],
    [365, 436],
    [310, 438],
    [255, 435],
    [225, 415]
], dtype=np.int32)

poly_r = np.array([
    [505, 375],
    [535, 320],
    [580, 305],
    [630, 310],
    [665, 340],
    [678, 385],
    [675, 415],
    [645, 435],
    [590, 438],
    [535, 436],
    [510, 420]
], dtype=np.int32)

mask_poly = np.zeros((h, w), dtype=np.uint8)
cv2.fillPoly(mask_poly, [poly_l, poly_r], 255)

# Mask of ONLY the pixels inside the eye socket that belong to the eyeball or open lash
# Exclude hair: hair is r > 120, r - g > 35, g < 140, BUT hair bangs are at y < 370
# Bangs crossing eye:
is_hair = (r > 120) & ((r - g) > 35) & (g < 140)
# Specifically, hair bang on left is x in [375, 400], y in [305, 360]
# Hair bang on right is x in [510, 545], y in [305, 370]; and x in [580, 620], y in [305, 355]
bangs = np.zeros((h, w), dtype=bool)
bangs[305:360, 375:400] = is_hair[305:360, 375:400]
bangs[305:370, 510:545] = is_hair[305:370, 510:545]
bangs[305:355, 580:620] = is_hair[305:355, 580:620]

# Eyeball replacement mask:
replace_mask = (mask_poly > 0) & is_eyeball & (~bangs)

# Fill holes inside replace_mask (morphological close)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
replace_mask_closed = cv2.morphologyEx(replace_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)

# Dilate by 3 pixels to ensure the dark edges of the open lash are completely covered
kernel3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
replace_mask_dilated = cv2.dilate(replace_mask_closed, kernel3)

# Exclude bangs from dilated mask
replace_mask_dilated[bangs] = 0

# Feather the edges of the replacement mask with Gaussian blur
feathered_mask = cv2.GaussianBlur(replace_mask_dilated.astype(np.float32), (9, 9), 2.5)

# Save mask preview
Image.fromarray((feathered_mask * 255).astype(np.uint8)).crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_dbg_surgical_mask.png')

# 2. Skin tone for the replaced eyeball:
# Eyelid skin matches the surrounding forehead and nose bridge:
# In neko-chibi, forehead skin is [253, 224, 191], lower lid is [252, 222, 189].
# Under the hair shadow (y < 330), skin is slightly warmer: [248, 208, 180].
skin_filled = orig.copy()
for y in range(300, 442):
    t = (y - 300) / (442 - 300)
    # Natural skin tone with hair shadow gradient:
    # At top (y=300): slightly shaded [249, 212, 184]
    # At mid (y=370): creamy peach [252, 224, 191]
    # At bottom (y=440): soft blush tint [252, 218, 186]
    if y < 350:
        st = (y - 300) / 50.0
        r_val = 249.0 + 3.0 * st
        g_val = 212.0 + 12.0 * st
        b_val = 184.0 + 7.0 * st
    else:
        st = (y - 350) / 92.0
        r_val = 252.0
        g_val = 224.0 - 6.0 * st
        b_val = 191.0 - 5.0 * st
        
    for x in range(215, 685):
        m = feathered_mask[y, x]
        if m > 0.001:
            orig_c = orig[y, x, :3].astype(float)
            tgt_c = np.array([r_val, g_val, b_val])
            blended = orig_c * (1.0 - m) + tgt_c * m
            skin_filled[y, x, :3] = np.clip(blended, 0, 255).astype(np.uint8)

# 3. Paste the clean lashes:
lash_l = Image.open('apps/web/public/neko/chibi/_pure_stroke_l_nobox.png').convert('RGBA')
lash_r = lash_l.transpose(Image.FLIP_LEFT_RIGHT)

scale = 1.15
wl, hl = int(lash_l.width * scale), int(lash_l.height * scale)
wr, hr = int(lash_r.width * scale), int(lash_r.height * scale)

cur_l = lash_l.resize((wl, hl), Image.Resampling.LANCZOS)
cur_r = lash_r.resize((wr, hr), Image.Resampling.LANCZOS)

# Position:
pos_lx = int(308 - wl * 0.47)
pos_ly = int(395 - hl * 0.62)

pos_rx = int(590 - wr * 0.53)
pos_ry = int(395 - hr * 0.62)

pil_skin = Image.fromarray(skin_filled)
pil_skin.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_skin.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_arr = np.array(pil_skin)

# Re-composite the hair bangs on top so bangs overlap the lash naturally
bangs_dilated = cv2.dilate(bangs.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
for c in range(3):
    final_arr[bangs_dilated > 0, c] = orig[bangs_dilated > 0, c]

res = Image.fromarray(final_arr)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_surgical_crop.png')
print("Surgical test saved!")
