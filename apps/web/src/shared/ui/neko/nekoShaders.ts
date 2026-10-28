/**
 * Shader Neko-sensei.
 *
 * Dua "slot" pose (A dan B) digambar bersamaan lalu dicampur dengan uMix,
 * sehingga pergantian pose bisa disembunyikan di balik kedipan. Gambar dasar
 * setiap pose sudah tanpa mulut; mulut digambar dari atlas sprite sehingga
 * selalu utuh (tidak tembus) dan bisa membuka-menutup mengikuti suara.
 */

import { EYE_SPLIT_X } from "./nekoRig";

const EYE_SPLIT = EYE_SPLIT_X.toFixed(1);

export const VERTEX_SHADER = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
uniform float uSizeV;
uniform float uPad;
void main() {
  vec2 c = (aPos + uPad) / (uSizeV + 2.0 * uPad);
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
  vUV = aUV;
}
`;

const SLOT_UNIFORMS = (x: string) => `
uniform sampler2D uTex${x};
uniform sampler2D uEyes${x};
uniform sampler2D uLid${x};
uniform vec3 uLidTop${x};
uniform vec3 uLidBot${x};
uniform float uHasEyes${x};
uniform vec4 uEyeSpan${x};   // x awal dan akhir mata kiri (xy) dan kanan (zw)
uniform vec4 uClosedBox${x};
uniform vec4 uClosedUV${x};
uniform vec4 uOpenBox${x};
uniform vec4 uOpenUV${x};
uniform vec4 uOpenMap${x};
uniform vec4 uMouthPar${x};
`;

export const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUV;
uniform float uSize;
uniform float uMix;
uniform vec2 uBlink;   // kedipan mata kiri, kanan (0 buka, 1 tutup)
uniform vec2 uShape;   // bentuk mata tertutup: 0 mengantuk, 1 senang (^)
uniform sampler2D uAtlas;
uniform vec4 uTint;     // rgb warna, a kekuatan
uniform vec2 uTintBand; // y awal (penuh) dan y akhir (hilang)
uniform vec2 uGaze;     // pergeseran bola mata (piksel rig)
uniform vec4 uLidRect;  // area tekstur kulit kelopak di ruang rig
${SLOT_UNIFORMS("A")}
${SLOT_UNIFORMS("B")}


vec4 unpremul(vec4 t) {
  if (t.a <= 0.035) return vec4(0.0);
  float a = t.a * smoothstep(0.035, 0.09, t.a);
  return vec4(t.rgb / t.a, a);
}

// Satu sprite mulut dari atlas; tepian kotak dilembutkan (feather) agar tidak ada garis batas bingkai
vec4 sprite(vec2 rp, vec4 box, vec4 uv) {
  vec2 f = (rp - box.xy) / box.zw;
  if (box.z < 1.0 || f.x <= 0.0 || f.y <= 0.0 || f.x >= 1.0 || f.y >= 1.0) return vec4(0.0);
  vec4 col = unpremul(texture2D(uAtlas, uv.xy + f * uv.zw));
  // Lembutkan alpha di 4 tepian frame (0..0.06) sehingga alpha mencapai tepat 0 di tepi tanpa garis tajam
  vec2 edge = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.94, 1.0, f));
  col.a *= edge.x * edge.y;
  return col;
}

// Kelopak mengikuti bentuk mata asli dari mask (lihat EyeRig di nekoRig.ts).
// Gaya anime: kelopak atas turun membawa pita bulu mata aslinya, lalu berhenti
// di garis bawah mata sehingga mata tertutup tampak seperti lengkung tebal alami.
vec3 lid(vec3 base, vec2 p, sampler2D tex, sampler2D eyes, sampler2D lidTex, vec4 span, vec3 lidTop, vec3 lidBot) {
  vec3 m = texture2D(eyes, vUV).rgb;
  float inside = smoothstep(0.28, 0.72, m.r);
  if (inside <= 0.0) return base;

  bool right = p.x > ${EYE_SPLIT};
  float b = right ? uBlink.y : uBlink.x;
  if (b < 0.002) return base;

  vec2 sp = right ? span.zw : span.xy;
  if (sp.y - sp.x < 1.0) return base;

  float shape = right ? uShape.y : uShape.x;
  float u = clamp((p.x - sp.x) / (sp.y - sp.x), 0.0, 1.0);
  float v = m.g;
  float H = max(m.b * 400.0, 6.0);
  float arch = 1.0 - (2.0 * u - 1.0) * (2.0 * u - 1.0);

  // Lembutkan tepi luar rongga mata agar kelopak tidak mengenai rambut samping
  float uFade = right ? (1.0 - smoothstep(0.85, 0.98, u)) : smoothstep(0.02, 0.15, u);
  inside *= uFade;
  if (inside <= 0.0) return base;

  // Posisi lengkung kelopak saat mata tertutup
  float lh = clamp(26.0 / H, 0.16, 0.32);
  float vc = (1.0 - lh * 0.9) - 0.38 * arch * shape;
  float vu = b * vc;
  float aa = 2.0 / H;

  // Kulit kelopak halus yang senada dengan kulit wajah pose ini
  vec3 skin = texture2D(lidTex, clamp((p - uLidRect.xy) / uLidRect.zw, 0.0, 1.0)).rgb;
  vec3 fur = mix(mix(lidTop, lidBot, v), skin, 0.12);
  fur *= 1.0 - 0.07 * b * smoothstep(vu - 0.22, vu, v);

  // Bulu mata asli yang turun mengikuti kelopak
  vec4 band = unpremul(texture2D(tex, (p - vec2(0.0, vu * H)) / uSize));
  float isBand = smoothstep(vu - aa, vu + aa, v);
  vec3 col = mix(fur, band.rgb, isBand);

  // Helai poni di atas mata tetap utuh di depan kelopak
  float L = dot(base, vec3(0.3333));
  float isHair = smoothstep(0.14, 0.22, base.r - base.g) * smoothstep(0.10, 0.18, base.r - base.b)
               * smoothstep(0.44, 0.54, L) * (1.0 - smoothstep(0.25, 0.45, v));
  col = mix(col, base, isHair * (1.0 - isBand));

  if (v < vu + lh) {
    return mix(base, col, inside);
  }
  return base;
}

vec4 shadeSlot(
  sampler2D tex, vec2 p,
  sampler2D eyes, sampler2D lidTex, float hasEyes, vec4 span, vec3 lidTop, vec3 lidBot,
  vec4 cBox, vec4 cUV, vec4 oBox, vec4 oUV, vec4 oMap, vec4 mPar
) {
  vec4 c = unpremul(texture2D(tex, vUV));
  // Bola mata melirik: isi mata (di bawah pita bulu mata) digeser, tepinya tetap
  if (hasEyes > 0.5 && (abs(uGaze.x) + abs(uGaze.y)) > 0.05) {
    vec3 m = texture2D(eyes, vUV).rgb;
    float inside = smoothstep(0.4, 0.8, m.r);
    if (inside > 0.0) {
      bool right = p.x > ${EYE_SPLIT};
      vec2 sp = right ? span.zw : span.xy;
      float u = clamp((p.x - sp.x) / max(sp.y - sp.x, 1.0), 0.0, 1.0);
      float wg = inside * smoothstep(0.2, 0.36, m.g) * (1.0 - smoothstep(0.86, 0.98, m.g))
               * smoothstep(0.0, 0.18, u) * (1.0 - smoothstep(0.82, 1.0, u));
      if (wg > 0.0) {
        vec4 moved = unpremul(texture2D(tex, (p - uGaze * wg) / uSize));
        c = mix(c, moved, wg);
      }
    }
  }
  if (c.a > 0.003) {
    // Mulut tertutup di tempat aslinya, memudar saat mulut mulai terbuka
    if (mPar.z > 0.002) {
      vec4 m = sprite(p, cBox, cUV);
      float isDarkLine = smoothstep(0.48, 0.22, max(m.r, max(m.g, m.b)));
      float isRed = smoothstep(0.08, 0.22, m.r - m.g) * (1.0 - smoothstep(0.45, 0.60, m.g));
      float mouthVis = clamp(isDarkLine + isRed, 0.0, 1.0);
      c.rgb = mix(c.rgb, m.rgb, m.a * mPar.z * mouthVis);
    }
    // Mulut terbuka: diregang dari bibir atas ke bawah, utuh tanpa tembus
    if (mPar.w > 0.002) {
      vec2 sp = oMap.zw + (p - oMap.xy) / mPar.xy;
      vec4 m = sprite(sp, oBox, oUV);
      // Hilangkan kotak bayangan kulit gelap di sekitar mulut:
      // Hanya tampilkan bagian mulut asli (gigi putih, rongga mulut merah/gelap, dan bibir)
      float isTeeth = smoothstep(0.80, 0.90, m.b) * (1.0 - smoothstep(0.02, 0.08, abs(m.r - m.b)));
      float isRedMouth = smoothstep(0.08, 0.20, m.r - m.g) * (1.0 - smoothstep(0.46, 0.62, m.g));
      float isDarkCavity = smoothstep(0.42, 0.20, max(m.r, max(m.g, m.b)));
      float mouthVis = clamp(isTeeth + isRedMouth + isDarkCavity, 0.0, 1.0);
      c.rgb = mix(c.rgb, m.rgb, m.a * mPar.w * mouthVis);
    }
    if (hasEyes > 0.5) c.rgb = lid(c.rgb, p, tex, eyes, lidTex, span, lidTop, lidBot);
  }
  return c;
}

void main() {
  vec2 p = vUV * uSize;
  vec4 a = shadeSlot(uTexA, p, uEyesA, uLidA, uHasEyesA, uEyeSpanA, uLidTopA, uLidBotA, uClosedBoxA, uClosedUVA, uOpenBoxA, uOpenUVA, uOpenMapA, uMouthParA);
  vec4 pm = vec4(a.rgb * a.a, a.a);
  if (uMix > 0.001) {
    vec4 b = shadeSlot(uTexB, p, uEyesB, uLidB, uHasEyesB, uEyeSpanB, uLidTopB, uLidBotB, uClosedBoxB, uClosedUVB, uOpenBoxB, uOpenUVB, uOpenMapB, uMouthParB);
    pm = mix(pm, vec4(b.rgb * b.a, b.a), uMix);
  }
  if (pm.a < 0.003) { gl_FragColor = vec4(0.0); return; }

  // Rona wajah (merah saat marah/kesal, biru suram saat sedih), hanya di bulu
  vec3 s = pm.rgb / pm.a;
  if (uTint.a > 0.001) {
    float fur = clamp((s.r - s.b) * 1.8 - 0.3, 0.0, 1.0);
    float band = 1.0 - smoothstep(uTintBand.x, uTintBand.y, p.y);
    s *= mix(vec3(1.0), uTint.rgb, fur * band * uTint.a);
  }
  gl_FragColor = vec4(s * pm.a, pm.a);
}
`;
