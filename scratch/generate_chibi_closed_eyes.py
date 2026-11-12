import cv2
import numpy as np
from PIL import Image

def build_perfect_face():
    chibi = np.array(Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA'))
    H, W, _ = chibi.shape

    # 1. Load pure lash strokes (extracted from official art, pure dark stroke)
    lash_l_img = Image.open('apps/web/public/neko/chibi/_pure_lash_l.png').convert('RGBA')
    lash_r_img = Image.open('apps/web/public/neko/chibi/_pure_lash_r.png').convert('RGBA')
    lash_l = np.array(lash_l_img)
    lash_r = np.array(lash_r_img)

    yl, xl = np.where(lash_l[:,:,3] > 0)
    clash_l = lash_l[yl.min():yl.max()+1, xl.min():xl.max()+1]
    yr, xr = np.where(lash_r[:,:,3] > 0)
    clash_r = lash_r[yr.min():yr.max()+1, xr.min():xr.max()+1]

    # 2. Complete Eye Socket Mask enclosing 100% of open upper lash and eyeball
    mask_full = np.zeros((H, W), dtype=np.uint8)

    # Left eye: y in [294..460], x in [254..418]
    pts_l = np.array([
        [254, 420], [258, 360], [270, 308], [298, 294], [338, 292],
        [375, 300], [402, 328], [414, 375], [416, 422], [402, 448],
        [365, 460], [318, 460], [280, 448], [256, 432]
    ], dtype=np.int32)
    cv2.fillPoly(mask_full, [pts_l], 255)

    # Right eye: y in [294..460], x in [488..618]
    pts_r = np.array([
        [488, 422], [492, 375], [504, 328], [530, 298], [558, 292],
        [585, 300], [605, 328], [616, 375], [614, 422], [604, 448],
        [575, 460], [535, 460], [505, 448], [490, 432]
    ], dtype=np.int32)
    cv2.fillPoly(mask_full, [pts_r], 255)

    # Soft feather at boundary (4px)
    mask_feather = cv2.GaussianBlur(mask_full, (9, 9), 3.0) / 255.0

    closed_layer = np.zeros((H, W, 4), dtype=np.uint8)

    # 3. Fill with EXACT measured face skin gradient of Miu
    # Base skin at forehead: [251, 224, 191]
    # Blush skin at cheek: [250, 175, 160]
    # Nose bridge: [252, 224, 190]
    for y in range(292, 462):
        v = (y - 292) / float(462 - 292)
        for x in range(254, 419):
            mf = mask_feather[y, x]
            if mf > 0.005:
                h = (x - 254) / float(418 - 254)
                # Exact skin formula:
                r = 251.0
                g = 224.0 - 49.0 * v
                b = 191.0 - 31.0 * v
                closed_layer[y, x, :3] = [int(r), int(g), int(b)]
                closed_layer[y, x, 3] = int(mf * 255)

    for y in range(292, 462):
        v = (y - 292) / float(462 - 292)
        for x in range(488, 619):
            mf = mask_feather[y, x]
            if mf > 0.005:
                h = (x - 488) / float(618 - 488)
                r = 251.0
                g = 224.0 - 49.0 * v
                b = 191.0 - 31.0 * v
                closed_layer[y, x, :3] = [int(r), int(g), int(b)]
                closed_layer[y, x, 3] = int(mf * 255)

    # 4. Draw double eyelid creases (futae)
    futae_l = np.zeros((H, W, 4), dtype=np.uint8)
    cv2.ellipse(futae_l, (338, 395), (46, 17), 2, 188, 352, (150, 65, 78, 170), 2, cv2.LINE_AA)
    futae_l = cv2.GaussianBlur(futae_l, (3, 3), 0.7)

    futae_r = np.zeros((H, W, 4), dtype=np.uint8)
    cv2.ellipse(futae_r, (556, 395), (42, 16), -2, 188, 352, (150, 65, 78, 170), 2, cv2.LINE_AA)
    futae_r = cv2.GaussianBlur(futae_r, (3, 3), 0.7)

    # 5. Position eyelashes
    tw_l = 146
    scale_l = tw_l / float(clash_l.shape[1])
    th_l = int(clash_l.shape[0] * scale_l)
    res_lash_l = cv2.resize(clash_l, (tw_l, th_l), interpolation=cv2.INTER_LANCZOS4)
    pos_xl, pos_yl = 265, 405

    tw_r = 120
    scale_r = tw_r / float(clash_r.shape[1])
    th_r = int(clash_r.shape[0] * scale_r)
    res_lash_r = cv2.resize(clash_r, (tw_r, th_r), interpolation=cv2.INTER_LANCZOS4)
    pos_xr, pos_yr = 492, 406

    def blit(dst, src, px, py):
        h, w = src.shape[:2]
        for y in range(h):
            for x in range(w):
                sa = src[y, x, 3] / 255.0
                if sa > 0:
                    dy, dx = py + y, px + x
                    if 0 <= dy < H and 0 <= dx < W:
                        da = dst[dy, dx, 3] / 255.0
                        oa = sa + da * (1.0 - sa)
                        if oa > 0:
                            for c in range(3):
                                dst[dy, dx, c] = int((src[y, x, c] * sa + dst[dy, dx, c] * da * (1.0 - sa)) / oa)
                            dst[dy, dx, 3] = int(oa * 255)

    blit(closed_layer, futae_l, 0, 0)
    blit(closed_layer, futae_r, 0, 0)
    blit(closed_layer, res_lash_l, pos_xl, pos_yl)
    blit(closed_layer, res_lash_r, pos_xr, pos_yr)

    # 6. Preserve real foreground hair bangs from chibi on top of closed eye
    for y in range(292, 400):
        for x in range(245, 625):
            in_bang_zone = (408 <= x <= 450 and y <= 395) or \
                           (508 <= x <= 545 and y <= 375) or \
                           (585 <= x <= 622 and y <= 365) or \
                           (245 <= x <= 278 and y <= 385)
            if in_bang_zone:
                pr, pg, pb = chibi[y, x, :3]
                if (pr > 125) and (pg < 115) and (pb < 135) and (int(pr) - int(pg) > 40):
                    closed_layer[y, x] = chibi[y, x]

    # Save to chibi-closed-eyes.webp
    Image.fromarray(closed_layer).save('apps/web/public/neko/chibi/chibi-closed-eyes.webp', 'WEBP', lossless=True)

    # Composite over open chibi to inspect full face
    full_comp = chibi.copy()
    mc = closed_layer[:,:,3] / 255.0
    for c in range(3):
        full_comp[:,:,c] = (closed_layer[:,:,c] * mc + full_comp[:,:,c] * (1.0 - mc)).astype(np.uint8)

    face_crop = full_comp[280:540, 200:720]
    Image.fromarray(face_crop).save('apps/web/public/neko/chibi/_test_perfect_face2.png')
    print('Generated perfect face 2 successfully!')

if __name__ == '__main__':
    build_perfect_face()
