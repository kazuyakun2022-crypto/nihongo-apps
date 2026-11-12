import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]
rgb = orig[:, :, :3]

r = rgb[:, :, 0].astype(float)
g = rgb[:, :, 1].astype(float)
b = rgb[:, :, 2].astype(float)

# 2. Identify eye socket bounding boxes
# Left eye: x in [220, 395], y in [305, 436]
# Right eye: x in [505, 680], y in [305, 436]
in_left = np.zeros((h, w), dtype=bool)
in_left[305:438, 220:400] = True

in_right = np.zeros((h, w), dtype=bool)
in_right[305:438, 505:680] = True

# 3. Identify hair bangs and eyebrows to protect them 100%:
is_hair = (r > 120) & ((r - g) > 35) & (g < 145)
# Hair bangs specifically at the top/sides of eyes:
bangs = np.zeros((h, w), dtype=bool)
bangs[300:365, 375:405] = is_hair[300:365, 375:405]
bangs[300:375, 505:550] = is_hair[300:375, 505:550]
bangs[300:365, 575:625] = is_hair[300:365, 575:625]
bangs[300:440, 200:235] = is_hair[300:440, 200:235]
bangs[300:440, 665:700] = is_hair[300:440, 665:700]

# Eyebrow (y < 325):
yy, xx = np.indices((h, w))
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 20) & (yy < 325)
bangs[300:330, :] |= is_brow[300:330, :]

# 4. Open eye pixels to inpaint:
# Sclera (white):
is_white = (r > 195) & (g > 195) & (b > 195)
# Iris (reddish brown inside eye):
is_iris = (r > 80) & (r < 225) & (g < 115) & (b < 115) & ((r - g) > 20)
# Pupil & open lash (black):
is_dark = (r < 75) & (g < 75) & (b < 75)

# Open eye features to remove:
open_eye_mask = (in_left | in_right) & (is_white | is_iris | is_dark) & (~bangs)

# Morphological close to bridge internal gaps
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
open_eye_closed = cv2.morphologyEx(open_eye_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)

# Dilate by 3 px to fully encompass antialiased edges of open lash and sclera
kernel_d = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
open_eye_dilated = cv2.dilate(open_eye_closed, kernel_d)
open_eye_dilated[bangs] = 0

# Save mask preview
Image.fromarray((open_eye_dilated * 255).astype(np.uint8)).crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_dbg_clean_eye_mask.png')

# 5. Inpaint using cv2.INPAINT_TELEA
inpainted = cv2.inpaint(rgb.astype(np.uint8), open_eye_dilated, 7, cv2.INPAINT_TELEA)

# Save inpainted skin preview
Image.fromarray(inpainted).crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_dbg_surgical_inpaint.png')

# 6. Paste pure stroke lashes on top of inpainted skin
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

pil_comp = Image.fromarray(inpainted)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

final_res = np.array(pil_comp)

# Re-paste bangs so they overlap the new lash naturally
for c in range(3):
    final_res[bangs, c] = orig[bangs, c]

res_img = Image.fromarray(final_res)
res_img.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_surgical_inpaint_result.png')
print("Surgical inpaint test completed!")
