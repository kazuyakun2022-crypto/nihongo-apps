import cv2
import numpy as np
from PIL import Image

# Load destination: neko-chibi (open eyes)
dst_img = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
dst = np.array(dst_img)

# Load source: miu-closed (artist closed eyes)
src_img = Image.open('apps/web/public/neko/splash/miu-closed.webp').convert('RGBA')
src = np.array(src_img)

# In miu-closed (768x768):
# Left eye closed center: x ≈ 275, y ≈ 470
# Right eye closed center: x ≈ 495, y ≈ 470
# In neko-chibi (900x1205):
# Left eye center: x ≈ 310, y ≈ 380
# Right eye center: x ≈ 590, y ≈ 380

# Eye width in miu-closed is about 150 px.
# Eye width in neko-chibi is about 185 px.
# Scale = 185 / 150 ≈ 1.233
scale = 1.233

# Let's crop left eye from miu-closed and right eye from miu-closed:
# In miu-closed:
# Left eye: x in [190, 360], y in [425, 520] (w=170, h=95)
# Right eye: x in [410, 580], y in [425, 520] (w=170, h=95)

crop_l = src[425:520, 190:360, :3]
crop_r = src[425:520, 410:580, :3]

# Resize to chibi scale
new_w = int(170 * scale)
new_h = int(95 * scale)

eye_l_scaled = cv2.resize(crop_l, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
eye_r_scaled = cv2.resize(crop_r, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

# Create seamlessClone mask for left eye (ellipse covering eye socket)
mask_l = np.zeros((new_h, new_w), dtype=np.uint8)
cv2.ellipse(mask_l, (new_w // 2, new_h // 2), (new_w // 2 - 4, new_h // 2 - 4), 0, 0, 360, 255, -1)

# Center in destination chibi:
center_l = (310, 385)
center_r = (590, 385)

# Run cv2.seamlessClone on left eye
cloned = dst[:, :, :3].copy()
cloned = cv2.seamlessClone(eye_l_scaled, cloned, mask_l, center_l, cv2.NORMAL_CLONE)

# Run cv2.seamlessClone on right eye
cloned = cv2.seamlessClone(eye_r_scaled, cloned, mask_l, center_r, cv2.NORMAL_CLONE)

# Save result preview
res = Image.fromarray(cloned)
res.crop((150, 200, 750, 600)).save('apps/web/public/neko/chibi/_test_poisson_crop.png')
print("Poisson test saved successfully!")
