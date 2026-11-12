import cv2
import numpy as np
from PIL import Image

# 1. Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]

# 2. Extract hair mask from original neko-chibi in the face region
# Hair in neko-chibi is red/pink or dark red:
# R > 120, and R - G > 35, and G < 155
# Eyebrows are dark brown: R in [120, 185], G < 90, B < 100
r = orig[:, :, 0].astype(float)
g = orig[:, :, 1].astype(float)
b = orig[:, :, 2].astype(float)
a = orig[:, :, 3].astype(float)

is_hair = (r > 120) & ((r - g) > 35) & (g < 155)
is_brow = (r < 190) & (g < 95) & (b < 105) & (r > g + 20)

# Limit hair mask to the forehead and bangs area (y < 420, x between 180 and 720)
# But exclude pupil/iris (which can have red tones)
# Iris in left eye is at x in [270, 385], y in [335, 435]
# Iris in right eye is at x in [515, 630], y in [335, 435]
# Notice hair bangs over left eye are at y <= 335, and between eyes at x in [400, 460]
# Hair bang over right eye is at x in [505, 550], y <= 370; and x in [580, 625], y <= 365
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

# 3. Create clean eyelid skin
# The skin gradient from y=290 to y=445:
# y=290: [253, 226, 193]
# y=445: [252, 223, 190]
skin_canvas = orig.copy()

# Eyelid mask for left eye and right eye
# Left eye socket: x in [225, 405], y in [300, 438]
# Right eye socket: x in [495, 675], y in [300, 438]
eye_mask = np.zeros((h, w), dtype=np.float32)

# Left eye ellipse
cv2.ellipse(eye_mask, (315, 375), (88, 68), 0, 0, 360, 1.0, -1)
# Right eye ellipse
cv2.ellipse(eye_mask, (585, 375), (88, 68), 0, 0, 360, 1.0, -1)

# Feather the eye mask gently (Gaussian blur radius 9)
eye_mask_blurred = cv2.GaussianBlur(eye_mask, (19, 19), 5.0)

# Fill the eye regions with natural smooth skin
# Let's compute skin RGB for every pixel (y, x):
for y in range(280, 460):
    t = (y - 280) / (460 - 280)
    # Natural creamy peach skin tone:
    r_val = 253.0
    g_val = 226.0 - 3.0 * t
    b_val = 193.0 - 3.0 * t
    
    for x in range(200, 700):
        m = eye_mask_blurred[y, x]
        if m > 0.001:
            # If on cheek blush zone (y > 425 and near blush center), add soft blush warmth
            blush = 0.0
            # Left cheek blush center: (315, 465)
            dl = np.hypot((x - 315) / 60.0, (y - 465) / 35.0)
            if dl < 1.0:
                blush = max(blush, (1.0 - dl) * 0.5)
            # Right cheek blush center: (590, 465)
            dr = np.hypot((x - 590) / 60.0, (y - 465) / 35.0)
            if dr < 1.0:
                blush = max(blush, (1.0 - dr) * 0.5)
            
            cur_g = g_val - blush * 45.0
            cur_b = b_val - blush * 30.0
            
            # Blend into skin_canvas
            orig_rgb = orig[y, x, :3].astype(float)
            target_rgb = np.array([r_val, cur_g, cur_b])
            blended = orig_rgb * (1.0 - m) + target_rgb * m
            skin_canvas[y, x, :3] = np.clip(blended, 0, 255).astype(np.uint8)

# 4. Now load cleaned lashes and place them on the skin canvas
lash_l = Image.open('apps/web/public/neko/chibi/_clean_lash_l.png').convert('RGBA')
lash_r = Image.open('apps/web/public/neko/chibi/_clean_lash_r.png').convert('RGBA')

# Clean lash_l: keep y in [22, 95]
arr_ll = np.array(lash_l)
arr_ll[:22, :, 3] = 0
arr_ll[95:, :, 3] = 0
lash_l = Image.fromarray(arr_ll)

# Clean lash_r: keep y in [22, 95]
arr_lr = np.array(lash_r)
arr_lr[:22, :, 3] = 0
arr_lr[95:, :, 3] = 0
lash_r = Image.fromarray(arr_lr)

# Scale lashes to fit chibi eyes perfectly:
# Chibi eye width is ~175 px, lash width in crop is ~160 px.
# Scale by 1.05
w_l, h_l = int(lash_l.width * 1.05), int(lash_l.height * 1.05)
w_r, h_r = int(lash_r.width * 1.05), int(lash_r.height * 1.05)
lash_l = lash_l.resize((w_l, h_l), Image.Resampling.LANCZOS)
lash_r = lash_r.resize((w_r, h_r), Image.Resampling.LANCZOS)

# Position of lashes:
# Left eye center is x=315, y=385.
# Lash center in crop is roughly (110, 60).
# So paste at: pos_x = 315 - 110 = 205, pos_y = 385 - 60 = 325
pos_lx = 205
pos_ly = 345

# Right eye center is x=585, y=385.
# Lash center in crop is roughly (95, 60).
pos_rx = 485
pos_ry = 345

# Composite lashes onto skin_canvas
pil_skin = Image.fromarray(skin_canvas)
pil_skin.paste(lash_l, (pos_lx, pos_ly), lash_l)
pil_skin.paste(lash_r, (pos_rx, pos_ry), lash_r)

final_arr = np.array(pil_skin)

# 5. Restore original hair bangs and eyebrows on top!
# Wherever hair_layer_mask is True and orig has hair/brow, restore orig pixels!
final_arr[hair_layer_mask] = orig[hair_layer_mask]

# Save face preview
result_img = Image.fromarray(final_arr)
result_img.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_perfect_composite_crop.png')
print("Composite test saved successfully!")
