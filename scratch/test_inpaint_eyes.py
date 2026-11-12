import cv2
import numpy as np
from PIL import Image

# Load original neko-chibi
orig = Image.open('apps/web/public/neko/chibi/neko-chibi.webp').convert('RGBA')
arr = np.array(orig)
h, w = arr.shape[:2]

# Create eye replacement mask:
# We want to cover:
# 1. Left eye socket: sclera, pupil, iris, and upper lash.
# 2. Right eye socket: sclera, pupil, iris, and upper lash.
# BUT NOT the eyebrows (left eyebrow y ~ 280-340, right eyebrow y ~ 280-340)
# AND NOT the hair bangs where hair overlaps!

# Let's inspect the exact pixel bounds of the left and right eye in neko-chibi.
# Left eye open lash:
# Topmost point of lash: ~ (312, 305)
# Bottommost point of lower lash: ~ (310, 438)
# Leftmost point of outer lash: ~ (212, 385)
# Rightmost point of inner eye: ~ (400, 420)

# Right eye open lash:
# Topmost point of lash: ~ (580, 305)
# Bottommost point of lower lash: ~ (580, 438)
# Leftmost point of inner eye: ~ (498, 420)
# Rightmost point of outer lash: ~ (685, 385)

print("Script template ready")
