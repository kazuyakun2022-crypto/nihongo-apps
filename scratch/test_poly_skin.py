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

# 2. Find pure skin pixels in the face region (y in [260, 500], x in [180, 720])
# Pure skin:
# R > 220, G > 140, B > 120, R > G, G > B
# Exclude hair: hair is r > 120, r - g > 35, g < 145
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
# Exclude dark brows, lashes, pupil:
is_dark = (r < 110) | (g < 110) | (b < 110)
# Exclude white sclera of eye:
is_sclera = (r > 240) & (g > 240) & (b > 240)
# Exclude eye interior (y in [310, 440], x in [230, 400] and [500, 670]):
in_left_eye = (r >= 0) & (yy >= 310) & (yy <= 440) & (xx >= 230) & (xx <= 400) if 'yy' in locals() else None
yy, xx = np.indices((h, w))
in_left_eye = (yy >= 310) & (yy <= 440) & (xx >= 230) & (xx <= 400)
in_right_eye = (yy >= 310) & (yy <= 440) & (xx >= 310) & (yy <= 440) & (xx >= 500) & (xx <= 670)

face_zone = (yy >= 260) & (yy <= 500) & (xx >= 180) & (xx <= 720)
is_skin = face_zone & (~is_hair) & (~is_dark) & (~is_sclera) & (~in_left_eye) & (~in_right_eye)

skin_ys, skin_xs = np.where(is_skin)
print(f"Found {len(skin_ys)} real skin sample points on Miu's face.")

# 3. Fit 2nd-degree polynomial surface to R, G, B channels:
# S(x, y) = c0 + c1*x + c2*y + c3*x^2 + c4*y^2 + c5*x*y
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

print("Polynomial fitting completed!")

# 4. Evaluate fitted skin surface across the entire face
grid_X = np.column_stack([
    np.ones(h * w, dtype=float),
    xx.ravel(),
    yy.ravel(),
    (xx**2).ravel(),
    (yy**2).ravel(),
    (xx * yy).ravel()
])

pred_r = grid_X.dot(coef_r).reshape((h, w))
pred_g = grid_X.dot(coef_g).reshape((h, w))
pred_b = grid_X.dot(coef_b).reshape((h, w))
fitted_skin = np.dstack([pred_r, pred_g, pred_b])

# 5. Eyeball + open upper lash mask:
# Left eye: center (308, 375), radii (82, 60)
# Right eye: center (590, 375), radii (82, 60)
eye_mask = np.zeros((h, w), dtype=np.float32)
cv2.ellipse(eye_mask, (308, 375), (82, 60), 0, 0, 360, 1.0, -1)
cv2.ellipse(eye_mask, (590, 375), (82, 60), 0, 0, 360, 1.0, -1)

# Smooth feathering: 11px Gaussian blur
eye_mask_feathered = cv2.GaussianBlur(eye_mask, (21, 21), 5.0)

# Replace eye socket with fitted skin
skin_blended = orig.copy()
for c in range(3):
    skin_blended[:, :, c] = np.clip(
        orig[:, :, c].astype(float) * (1.0 - eye_mask_feathered) +
        fitted_skin[:, :, c] * eye_mask_feathered,
        0, 255
    ).astype(np.uint8)

# 6. Composite pure lashes on top of fitted skin
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

pil_comp = Image.fromarray(skin_blended)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_arr = np.array(pil_comp)

# Re-composite bangs on top
hair_mask = is_hair & (yy < 380) & (xx > 180) & (xx < 720)
# Exclude eye centers from hair_mask
hair_mask[(yy > 340) & (yy < 430) & (xx > 250) & (xx < 370)] = False
hair_mask[(yy > 340) & (yy < 430) & (xx > 530) & (xx < 650)] = False
# Restore hair bangs on top
for c in range(3):
    final_arr[hair_mask, c] = orig[hair_mask, c]

# Save preview
res_img = Image.fromarray(final_arr)
res_img.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_poly_skin_crop.png')
print("Polynomial skin test completed!")
