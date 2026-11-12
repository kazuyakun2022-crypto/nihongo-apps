import cv2
import numpy as np
from PIL import Image

# Load original neko-chibi
orig_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
orig = np.array(orig_img)
h, w = orig.shape[:2]
rgb = orig[:, :, :3].astype(float)

# 1. Define the eye socket holes to fill:
# The hole is the eyeball (sclera + iris) and open upper lash.
# Left eye socket polygon:
poly_l = np.array([
    [222, 385],
    [235, 340],
    [270, 310],
    [320, 305],
    [365, 320],
    [395, 375],
    [390, 420],
    [365, 436],
    [310, 438],
    [255, 435],
    [225, 415]
], dtype=np.int32)

poly_r = np.array([
    [505, 375],
    [535, 320],
    [580, 305],
    [630, 310],
    [665, 340],
    [678, 385],
    [675, 415],
    [645, 435],
    [590, 438],
    [535, 436],
    [510, 420]
], dtype=np.int32)

hole_mask = np.zeros((h, w), dtype=bool)
poly_mask = np.zeros((h, w), dtype=np.uint8)
cv2.fillPoly(poly_mask, [poly_l, poly_r], 255)
hole_mask = poly_mask > 0

# Hair bangs inside the hole must be preserved as boundary conditions!
# Hair is saturated red/pink: r > 120, r - g > 35, g < 140
r = rgb[:, :, 0]
g = rgb[:, :, 1]
b = rgb[:, :, 2]
is_hair = (r > 120) & ((r - g) > 35) & (g < 140)

# Bangs that cross into the eye socket:
bangs = np.zeros((h, w), dtype=bool)
bangs[300:365, 375:405] = is_hair[300:365, 375:405]
bangs[300:375, 505:550] = is_hair[300:375, 505:550]
bangs[300:365, 575:625] = is_hair[300:365, 575:625]
bangs[300:440, 200:235] = is_hair[300:440, 200:235]
bangs[300:440, 665:700] = is_hair[300:440, 665:700]

# Eyebrow:
yy, xx = np.indices((h, w))
is_brow = (r < 185) & (g < 95) & (b < 105) & (r > g + 20) & (yy < 325)
bangs[300:330, :] |= is_brow[300:330, :]

# Remove bangs from hole_mask so they act as fixed boundary!
hole_mask = hole_mask & (~bangs)

# Solve Laplace equation: \nabla^2 u = 0 inside hole_mask
# Initialize u with average boundary skin
u = rgb.copy()

# Boundary pixels are the 1-pixel dilation of hole_mask that are not in hole_mask
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
boundary = cv2.dilate(hole_mask.astype(np.uint8), kernel).astype(bool) & (~hole_mask)

# Gauss-Seidel relaxation to solve Laplace equation
print("Solving Laplace equation...")
# Solve in bounding box of eyes: y in [295, 445], x in [215, 685]
ymin, ymax = 295, 445
xmin, xmax = 215, 685

box_hole = hole_mask[ymin:ymax, xmin:xmax]
box_u = u[ymin:ymax, xmin:xmax]

for it in range(300):
    # 4-neighbor average
    up = box_u[:-2, 1:-1]
    down = box_u[2:, 1:-1]
    left = box_u[1:-1, :-2]
    right = box_u[1:-1, 2:]
    avg = (up + down + left + right) * 0.25
    
    # Update hole pixels
    hole_inner = box_hole[1:-1, 1:-1]
    box_u[1:-1, 1:-1][hole_inner] = avg[hole_inner]

u[ymin:ymax, xmin:xmax] = box_u

# Save Laplace skin preview
skin_crop = Image.fromarray(np.clip(u, 0, 255).astype(np.uint8)).crop((150, 200, 750, 600))
skin_crop.save('apps/web/public/neko/chibi/_dbg_laplace_skin.png')
print("Laplace skin saved!")
