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

# 2. Complete hair & eyebrow detection across the entire face (NO BOUNDING BOXES)
# Hair has saturated red/pink tone:
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
# Eyebrows are dark brown/red:
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 15) & (yy < 340)

# Protect all hair and eyebrows, but exclude iris inside the open eyeball:
# Iris is strictly y in [335, 435], x in [270, 385] (left) and [515, 630] (right)
is_iris = (yy > 335) & (yy < 435) & (((xx > 270) & (xx < 385)) | ((xx > 515) & (xx < 630)))

protected_features = (is_hair | is_brow) & (~is_iris)

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

# 4. Open eye socket mask:
# Exact ellipse fitting the eye socket:
# Left eye: center (310, 375), radii (86, 62)
# Right eye: center (590, 375), radii (86, 62)
eye_mask = np.zeros((h, w), dtype=np.float32)
cv2.ellipse(eye_mask, (310, 375), (86, 62), 0, 0, 360, 1.0, -1)
cv2.ellipse(eye_mask, (590, 375), (86, 62), 0, 0, 360, 1.0, -1)

# Zero out protected hair and eyebrow pixels from eye_mask:
eye_mask[protected_features] = 0.0

# Feather with 5px Gaussian blur:
eye_mask_feathered = cv2.GaussianBlur(eye_mask, (11, 11), 2.5)
# Zero out protected hair again after blur so hair is 100% pure original
eye_mask_feathered[protected_features] = 0.0

# 5. Blend fitted skin over the eye sockets:
canvas = orig.copy()
for c in range(3):
    canvas[:, :, c] = np.clip(
        orig[:, :, c].astype(float) * (1.0 - eye_mask_feathered) +
        fitted_skin[:, :, c] * eye_mask_feathered,
        0, 255
    ).astype(np.uint8)

# 6. Composite pure lashes:
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

# Restore protected hair and eyebrows on top of the lash if hair hangs over the lash
for c in range(3):
    final_img[protected_features, c] = orig[protected_features, c]

# Save face preview
res = Image.fromarray(final_img)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_surgical_perfection_crop.png')
print("Surgical perfection test generated!")
