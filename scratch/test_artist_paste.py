import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)

# 2. Load artist patches
patch_l = Image.open('apps/web/public/neko/chibi/_artist_patch_l.png').convert('RGBA')
patch_r = Image.open('apps/web/public/neko/chibi/_artist_patch_r.png').convert('RGBA')

# Scale patches to fit chibi eyes
# Let's test scale 1.15, 1.20, 1.25
scales = [1.15, 1.20, 1.25]

for s in scales:
    wl, hl = int(patch_l.width * s), int(patch_l.height * s)
    wr, hr = int(patch_r.width * s), int(patch_r.height * s)
    
    cur_l = patch_l.resize((wl, hl), Image.Resampling.LANCZOS)
    cur_r = patch_r.resize((wr, hr), Image.Resampling.LANCZOS)
    
    # Position:
    # In patch_l (175, 95):
    # Lash center in patch_l is roughly at (88, 58).
    # Chibi left eye center is (308, 385).
    # So paste at pos_x = 308 - 88*s, pos_y = 385 - 58*s
    pos_lx = int(308 - 88 * s)
    pos_ly = int(385 - 58 * s)
    
    # In patch_r (175, 95):
    # Lash center is roughly at (88, 58).
    # Chibi right eye center is (590, 385).
    pos_rx = int(590 - 88 * s)
    pos_ry = int(385 - 58 * s)
    
    canvas = orig_img.copy()
    canvas.paste(cur_l, (pos_lx, pos_ly), cur_l)
    canvas.paste(cur_r, (pos_rx, pos_ry), cur_r)
    
    res = np.array(canvas)
    crop = Image.fromarray(res).crop((150, 200, 750, 600))
    crop.save(f'apps/web/public/neko/chibi/_test_artist_s{int(s*100)}.png')

print("Artist patch tests saved!")
