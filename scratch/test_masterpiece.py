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

# 2. Extract true hair bangs and eyebrows mask to keep them in front:
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 20) & (yy < 330)

# The bangs in the eye region:
bangs = np.zeros((h, w), dtype=bool)
# Center bang between eyes pointing down
bangs[240:385, 400:465] = is_hair[240:385, 400:465]
# Bang crossing right eye
bangs[240:375, 505:550] = is_hair[240:375, 505:550]
bangs[240:365, 575:625] = is_hair[240:365, 575:625]
# Side hair
bangs[240:440, 190:235] = is_hair[240:440, 190:235]
bangs[240:440, 665:710] = is_hair[240:440, 665:710]
# Bang above left eye
bangs[240:340, 240:275] = is_hair[240:340, 240:275]
# Eyebrows
bangs[270:330, 215:365] |= is_brow[270:330, 215:365]
bangs[270:330, 535:685] |= is_brow[270:330, 535:685]

# 3. Fit smooth 2D polynomial skin surface to Miu's actual face skin:
face_zone = (yy >= 260) & (yy <= 500) & (xx >= 180) & (xx <= 720)
is_dark = (r < 110) | (g < 110) | (b < 110)
is_sclera = (r > 240) & (g > 240) & (b > 240)
in_eyes = (yy >= 305) & (yy <= 440) & (((xx >= 220) & (xx <= 405)) | ((xx >= 495) & (xx <= 680)))
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

# 4. Open eye socket polygon mask:
# Exactly covers the open upper eyelash and the eyeball
pts_l = np.array([
    [222, 385],
    [232, 350],
    [265, 320],
    [310, 305],
    [345, 305],
    [375, 315],
    [395, 345],
    [400, 395],
    [390, 425],
    [360, 438],
    [310, 440],
    [260, 438],
    [230, 420],
], dtype=np.int32)

pts_r = np.array([
    [500, 395],
    [505, 345],
    [525, 315],
    [555, 305],
    [590, 305],
    [635, 320],
    [668, 350],
    [678, 385],
    [670, 420],
    [640, 438],
    [590, 440],
    [540, 438],
    [510, 425],
], dtype=np.int32)

eye_poly_mask = np.zeros((h, w), dtype=np.float32)
cv2.fillPoly(eye_poly_mask, [pts_l, pts_r], 1.0)

# Smooth feathering: 11px Gaussian blur
eye_mask_feathered = cv2.GaussianBlur(eye_poly_mask, (15, 15), 3.5)

# 5. Blend fitted skin over the open eye sockets:
canvas = orig.copy()
for c in range(3):
    canvas[:, :, c] = np.clip(
        orig[:, :, c].astype(float) * (1.0 - eye_mask_feathered) +
        fitted_skin[:, :, c] * eye_mask_feathered,
        0, 255
    ).astype(np.uint8)

# 6. Load cleanest artist lashes:
lash_l = Image.open('apps/web/public/neko/chibi/_pure_stroke_l_nobox.png').convert('RGBA')
lash_r = lash_l.transpose(Image.FLIP_LEFT_RIGHT)

scale = 1.15
wl, hl = int(lash_l.width * scale), int(lash_l.height * scale)
wr, hr = int(lash_r.width * scale), int(lash_r.height * scale)

cur_l = lash_l.resize((wl, hl), Image.Resampling.LANCZOS)
cur_r = lash_r.resize((wr, hr), Image.Resampling.LANCZOS)

pos_lx = int(308 - wl * 0.47)
pos_ly = int(405 - hl * 0.62)

pos_rx = int(590 - wr * 0.53)
pos_ry = int(405 - hr * 0.62)

pil_comp = Image.fromarray(canvas)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_img = np.array(pil_comp)

# 7. Restore original hair bangs and eyebrows on top
# With soft anti-aliased edge
bangs_smooth = cv2.GaussianBlur(bangs.astype(float), (3, 3), 0.5)
for c in range(3):
    final_img[:, :, c] = np.clip(
        final_img[:, :, c].astype(float) * (1.0 - bangs_smooth) +
        orig[:, :, c].astype(float) * bangs_smooth,
        0, 255
    ).astype(np.uint8)

# Save test crop
res = Image.fromarray(final_img)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_masterpiece_crop.png')
print("Masterpiece test generated!")
