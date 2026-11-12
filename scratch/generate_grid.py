import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]

# 2. Extract hair bangs and eyebrows mask from original neko-chibi
r = orig[:, :, 0].astype(float)
g = orig[:, :, 1].astype(float)
b = orig[:, :, 2].astype(float)

is_hair = (r > 120) & ((r - g) > 35) & (g < 155)
is_brow = (r < 190) & (g < 95) & (b < 105) & (r > g + 20)

hair_layer_mask = np.zeros((h, w), dtype=bool)
# Bangs above left eye
hair_layer_mask[240:340, 200:400] = (is_hair | is_brow)[240:340, 200:400]
# Bangs between eyes
hair_layer_mask[240:395, 400:470] = (is_hair | is_brow)[240:395, 400:470]
# Bangs over right eye
hair_layer_mask[240:375, 470:560] = (is_hair | is_brow)[240:375, 470:560]
hair_layer_mask[240:365, 560:640] = (is_hair | is_brow)[240:365, 560:640]
# Side hair
hair_layer_mask[240:460, 150:235] = (is_hair | is_brow)[240:460, 150:235]
hair_layer_mask[240:460, 665:750] = (is_hair | is_brow)[240:460, 665:750]
# Eyebrows
hair_layer_mask[270:345, 210:370] |= is_brow[270:345, 210:370]
hair_layer_mask[270:345, 530:690] |= is_brow[270:345, 530:690]

# Hair overlay RGBA
hair_overlay = orig.copy()
# Smooth hair mask edges slightly for alpha blending
hair_mask_float = hair_layer_mask.astype(float)
hair_mask_smooth = cv2.GaussianBlur(hair_mask_float, (3, 3), 0.5)

# 3. Create eyelid skin coverage
# Eye socket contours:
# Left eye: center=(308, 375), axes=(92, 70)
# Right eye: center=(590, 375), axes=(92, 70)
eye_mask = np.zeros((h, w), dtype=np.float32)
cv2.ellipse(eye_mask, (308, 375), (92, 70), 0, 0, 360, 1.0, -1)
cv2.ellipse(eye_mask, (590, 375), (92, 70), 0, 0, 360, 1.0, -1)

# Smooth feathering:
eye_mask_blurred = cv2.GaussianBlur(eye_mask, (15, 15), 4.0)

# Build skin canvas
skin_canvas = orig.copy()
for y in range(290, 455):
    t = (y - 290) / (455 - 290)
    r_val = 253.0
    g_val = 226.0 - 4.0 * t
    b_val = 193.0 - 4.0 * t
    
    for x in range(195, 705):
        m = eye_mask_blurred[y, x]
        if m > 0.001:
            orig_rgb = orig[y, x, :3].astype(float)
            target_rgb = np.array([r_val, g_val, b_val])
            blended = orig_rgb * (1.0 - m) + target_rgb * m
            skin_canvas[y, x, :3] = np.clip(blended, 0, 255).astype(np.uint8)

# 4. Load cleanest lashes
lash_l_raw = Image.open('apps/web/public/neko/chibi/_cleanest_lash_l.png').convert('RGBA')
lash_r_raw = Image.open('apps/web/public/neko/chibi/_flipped_lash_r.png').convert('RGBA')

# Let's test 3 scales and vertical offsets
scales = [1.10, 1.15, 1.20]
offsets_y = [340, 348, 355]

for s in scales:
    for oy in offsets_y:
        test_face = skin_canvas.copy()
        
        # Resize lashes
        wl = int(lash_l_raw.width * s)
        hl = int(lash_l_raw.height * s)
        wr = int(lash_r_raw.width * s)
        hr = int(lash_r_raw.height * s)
        
        cur_l = lash_l_raw.resize((wl, hl), Image.Resampling.LANCZOS)
        cur_r = lash_r_raw.resize((wr, hr), Image.Resampling.LANCZOS)
        
        # Center of lash in cur_l is at roughly (wl * 0.48, hl * 0.60)
        # We want to place it so that lash center is at (308, oy + hl*0.1)
        pos_lx = int(308 - wl * 0.48)
        pos_ly = oy
        
        # Right lash is flipped, center is at (wr * 0.52, hr * 0.60)
        pos_rx = int(590 - wr * 0.52)
        pos_ry = oy
        
        pil_canvas = Image.fromarray(test_face)
        pil_canvas.paste(cur_l, (pos_lx, pos_ly), cur_l)
        pil_canvas.paste(cur_r, (pos_rx, pos_ry), cur_r)
        
        arr_comp = np.array(pil_canvas)
        
        # Composite hair bangs on top
        for c in range(3):
            arr_comp[:, :, c] = np.clip(
                arr_comp[:, :, c].astype(float) * (1.0 - hair_mask_smooth) +
                orig[:, :, c].astype(float) * hair_mask_smooth,
                0, 255
            ).astype(np.uint8)
        
        # Save crop
        out_img = Image.fromarray(arr_comp)
        out_crop = out_img.crop((150, 200, 750, 600))
        fname = f'apps/web/public/neko/chibi/_grid_s{int(s*100)}_y{oy}.png'
        out_crop.save(fname)

print("Grid generation done!")
