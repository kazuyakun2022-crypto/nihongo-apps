import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]

# 2. Hair bangs detection from neko-chibi to keep in front
r = orig[:, :, 0].astype(float)
g = orig[:, :, 1].astype(float)
b = orig[:, :, 2].astype(float)
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
yy, xx = np.indices((h, w))
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 20) & (yy < 330)

bangs = (is_hair | is_brow) & (yy < 375)
# Exclude lower eye centers so pupil is not treated as hair
bangs[(yy > 335) & (yy < 435) & (xx > 260) & (xx < 380)] = False
bangs[(yy > 335) & (yy < 435) & (xx > 530) & (xx < 640)] = False

# 3. Load artist patches
patch_l = Image.open('apps/web/public/neko/chibi/_artist_patch_l.png').convert('RGBA')
patch_r = Image.open('apps/web/public/neko/chibi/_artist_patch_r.png').convert('RGBA')

# Clean foreign hair at the top of artist patches:
arr_pl = np.array(patch_l)
arr_pr = np.array(patch_r)

# In patch_l, crease is around y=35..45. Anything above y < 20 is foreign hair
arr_pl[:20, :, 3] = 0
arr_pr[:20, :, 3] = 0

# Clean side hair remnants
arr_pl[:, :15, 3] = 0
arr_pr[:, -15:, 3] = 0

patch_l_clean = Image.fromarray(arr_pl)
patch_r_clean = Image.fromarray(arr_pr)

# Test vertical scales:
# Eye height in chibi is 135 px (from y=305 to 440)
# Clean patch height is about 75 px.
# Scale_y = 135 / 75 = 1.80 !
# Scale_x = 1.25
sx = 1.25
sy = 1.70

wl = int(patch_l_clean.width * sx)
hl = int(patch_l_clean.height * sy)
wr = int(patch_r_clean.width * sx)
hr = int(patch_r_clean.height * sy)

cur_l = patch_l_clean.resize((wl, hl), Image.Resampling.LANCZOS)
cur_r = patch_r_clean.resize((wr, hr), Image.Resampling.LANCZOS)

# Placement:
# Open eye is y in [305, 440]
# We want the patch to span from y=300 to y=445
pos_lx = int(308 - wl * 0.48)
pos_ly = 298

pos_rx = int(590 - wr * 0.52)
pos_ry = 298

canvas = orig_img.copy()
canvas.paste(cur_l, (pos_lx, pos_ly), cur_l)
canvas.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_arr = np.array(canvas)

# Restore hair bangs of neko-chibi on top
bangs_smooth = cv2.GaussianBlur(bangs.astype(float), (3, 3), 0.5)
for c in range(3):
    final_arr[bangs, c] = orig[bangs, c]

res = Image.fromarray(final_arr)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_stretched_crop.png')
print("Stretched artist test saved!")
