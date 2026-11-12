import cv2
import numpy as np
from PIL import Image

orig = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
arr = np.array(orig)
h, w = arr.shape[:2]

# Eye mask:
eye_mask = np.zeros((h, w), dtype=np.float32)
cv2.ellipse(eye_mask, (308, 375), (86, 64), 0, 0, 360, 1.0, -1)
cv2.ellipse(eye_mask, (590, 375), (86, 64), 0, 0, 360, 1.0, -1)

# Feather gently:
eye_mask_blurred = cv2.GaussianBlur(eye_mask, (15, 15), 4.0)

# Build skin canvas with REAL skin tone:
# Real skin on Miu's face:
# Top skin: [239, 167, 148]
# Bridge / mid: [246, 180, 155]
# Cheek blush: [251, 175, 160]
skin_canvas = arr.copy()
for y in range(295, 445):
    t = (y - 295) / (445 - 295)
    r_val = 240.0 + 10.0 * t
    g_val = 168.0 + 8.0 * t
    b_val = 149.0 + 9.0 * t
    
    for x in range(210, 690):
        m = eye_mask_blurred[y, x]
        if m > 0.001:
            orig_rgb = arr[y, x, :3].astype(float)
            target_rgb = np.array([r_val, g_val, b_val])
            blended = orig_rgb * (1.0 - m) + target_rgb * m
            skin_canvas[y, x, :3] = np.clip(blended, 0, 255).astype(np.uint8)

# Now paste purest lashes
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

pil_comp = Image.fromarray(skin_canvas)
pil_comp.paste(cur_l, (pos_lx, pos_ly), cur_l)
pil_comp.paste(cur_r, (pos_rx, pos_ry), cur_r)

res = np.array(pil_comp)

# Save test crop
Image.fromarray(res).crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_real_skin_crop.png')
print("Real skin crop saved!")
