import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]
rgb = orig[:, :, :3].astype(float)

r = rgb[:, :, 0]
g = rgb[:, :, 1]
b = rgb[:, :, 2]
yy, xx = np.indices((h, w))

# 2. Extract true hair bangs and eyebrows to keep them in front:
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 20) & (yy < 330)

# Eyeball protection from hair detection:
is_eyeball = (yy > 330) & (yy < 438) & (((xx > 240) & (xx < 390)) | ((xx > 510) & (xx < 665)))

# Protected features (hair bangs and eyebrows):
protected = (is_hair | is_brow) & (~is_eyeball)

# 3. Fit 2D polynomial surface to Miu's real face skin
face_zone = (yy >= 260) & (yy <= 500) & (xx >= 180) & (xx <= 720)
is_dark = (r < 110) | (g < 110) | (b < 110)
is_sclera = (r > 240) & (g > 240) & (b > 240)
in_eyes = (yy >= 305) & (yy <= 440) & (((xx >= 215) & (xx <= 405)) | ((xx >= 495) & (xx <= 685)))
is_skin = face_zone & (~is_hair) & (~is_dark) & (~is_sclera) & (~in_eyes)

skin_ys, skin_xs = np.where(is_skin)
X_mat = np.column_stack([
    np.ones_like(skin_xs, dtype=float),
    skin_xs,
    skin_ys,
    skin_xs**2,
    skin_ys**2,
    skin_xs * skin_ys
])

coef_r, _, _, _ = np.linalg.lstsq(X_mat, r[skin_ys, skin_xs], rcond=None)
coef_g, _, _, _ = np.linalg.lstsq(X_mat, g[skin_ys, skin_xs], rcond=None)
coef_b, _, _, _ = np.linalg.lstsq(X_mat, b[skin_ys, skin_xs], rcond=None)

grid_X = np.column_stack([
    np.ones(h * w, dtype=float),
    xx.ravel(),
    yy.ravel(),
    (xx**2).ravel(),
    (yy**2).ravel(),
    (xx * yy).ravel()
])

fitted_r = grid_X.dot(coef_r).reshape((h, w))
fitted_g = grid_X.dot(coef_g).reshape((h, w))
fitted_b = grid_X.dot(coef_b).reshape((h, w))
fitted_skin = np.dstack([fitted_r, fitted_g, fitted_b])

# 4. Generous eye mask: covers 100% of the open eye
# Left eye: center (308, 375), radii (95, 72)
# Right eye: center (590, 375), radii (95, 72)
eye_mask = np.zeros((h, w), dtype=np.float32)
cv2.ellipse(eye_mask, (308, 375), (95, 72), 0, 0, 360, 1.0, -1)
cv2.ellipse(eye_mask, (590, 375), (95, 72), 0, 0, 360, 1.0, -1)

# Feather gently: 15px Gaussian blur
eye_mask_feathered = cv2.GaussianBlur(eye_mask, (25, 25), 6.0)

# Replace eye sockets with fitted skin
skin_blended = orig.copy()
for c in range(3):
    skin_blended[:, :, c] = np.clip(
        orig[:, :, c].astype(float) * (1.0 - eye_mask_feathered) +
        fitted_skin[:, :, c] * eye_mask_feathered,
        0, 255
    ).astype(np.uint8)

# 5. Load pure stroke lashes (nobox)
lash_l = Image.open('apps/web/public/neko/chibi/_pure_stroke_l_nobox.png').convert('RGBA')
lash_r = lash_l.transpose(Image.FLIP_LEFT_RIGHT)

# Test lash scale and placement
scale = 1.18
wl, hl = int(lash_l.width * scale), int(lash_l.height * scale)
wr, hr = int(lash_r.width * scale), int(lash_r.height * scale)

cur_l = lash_l.resize((wl, hl), Image.Resampling.LANCZOS)
cur_r = lash_r.resize((wr, hr), Image.Resampling.LANCZOS)

# Position: center lash arch at y=405
pos_lx = int(308 - wl * 0.47)
pos_ly = int(405 - hl * 0.62)

pos_rx = int(590 - wr * 0.53)
pos_ry = int(405 - hr * 0.62)

pil_comp = Image.fromarray(skin_blended)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_img = np.array(pil_comp)

# 6. Restore hair bangs that hang over the eyelid:
# Bangs above left eye
hair_restore = np.zeros((h, w), dtype=bool)
# Center bang between eyes
hair_restore[240:390, 395:465] = is_hair[240:390, 395:465]
# Bang over right eye
hair_restore[240:375, 505:550] = is_hair[240:375, 505:550]
hair_restore[240:365, 575:625] = is_hair[240:365, 575:625]
# Side hair
hair_restore[240:440, 190:235] = is_hair[240:440, 190:235]
hair_restore[240:440, 665:710] = is_hair[240:440, 665:710]
# Bang over left eye
hair_restore[240:340, 240:275] = is_hair[240:340, 240:275]

# Feather hair restore slightly for sub-pixel anti-aliasing
hair_restore_smooth = cv2.GaussianBlur(hair_restore.astype(float), (3, 3), 0.5)

for c in range(3):
    final_img[:, :, c] = np.clip(
        final_img[:, :, c].astype(float) * (1.0 - hair_restore_smooth) +
        orig[:, :, c].astype(float) * hair_restore_smooth,
        0, 255
    ).astype(np.uint8)

# Save face preview
res = Image.fromarray(final_img)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_ultimate_crop.png')
print("Ultimate test generated!")
