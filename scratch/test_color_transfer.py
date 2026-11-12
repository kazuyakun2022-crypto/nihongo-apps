import cv2
import numpy as np
from PIL import Image

# 1. Load neko-chibi face (destination)
chibi = np.array(Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGB'))

# Sample skin from chibi forehead/nose-bridge (x: 420-460, y: 350-420)
chibi_skin_sample = chibi[350:420, 420:460]
chibi_lab = cv2.cvtColor(chibi_skin_sample, cv2.COLOR_RGB2LAB).astype(float)
chibi_mean = chibi_lab.mean(axis=(0, 1))
chibi_std = chibi_lab.std(axis=(0, 1))
print("Chibi skin LAB mean:", chibi_mean, "std:", chibi_std)

# 2. Load raw crops of dielus eyes (source)
crop_l = np.array(Image.open('apps/web/public/neko/chibi/_raw_crop_l.png').convert('RGB'))
crop_r = np.array(Image.open('apps/web/public/neko/chibi/_raw_crop_r.png').convert('RGB'))

# Sample skin from dielus crop (top skin area: y: 5-25, x: 60-140)
dielus_skin_sample = crop_l[5:25, 60:140]
dielus_lab = cv2.cvtColor(dielus_skin_sample, cv2.COLOR_RGB2LAB).astype(float)
dielus_mean = dielus_lab.mean(axis=(0, 1))
dielus_std = np.maximum(dielus_lab.std(axis=(0, 1)), 1e-4)
print("Dielus skin LAB mean:", dielus_mean, "std:", dielus_std)

# Reinhard color transfer function
def transfer_color(src_rgb):
    src_lab = cv2.cvtColor(src_rgb, cv2.COLOR_RGB2LAB).astype(float)
    # Only adjust skin/light pixels (L > 150), keep dark lash lines deep black
    l_chan = src_lab[:, :, 0]
    weight = np.clip((l_chan - 100.0) / 100.0, 0.0, 1.0)[:, :, None]
    
    # Scale and shift to match destination mean and std
    matched_lab = (src_lab - dielus_mean) * (chibi_std / dielus_std) + chibi_mean
    # Blend with original for dark features (lashes)
    final_lab = src_lab * (1.0 - weight) + matched_lab * weight
    final_lab = np.clip(final_lab, 0, 255).astype(np.uint8)
    return cv2.cvtColor(final_lab, cv2.COLOR_LAB2RGB)

trans_l = transfer_color(crop_l)
trans_r = transfer_color(crop_r)

Image.fromarray(trans_l).save('apps/web/public/neko/chibi/_color_matched_l.png')
Image.fromarray(trans_r).save('apps/web/public/neko/chibi/_color_matched_r.png')
print("Color matched crops saved!")
