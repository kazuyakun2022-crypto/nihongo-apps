import {
  ASSET_BASE,
  BODY,
  LID_RECT,
  MOUTH_ATLAS_FILE,
  MOUTH_SPRITES,
  POSES,
  POSE_IDS,
  RIG_PAD,
  RIG_SIZE,
  type NekoEmotion,
  type NekoMode,
  type PoseId,
  type PoseRig,
  type Vec2,
} from "./nekoRig";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./nekoShaders";

/**
 * NekoEngine menggambar Neko-sensei dengan WebGL dan mengatur semua gerakannya.
 *
 * Satu maskot yang terus hidup: status (idle, mendengar, berpikir, menjawab) dan
 * emosi (biasa, senang, sedih, marah, dan lainnya) hanya menggeser "parameter"
 * tubuh secara halus.
 * Pergantian gambar pose disembunyikan di balik kedipan atau hentakan, jadi
 * tidak ada potongan yang terlihat.
 */

export type LevelSource = () => number;

export interface NekoEngineOptions {
  /** Ikuti kursor atau jari di seluruh halaman (default true). */
  followPointer?: boolean;
  reducedMotion?: boolean;
  /** Ubah nama file aset menjadi URL (default: /neko/<file>). */
  resolveAsset?: (file: string) => string;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

interface Spring {
  x: number;
  v: number;
}

type TransitionStyle = "blink" | "cut" | "fade";

interface Transition {
  to: PoseId;
  style: TransitionStyle;
  phase: "closing" | "mixing";
  start: number;
  duration: number;
}

const GRID = 56;
const S = RIG_SIZE;

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
function smooth(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function approach(cur: number, target: number, rate: number, dt: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}
function spring(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += (-k * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
}
const out2: [number, number] = [0, 0];
function rotAbout(px: number, py: number, cx: number, cy: number, ang: number) {
  const s = Math.sin(ang);
  const c = Math.cos(ang);
  const dx = px - cx;
  const dy = py - cy;
  out2[0] = cx + dx * c - dy * s;
  out2[1] = cy + dx * s + dy * c;
}
function gauss(x: number, y: number, c: Vec2, sigma: number) {
  const dx = x - c[0];
  const dy = y - c[1];
  return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}
function earWeight(ear: { base: Vec2; tip: Vec2; width: number }, x: number, y: number) {
  const ax = ear.tip[0] - ear.base[0];
  const ay = ear.tip[1] - ear.base[1];
  const L2 = ax * ax + ay * ay;
  const px = x - ear.base[0];
  const py = y - ear.base[1];
  const s = (px * ax + py * ay) / L2;
  const d = Math.abs(px * ay - py * ax) / Math.sqrt(L2);
  return smooth(-0.05, 0.85, s) * Math.exp(-Math.pow(d / (ear.width * (1.3 - 0.5 * clamp(s, 0, 1))), 2));
}

/** Sifat gerak tiap emosi. Telinga: + tegak ke dalam, - terkulai ke luar. */
interface Expression {
  /** Lama emosi bertahan setelah selesai bicara (detik). */
  linger: number;
  /** Emosi ringan yang dilewati saat mereda (misalnya marah → kesal). */
  calmTo?: NekoEmotion;
  /** Masuk dengan hentakan cepat dan getaran. */
  snap?: boolean;
  shake: number;
  /** Pantulan saat emosi dimulai (+ melompat, - mengerut). */
  bounce: number;
  /** Kibasan telinga saat emosi dimulai (+ ke luar, - ke dalam). */
  earKick: number;
  /** Sesekali buang muka. */
  glance?: boolean;
  lookY: number;
  tilt: number;
  headDown: number;
  ears: number;
  breathRate: number;
  breathAmp: number;
  /** Goyang kepala berirama (senang, menangis). */
  bob: number;
  /** Pengali jeda kedipan (< 1 = lebih sering berkedip). */
  blinkRate: number;
  /** Malu ala anime: menunduk, lalu sesekali mengintip ke depan. */
  shy?: boolean;
}

const BASE: Expression = {
  linger: 1.4, shake: 0, bounce: 0.6, earKick: 0, lookY: 0, tilt: 0, headDown: 0, ears: 0,
  breathRate: 1.9, breathAmp: 1, bob: 0, blinkRate: 1,
};

export const EXPRESSION: Record<NekoEmotion, Expression> = {
  biasa: BASE,
  senang: { ...BASE, bounce: 0.8, ears: 0.08, lookY: -0.05, breathRate: 2.1, bob: 0.4 },
  semangat: { ...BASE, bounce: 1.2, earKick: -1.2, ears: 0.12, lookY: -0.08, breathRate: 2.4, bob: 0.6 },
  sedih: { ...BASE, linger: 1.6, earKick: 0.8, ears: -0.18, lookY: 0.4, headDown: 0.7, breathRate: 1.2, breathAmp: 1.3 },
  nangis: { ...BASE, calmTo: "sedih", earKick: 0.8, ears: -0.22, lookY: 0.35, headDown: 0.7, breathRate: 2.3, breathAmp: 1.3, bob: 0.4 },
  kesal: { ...BASE, glance: true, bounce: -0.8, earKick: 1.0, ears: -0.10, breathRate: 2.1 },
  marah: { ...BASE, linger: 1, calmTo: "kesal", snap: true, shake: 0.6, earKick: 1.5, ears: -0.16, lookY: -0.06, breathRate: 2.7, breathAmp: 0.85 },
  rese: { ...BASE, linger: 1.2, bounce: 0.9, tilt: 0.04, ears: 0.04, bob: 0.3 },
  kaget: { ...BASE, linger: 0.9, snap: true, shake: 0.4, earKick: -1.4, ears: 0.15, lookY: -0.05, breathRate: 2.5 },
  bingung: { ...BASE, tilt: -0.04, lookY: -0.2 },
  malu: { ...BASE, linger: 1.8, shy: true, lookY: 0.3, headDown: 0.5, tilt: 0.035, ears: -0.10, blinkRate: 0.4, breathRate: 2.0 },
  berpikir: { ...BASE, tilt: -0.03, lookY: -0.2, breathRate: 1.5 },
  dielus: { ...BASE, linger: 0.8, bounce: 0.6, ears: -0.16, lookY: 0.12, breathRate: 2.2, bob: 0.5 },
};

interface Weights {
  earL: Float32Array;
  earR: Float32Array;
  bangs: Float32Array;
  whL: Float32Array;
  whR: Float32Array;
  face: Float32Array;
  eyes: Float32Array;
  jaw: Float32Array;
}

type U = WebGLUniformLocation | null;
interface SlotUniforms {
  tex: U;
  eyes: U;
  lid: U;
  lidTop: U;
  lidBot: U;
  hasEyes: U;
  span: U;
  cBox: U;
  cUV: U;
  oBox: U;
  oUV: U;
  oMap: U;
  mPar: U;
}

export class NekoEngine {
  private canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private fxLayer: HTMLElement | null;
  private opts: NekoEngineOptions;
  private amp: number;

  private gl: WebGLRenderingContext | null = null;
  private textures: Partial<Record<PoseId, WebGLTexture>> = {};
  private atlasTex: WebGLTexture | null = null;
  private eyeTex: Partial<Record<PoseId, WebGLTexture>> = {};
  private lidTex: Partial<Record<PoseId, WebGLTexture>> = {};
  private posBuf: WebGLBuffer | null = null;
  private count = 0;
  private rest = new Float32Array(0);
  private pos = new Float32Array(0);
  private w!: Weights;
  private uSlot!: [SlotUniforms, SlotUniforms];
  private uMix: U = null;
  private uBlink: U = null;
  private uShape: U = null;
  private uTint: U = null;
  private uTintBand: U = null;

  private raf = 0;
  private last = 0;
  private visible = true;
  private destroyed = false;
  private cleanup: Array<() => void> = [];

  // Masukan dari luar
  private mode: NekoMode = "idle";
  private emotion: NekoEmotion = "biasa";
  private micLevel: LevelSource | null = null;
  private voiceLevel: LevelSource | null = null;

  // Keadaan animasi
  private t = 0;
  private poseA: PoseId = "idle";
  private poseTarget: PoseId = "idle";
  private transition: Transition | null = null;
  private mix = 0;
  private modeSince = 0;
  private shownEmotion: NekoEmotion = "biasa";
  private spokenEmotion: NekoEmotion = "biasa";
  private emotionSince = 0;
  private lingerUntil = 0;
  private happyUntil = 0;
  private nextHappy = 0;
  private nextGlance = 0;
  private glanceUntil = 0;
  private glanceDir = 1;

  private look = { x: 0, y: 0 };
  private lookT = { x: 0, y: 0 };
  private pointerAt = -10;
  private wanderAt = 0;
  private eyeShift = { x: 0, y: 0 };
  private gaze = { x: 0, y: 0 };
  private saccade = { x: 0, y: 0 };
  private nextSaccade = 0;
  private shyPeek = false;
  private shyUntil = 0;
  private shySide = 0;
  private voiceSmooth = 0;
  private petting = false;
  private petUntil = 0;
  private uGaze: U = null;
  private lean = 0;
  private tiltExtra = 0;
  private headDown = 0;
  private breathPhase = 0;
  private breathRate = 1.9;
  private breathAmp = 1;
  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  private earL: Spring = { x: 0, v: 0 };
  private earR: Spring = { x: 0, v: 0 };
  private hat: Spring = { x: 0, v: 0 };
  private hatLift: Spring = { x: 0, v: 0 };
  private squish: Spring = { x: 0, v: 0 };
  private whisk: Spring = { x: 0, v: 0 };
  private nod: Spring = { x: 0, v: 0 };

  private curFloatX = 0;
  private curFloatY = 0;

  private randomBlink = 0;
  private blinkStart = -1;
  private nextBlink = 2;
  private doubleBlink = false;
  private forcedLid = 0;
  private forceClosed = false;
  private squint = 0;
  private lidL = 0;
  private lidR = 0;
  private wink: { start: number; dir: number; resolve: () => void } | null = null;
  private winkAmt = 0;

  private mouthOpen = 0;
  private lastVoiceAt = -10;
  private speakSince = 0;
  private synth = { phase: 0, amp: 0.6, pauseUntil: 0 };
  private micSmooth = 0;
  private micPeakAt = -10;
  private nextTwitch = 3;
  private nextWhisk = 2;

  private lastDataset = "";

  constructor(canvas: HTMLCanvasElement, root: HTMLElement, fxLayer: HTMLElement | null, opts: NekoEngineOptions = {}) {
    this.canvas = canvas;
    this.root = root;
    this.fxLayer = fxLayer;
    this.opts = opts;
    this.amp = opts.reducedMotion ? 0.35 : 1;
    try {
      this.setupGL();
    } catch (err) {
      this.fail(err);
      return;
    }
    this.loadTextures();
    this.bindEvents();
  }

  // ───────────────────────── API publik ─────────────────────────

  setMode(mode: NekoMode) {
    if (mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    this.modeSince = this.t;
    if (prev === "speaking") {
      this.spokenEmotion = this.emotion;
    }
    if (mode === "speaking") {
      this.speakSince = this.t;
      this.lastVoiceAt = -10;
      if (this.emotion === "biasa") this.happyUntil = this.t + 0.75;
      this.nextHappy = this.t + rand(5, 9);
    }
    if (mode === "listening") {
      this.earL.v += 2.2 * this.amp;
      this.earR.v -= 2.2 * this.amp;
      this.squish.v += 0.8;
    }
    if (mode === "processing") {
      this.earR.v -= 2.5 * this.amp;
    }
  }

  setEmotion(emotion: NekoEmotion) {
    this.emotion = emotion;
    if (emotion === "biasa") {
      this.spokenEmotion = "biasa";
    }
  }

  setLevelSources(mic: LevelSource | null, voice: LevelSource | null) {
    this.micLevel = mic;
    this.voiceLevel = voice;
  }

  /** Mulai dielus (jari/mouse ditekan di atas maskot). */
  petStart() {
    this.petting = true;
    this.petUntil = this.t + 1.4;
    this.squish.v -= 1.6;
    this.earL.v -= 3 * this.amp;
    this.earR.v += 3 * this.amp;
  }

  /** Selesai dielus; ekspresi senang bertahan sebentar. */
  petEnd() {
    if (!this.petting) return;
    this.petting = false;
    this.petUntil = Math.max(this.petUntil, this.t + 0.9);
  }

  /** Reaksi saat Neko disentuh. */
  boop() {
    this.squish.v += 3.2;
    this.hatLift.v -= 260 * this.amp;
    this.earL.v -= 2.6 * this.amp;
    this.earR.v += 2.6 * this.amp;
    if (this.mode === "idle" && this.shownEmotion === "biasa") this.happyUntil = this.t + 0.7;
  }

  /** Mengedipkan satu mata. */
  winkEye(eye: "left" | "right" = "right"): Promise<void> {
    return new Promise((resolve) => {
      if (this.wink) this.wink.resolve();
      const dir = eye === "left" ? -1 : 1;
      this.wink = { start: this.t, dir, resolve };
      if (dir > 0) this.earR.v += 3 * this.amp;
      else this.earL.v -= 3 * this.amp;
      this.squish.v += 1.2;
    });
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
    const gl = this.gl;
    if (gl) {
      Object.values(this.textures).forEach((t) => t && gl.deleteTexture(t));
      if (this.atlasTex) gl.deleteTexture(this.atlasTex);
      Object.values(this.eyeTex).forEach((t) => t && gl.deleteTexture(t));
      Object.values(this.lidTex).forEach((t) => t && gl.deleteTexture(t));
    }
    this.gl = null;
  }

  // ───────────────────────── Persiapan WebGL ─────────────────────────

  private fail(err: unknown) {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.opts.onError?.(err);
  }

  private setupGL() {
    const gl = this.canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL tidak tersedia");
    this.gl = gl;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      const info = gl.getShaderInfoLog(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("Shader compile error for type", type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT", ":", info);
        throw new Error(`shader error (${type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT"}): ${info || "unknown"}`);
      }
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      console.error("Shader program link error:", info);
      throw new Error(info ?? "link");
    }
    gl.useProgram(prog);
    const loc = (n: string) => gl.getUniformLocation(prog, n);

    // Mesh grid
    const n = GRID + 1;
    const rest = new Float32Array(n * n * 2);
    const uv = new Float32Array(n * n * 2);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = (j * n + i) * 2;
        uv[k] = i / GRID;
        uv[k + 1] = j / GRID;
        rest[k] = uv[k] * S;
        rest[k + 1] = uv[k + 1] * S;
      }
    const idx = new Uint16Array(GRID * GRID * 6);
    let p = 0;
    for (let j = 0; j < GRID; j++)
      for (let i = 0; i < GRID; i++) {
        const a = j * n + i;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        idx[p++] = a; idx[p++] = c; idx[p++] = b;
        idx[p++] = b; idx[p++] = c; idx[p++] = d;
      }
    this.rest = rest;
    this.pos = new Float32Array(rest.length);
    this.count = idx.length;
    this.w = this.computeWeights();

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const aUV = gl.getAttribLocation(prog, "aUV");
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.uniform1f(loc("uSizeV"), S);
    gl.uniform1f(loc("uSize"), S);
    gl.uniform1f(loc("uPad"), RIG_PAD);
    const slot = (sfx: string): SlotUniforms => ({
      tex: loc("uTex" + sfx),
      eyes: loc("uEyes" + sfx),
      lid: loc("uLid" + sfx),
      lidTop: loc("uLidTop" + sfx),
      lidBot: loc("uLidBot" + sfx),
      hasEyes: loc("uHasEyes" + sfx),
      span: loc("uEyeSpan" + sfx),
      cBox: loc("uClosedBox" + sfx),
      cUV: loc("uClosedUV" + sfx),
      oBox: loc("uOpenBox" + sfx),
      oUV: loc("uOpenUV" + sfx),
      oMap: loc("uOpenMap" + sfx),
      mPar: loc("uMouthPar" + sfx),
    });
    this.uSlot = [slot("A"), slot("B")];
    gl.uniform1i(this.uSlot[0].tex, 0);
    gl.uniform1i(this.uSlot[1].tex, 1);
    gl.uniform1i(loc("uAtlas"), 2);
    gl.uniform1i(this.uSlot[0].eyes, 3);
    gl.uniform1i(this.uSlot[1].eyes, 4);
    gl.uniform1i(this.uSlot[0].lid, 5);
    gl.uniform1i(this.uSlot[1].lid, 6);
    gl.uniform4fv(loc("uLidRect"), LID_RECT);
    this.uMix = loc("uMix");
    this.uBlink = loc("uBlink");
    this.uShape = loc("uShape");
    this.uGaze = loc("uGaze");
    this.uTint = loc("uTint");
    this.uTintBand = loc("uTintBand");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  private computeWeights(): Weights {
    const rest = this.rest;
    const N = rest.length / 2;
    const mk = () => new Float32Array(N);
    const w: Weights = { earL: mk(), earR: mk(), bangs: mk(), whL: mk(), whR: mk(), face: mk(), eyes: mk(), jaw: mk() };
    const Bn = BODY.bangs;
    for (let i = 0; i < N; i++) {
      const x = rest[i * 2];
      const y = rest[i * 2 + 1];
      const bx = (x - Bn.c[0]) / Bn.r[0];
      const by = (y - Bn.c[1]) / Bn.r[1];
      w.bangs[i] = (1 - smooth(0.7, 1.1, Math.sqrt(bx * bx + by * by))) * smooth(Bn.pivot[1], Bn.c[1] + Bn.r[1], y);
      w.earL[i] = earWeight(BODY.earL, x, y);
      w.earR[i] = earWeight(BODY.earR, x, y);
      w.whL[i] = earWeight({ base: BODY.lockL.root, tip: BODY.lockL.tip, width: BODY.lockL.width }, x, y);
      w.whR[i] = earWeight({ base: BODY.lockR.root, tip: BODY.lockR.tip, width: BODY.lockR.width }, x, y);
      w.face[i] = gauss(x, y, BODY.face.c, BODY.face.sigma);
      w.eyes[i] = gauss(x, y, BODY.eyes[0], 75) + gauss(x, y, BODY.eyes[1], 75);
      w.jaw[i] = gauss(x, y, BODY.jaw.c, BODY.jaw.r * 0.6) * smooth(BODY.jawBand[0], BODY.jawBand[1], y);
    }
    return w;
  }

  private loadTextures() {
    const order: PoseId[] = ["idle", ...POSE_IDS.filter((id) => id !== "idle")];
    order.forEach((id) => {
      this.loadImage(
        POSES[id].file,
        (tex) => {
          this.textures[id] = tex;
          if (id === "idle") this.tryStart();
        },
        () => {
          if (id === "idle") this.fail(new Error("Gambar " + POSES[id].file + " tidak ditemukan"));
        },
      );
      const eyes = POSES[id].eyes;
      if (eyes) {
        this.loadImage(
          eyes.mask,
          (tex) => {
            this.eyeTex[id] = tex;
            if (id === "idle") this.tryStart();
          },
          undefined,
          true,
        );
        this.loadImage(eyes.lid, (tex) => {
          this.lidTex[id] = tex;
          if (id === "idle") this.tryStart();
        });
      }
    });
    this.loadImage(
      MOUTH_ATLAS_FILE,
      (tex) => {
        this.atlasTex = tex;
        this.tryStart();
      },
      () => this.fail(new Error("Gambar " + MOUTH_ATLAS_FILE + " tidak ditemukan")),
      false,
      false, // Atlas mulut menggunakan filter linear tanpa mipmap agar tidak ada rembesan antar sprite
    );
  }

  private started = false;
  private tryStart() {
    if (!this.started && this.textures.idle && this.eyeTex.idle && this.lidTex.idle && this.atlasTex) {
      this.started = true;
      this.start();
    }
  }

  /** data = true untuk mask; mipmap = false untuk atlas sprite mulut */
  private loadImage(file: string, done: (tex: WebGLTexture) => void, failed?: () => void, data = false, mipmap = true) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (this.destroyed || !this.gl) return;
      const gl = this.gl;
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !data);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
      let source: TexImageSource = img;
      const pot = (v: number) => (v & (v - 1)) === 0;
      if (!pot(img.width) || !pot(img.height)) {
        const c = document.createElement("canvas");
        c.width = c.height = 1024;
        c.getContext("2d")!.drawImage(img, 0, 0, 1024, 1024);
        source = c;
      }
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      if (mipmap) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      done(tex);
    };
    img.onerror = () => failed?.();
    img.src = this.opts.resolveAsset ? this.opts.resolveAsset(file) : ASSET_BASE + file;
  }

  private bindEvents() {
    const on = <K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void) => {
      target.addEventListener(type, fn as EventListener, { passive: true });
      this.cleanup.push(() => target.removeEventListener(type, fn as EventListener));
    };
    if (this.opts.followPointer !== false) {
      on(window, "pointermove", (e) => {
        const r = this.canvas.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.55;
        this.lookT.x = clamp((e.clientX - cx) / Math.max(window.innerWidth / 2, r.width), -1, 1);
        this.lookT.y = clamp((e.clientY - cy) / Math.max(window.innerHeight / 2, r.height), -1, 1);
        this.pointerAt = this.t;
      });
    }
    const onLost = (e: Event) => {
      e.preventDefault();
      this.fail(new Error("Konteks WebGL hilang"));
    };
    this.canvas.addEventListener("webglcontextlost", onLost);
    this.cleanup.push(() => this.canvas.removeEventListener("webglcontextlost", onLost));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    };
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(resize);
      ro.observe(this.canvas);
      this.cleanup.push(() => ro.disconnect());
    }
    resize();
    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver((en) => (this.visible = en[0]?.isIntersecting ?? true));
      io.observe(this.root);
      this.cleanup.push(() => io.disconnect());
    }
  }

  private start() {
    this.last = performance.now() / 1000;
    const loop = () => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      const now = performance.now() / 1000;
      const dt = Math.min(now - this.last, 1 / 20);
      this.last = now;
      if (!this.visible || document.hidden) return;
      this.update(dt);
      this.draw();
    };
    loop();
    this.opts.onReady?.();
  }

  // ───────────────────────── Sutradara ekspresi ─────────────────────────

  private desiredEmotion(): NekoEmotion {
    if (this.mode === "speaking") return this.emotion;
    const active = this.emotion !== "biasa" ? this.emotion : this.spokenEmotion;
    return active;
  }

  private desiredPose(): PoseId {
    const e = this.shownEmotion;
    // Dielus: wajah keenakan, kecuali sedang bicara
    if ((this.petting || this.t < this.petUntil) && this.mode !== "speaking") return "dielus";
    if (this.mode === "processing") return "berpikir";
    if (e !== "biasa") return e;
    if (this.t < this.happyUntil) return "senang";
    return "idle";
  }

  private transitionStyle(from: PoseId, to: PoseId): { style: TransitionStyle; duration: number } {
    // Semua pose memakai kepala dan rambut yang sama, jadi yang berganti hanya wajah.
    // Emosi yang meledak (marah, kaget): wajah berganti cepat sambil kepala tersentak.
    if (EXPRESSION[to === "idle" ? "biasa" : to].snap) return { style: "fade", duration: 0.18 };
    // Lainnya: berkedip, wajah berganti perlahan di balik kelopak, lalu mata membuka
    if (from === "dielus" || to === "dielus") return { style: "blink", duration: 0.3 };
    return { style: "blink", duration: 0.34 };
  }

  private update(dt: number) {
    const A = this.amp;
    const t = (this.t += dt);

    // Emosi yang sedang tampil
    const want = this.desiredEmotion();
    if (want !== this.shownEmotion) {
      const from = this.shownEmotion;
      this.shownEmotion = want;
      this.emotionSince = t;
      const x = EXPRESSION[want];
      if (x.snap) {
        this.shake = Math.max(this.shake, x.shake);
        this.squish.v -= 1.2;
      } else if (from !== "biasa" || want !== "biasa") {
        this.squish.v += x.bounce * 0.6;
      }
      this.earL.v -= x.earKick * A;
      this.earR.v += x.earKick * A;
      if (x.glance) this.nextGlance = t + rand(0.6, 1.4);
    }
    if (this.mode === "speaking" && this.shownEmotion === "biasa" && t > this.nextHappy) {
      this.happyUntil = t + rand(0.5, 0.8);
      this.nextHappy = t + rand(5, 9);
    }

    // Pergantian pose
    this.poseTarget = this.desiredPose();
    this.updateTransition(t);

    const e = this.shownEmotion;
    const m = this.mode;

    // Arah pandang
    let lookX = this.lookT.x;
    let lookY = this.lookT.y;
    const pointerIdle = t - this.pointerAt > 2.5;
    if (pointerIdle) {
      const roam = this.opts.reducedMotion ? 0 : 0.35;
      const idleSwayX = (Math.sin(t * 0.38) * 0.16 + Math.sin(t * 0.81) * 0.07) * roam;
      const idleSwayY = (Math.cos(t * 0.29) * 0.10 + Math.sin(t * 0.63) * 0.05) * roam;
      lookX += idleSwayX;
      lookY += idleSwayY;
      if (t > this.wanderAt) {
        this.lookT.x = rand(-roam * 0.5, roam * 0.5);
        this.lookT.y = rand(-roam * 0.25, roam * 0.2);
        this.wanderAt = t + rand(3.5, 7.0);
      }
    }
    let shiftX = 0;
    let shiftY = 0;
    let lean = 0;
    let tilt = 0;
    let headDown = 0;
    let earBase = 0; // + = telinga tegak ke dalam, - = terkulai ke luar
    let squint = 0;
    // Arah lirikan mata (-1..1), terpisah dari arah kepala; null = ikut kursor
    let gazeX: number | null = null;
    let gazeY: number | null = null;
    let breathRate = 1.9;
    let breathAmp = 1;

    if (m === "listening") {
      lookX *= 0.3;
      lookY = lookY * 0.3 + 0.1;
      lean = 1;
      tilt = 0.045;
      earBase = 0.13;
      breathRate = 2.3;
    } else if (m === "processing") {
      // Pose berpikir: kepala bergoyang pelan, mata melirik ke atas sambil menimbang
      const sway = Math.sin(t * 0.9);
      lookX = -0.25 + sway * 0.2;
      lookY = -0.35;
      tilt = -0.035 + sway * 0.03;
      breathRate = 1.5;
      gazeX = -0.35 + Math.sin(t * 0.7) * 0.5;
      gazeY = -0.75;
    } else if (m === "speaking") {
      lookX *= 0.4;
      lookY *= 0.4;
    }

    const x = EXPRESSION[e];
    if (e !== "biasa") {
      if (x.glance && t > this.nextGlance) {
        this.glanceUntil = t + rand(1.1, 1.8);
        this.glanceDir = Math.random() < 0.5 ? -1 : 1;
        this.nextGlance = t + rand(3, 5);
        this.squish.v -= 0.6;
      }
      const glancing = x.glance && t < this.glanceUntil;
      lookX = glancing ? 0.65 * this.glanceDir : lookX * 0.3;
      lookY = glancing ? -0.1 : x.lookY;
      tilt += x.tilt + (glancing ? -0.03 * this.glanceDir : 0);
      headDown = x.headDown;
      earBase = x.ears;
      breathRate = x.breathRate;
      breathAmp = x.breathAmp;
      if (x.bob > 0) tilt += Math.sin(t * 7) * 0.012 * x.bob;
      if (x.shy) {
        // Menunduk malu, lalu mengintip ke depan sebentar, berulang
        if (t > this.shyUntil) {
          this.shyPeek = !this.shyPeek;
          this.shyUntil = t + (this.shyPeek ? rand(0.7, 1.2) : rand(1.3, 2.4));
          this.shySide = rand(-0.6, 0.6);
          if (this.blinkStart < 0) this.blinkStart = t;
        }
        lookX = this.shySide * 0.4;
        lookY = this.shyPeek ? 0.3 : 0.55;
        gazeX = this.shyPeek ? 0 : this.shySide;
        gazeY = this.shyPeek ? -0.55 : 1;
      }
    }
    if ((this.petting || t < this.petUntil) && m !== "speaking") {
      const p = EXPRESSION.dielus;
      lookX = Math.sin(t * 3.2) * 0.35;
      lookY = p.lookY;
      tilt += Math.sin(t * 3.2) * 0.06 * A;
      earBase = p.ears;
      breathRate = p.breathRate;
      headDown = 0.3;
    }
    if (m === "processing" && e === "biasa") {
      gazeX = -0.35 + Math.sin(t * 0.7) * 0.5;
      gazeY = -0.75;
    }

    // Mata lebih cepat dari kepala: mengikuti kursor, plus lirikan kecil acak (sakade)
    if (t > this.nextSaccade) {
      const active = t - this.pointerAt < 1.5;
      this.saccade.x = rand(-1, 1) * (active ? 0.12 : 0.3);
      this.saccade.y = rand(-1, 1) * (active ? 0.1 : 0.22);
      this.nextSaccade = t + rand(0.35, 1.5);
    }
    const gx = clamp((gazeX ?? this.lookT.x * 1.3) + this.saccade.x, -1, 1);
    const gy = clamp((gazeY ?? this.lookT.y * 1.3) + this.saccade.y, -1, 1);
    this.gaze.x = approach(this.gaze.x, gx, 22, dt);
    this.gaze.y = approach(this.gaze.y, gy, 22, dt);

    const ease = 1 - Math.exp(-dt * 6);
    this.look.x += (lookX - this.look.x) * ease;
    this.look.y += (lookY - this.look.y) * ease;
    this.eyeShift.x = approach(this.eyeShift.x, shiftX, 7, dt);
    this.eyeShift.y = approach(this.eyeShift.y, shiftY, 7, dt);
    this.lean = approach(this.lean, lean, 6, dt);
    this.tiltExtra = approach(this.tiltExtra, tilt, 4, dt);
    this.headDown = approach(this.headDown, headDown, 3, dt);
    this.squint = approach(this.squint, squint, 8, dt);
    this.breathRate = approach(this.breathRate, breathRate, 2, dt);
    this.breathAmp = approach(this.breathAmp, breathAmp, 2, dt);
    this.breathPhase += dt * this.breathRate;

    // Getaran saat emosi meledak, mereda dalam sekitar satu detik
    const since = t - this.emotionSince;
    const hold = x.snap && since < 0.7 ? x.shake * 0.6 : 0;
    this.shake = Math.max(this.shake * Math.exp(-dt * (x.snap ? 2.2 : 6)), hold);
    const shAmp = this.shake * 9 * A;
    this.shakeX = (Math.random() * 2 - 1) * shAmp;
    this.shakeY = (Math.random() * 2 - 1) * shAmp * 0.5;

    this.updateMouth(t, dt);
    this.updateMic(t, dt);
    this.updateBlink(t, dt);

    // Telinga, topi, kumis
    if (t > this.nextTwitch && !this.opts.reducedMotion) {
      const r = Math.random();
      if (r < 0.45) this.earL.v -= rand(2, 3.5);
      else if (r < 0.9) this.earR.v += rand(2, 3.5);
      else {
        this.earL.v -= 2.5;
        this.earR.v += 2.5;
      }
      this.nextTwitch = t + rand(3.5, 8);
    }
    if (t > this.nextWhisk && !this.opts.reducedMotion) {
      this.whisk.v += rand(-0.25, 0.25);
      this.nextWhisk = t + rand(3.5, 7.5);
    }
    const sway = Math.sin(t * 1.3) * 0.02 * A;
    const earTarget = earBase * A;
    spring(this.earL, earTarget - sway - this.look.x * 0.04 * A, 120, 9, dt);
    spring(this.earR, -earTarget + sway - this.look.x * 0.04 * A, 120, 9, dt);
    spring(this.hat, -this.look.x * 0.015 * A - this.tiltExtra * 0.08, 65, 8, dt);
    spring(this.hatLift, 0, 160, 10, dt);
    spring(this.squish, 0, 140, 9, dt);
    // Rambut samping tertinggal sedikit dari gerak kepala lalu berayun kembali
    spring(this.whisk, Math.sin(t * 0.85) * 0.012 * A - this.look.x * 0.02 * A - this.tiltExtra * 0.1, 65, 8, dt);
    spring(this.nod, 0, 90, 8, dt);

    this.syncDataset();
  }

  private updateTransition(t: number) {
    const tr = this.transition;
    if (!tr) {
      const to = this.poseTarget;
      if (to !== this.poseA && this.textures[to] && (!POSES[to].eyes || (this.eyeTex[to] && this.lidTex[to]))) {
        const { style, duration } = this.transitionStyle(this.poseA, to);
        const canBlink = !!POSES[this.poseA].eyes || !!POSES[to].eyes;
        this.transition = {
          to,
          style: style === "blink" && !canBlink ? "fade" : style,
          phase: style === "blink" && canBlink ? "closing" : "mixing",
          start: t,
          duration,
        };
        if (this.transition.phase === "closing") this.forceClosed = true;
        if (style === "cut" || EXPRESSION[to === "idle" ? "biasa" : to].snap) {
          this.squish.v -= 1.0;
          this.shake = Math.max(this.shake, 0.5);
        }
      }
      return;
    }
    if (tr.phase === "closing") {
      if (this.forcedLid > 0.97 || t - tr.start > 0.4) {
        tr.phase = "mixing";
        tr.start = t;
        // Sedikit "mengendap" saat berganti ekspresi supaya terasa satu gerakan
        this.squish.v += 0.4;
        this.nod.v += 0.4;
      }
      return;
    }
    const k = clamp((t - tr.start) / tr.duration, 0, 1);
    this.mix = k * k * (3 - 2 * k);
    if (k >= 1) this.mix = 1;
    if (this.mix >= 1) {
      this.poseA = tr.to;
      this.mix = 0;
      this.transition = null;
      this.forceClosed = false;
    }
  }

  private updateMouth(t: number, dt: number) {
    let target = 0;
    if (this.mode === "speaking") {
      const raw = this.voiceLevel ? clamp(this.voiceLevel(), 0, 1) : 0;
      // Ratakan volume supaya mulut tidak bergetar mengikuti setiap puncak kecil
      this.voiceSmooth = approach(this.voiceSmooth, raw, raw > this.voiceSmooth ? 16 : 9, dt);
      const v = this.voiceSmooth;
      if (v > 0.06) this.lastVoiceAt = t;
      const silentTooLong = t - this.lastVoiceAt > 0.45 && t - this.speakSince > 0.45;
      if (!silentTooLong) {
        target = clamp(v * 1.3, 0, 1);
      } else {
        // Audio tidak bisa dianalisis: buat gerak bibir tiruan berirama suku kata
        const s = this.synth;
        if (t > s.pauseUntil) {
          const before = s.phase;
          s.phase += dt * 4.6;
          if (Math.floor(before) !== Math.floor(s.phase)) {
            s.amp = rand(0.4, 1);
            if (Math.random() < 0.12) s.pauseUntil = t + rand(0.2, 0.45);
          }
          target = Math.pow(Math.sin((s.phase % 1) * Math.PI), 1.2) * s.amp;
        }
      }
      if (target > 0.12 && !this.opts.reducedMotion) {
        this.nod.v += Math.sin(t * 7.5) * (target * 0.6 * this.amp);
        this.whisk.v += Math.sin(t * 5.2) * (target * 0.12 * this.amp);
      }
      if (target > 0.75 && EXPRESSION[this.shownEmotion].snap) {
        this.shake = Math.max(this.shake, 0.16);
      }
    }
    const rate = target > this.mouthOpen ? 13 : 8;
    this.mouthOpen = approach(this.mouthOpen, target, rate, dt);
  }

  private updateMic(t: number, dt: number) {
    let level = 0;
    if (this.mode === "listening" && this.micLevel) level = clamp(this.micLevel(), 0, 1);
    const prev = this.micSmooth;
    this.micSmooth = approach(this.micSmooth, level, level > prev ? 25 : 8, dt);
    if (this.mode === "listening" && level > 0.55 && t - this.micPeakAt > 0.5) {
      this.micPeakAt = t;
      this.nod.v += 1.6 * this.amp;
      if (Math.random() < 0.5) this.earR.v -= 1.8 * this.amp;
      else this.earL.v += 1.8 * this.amp;
    }
  }

  private updateBlink(t: number, dt: number) {
    if (t > this.nextBlink && this.blinkStart < 0 && !this.transition) {
      this.blinkStart = t;
      this.doubleBlink = Math.random() < 0.2;
    }
    if (this.blinkStart >= 0) {
      const p = (t - this.blinkStart) / 0.34;
      if (p >= 1) {
        if (this.doubleBlink) {
          this.doubleBlink = false;
          this.blinkStart = t + 0.05;
        } else {
          this.blinkStart = -1;
          this.nextBlink = t + rand(2.2, 5.5) * EXPRESSION[this.shownEmotion].blinkRate;
          // Malu: sering kedip dua kali cepat
          if (EXPRESSION[this.shownEmotion].shy && Math.random() < 0.45) this.doubleBlink = true;
        }
        this.randomBlink = 0;
      } else if (p < 0) {
        this.randomBlink = 0;
      } else {
        this.randomBlink = p < 0.4 ? smooth(0, 0.4, p) : p < 0.52 ? 1 : 1 - smooth(0.52, 1, p);
      }
    }
    this.forcedLid = approach(this.forcedLid, this.forceClosed ? 1.02 : 0, this.forceClosed ? 26 : 12, dt);

    let wL = 0;
    let wR = 0;
    this.winkAmt = 0;
    const wk = this.wink;
    if (wk) {
      const p = (t - wk.start) / 1.1;
      if (p >= 1) {
        this.wink = null;
        wk.resolve();
      } else {
        const v = p < 0.14 ? smooth(0, 0.14, p) : p < 0.62 ? 1 : 1 - smooth(0.62, 0.86, p);
        this.winkAmt = v * wk.dir;
        this.nextBlink = Math.max(this.nextBlink, t + 1.2);
        if (wk.dir > 0) {
          wR = v;
          wL = 0.2 * v;
        } else {
          wL = v;
          wR = 0.2 * v;
        }
      }
    }
    const base = Math.max(this.randomBlink, Math.min(1, this.forcedLid), this.squint);
    this.lidL = Math.max(base, wL);
    this.lidR = Math.max(base, wR);
  }

  private syncDataset() {
    const phase = EXPRESSION[this.shownEmotion].snap && this.t - this.emotionSince < 1.2 ? "intro" : "main";
    const key = `${this.mode}|${this.shownEmotion}|${phase}`;
    if (key !== this.lastDataset) {
      this.lastDataset = key;
      this.root.dataset.mode = this.mode;
      this.root.dataset.expr = this.shownEmotion;
      this.root.dataset.phase = phase;
    }
    this.root.style.setProperty("--neko-mic", this.micSmooth.toFixed(3));
    this.root.style.setProperty("--neko-voice", this.mouthOpen.toFixed(3));
    const floatVal = (this.curFloatY / 45).toFixed(3);
    this.root.style.setProperty("--neko-float-y", floatVal);
    this.root.parentElement?.style.setProperty("--neko-float-y", floatVal);
  }

  // ───────────────────────── Menggambar ─────────────────────────

  private draw() {
    const gl = this.gl;
    if (!gl) return;
    const A = this.amp;
    const w = this.w;
    const rest = this.rest;
    const pos = this.pos;
    const N = rest.length / 2;
    const lx = this.look.x;
    const ly = this.look.y;
    // Energi suara saat berbicara (0 .. 1)
    const voice = this.mode === "speaking" ? this.mouthOpen : 0;

    // ── Gerakan Mengambang Bebas (Floating Buoyancy) ──
    // Gelombang harmonik lembut yang melayang tenang & anggun di udara (bebas getaran kaku)
    const floatYBase = Math.sin(this.t * 0.92) * 32 + Math.cos(this.t * 1.85) * 8;
    const floatXBase = Math.sin(this.t * 0.58) * 24 + Math.cos(this.t * 1.16) * 6;

    // Respon berbicara: saat berbicara, maskot melayang terangkat lembut dan mengayun santai
    const voiceLift = -voice * 14;
    const speakDrift = Math.sin(this.t * 0.65) * (11 * voice);
    const speakTilt = Math.sin(this.t * 0.6) * (0.026 * voice);

    const floatX = (floatXBase + speakDrift + lx * 16) * A;
    const floatY = (floatYBase + voiceLift + ly * 10) * A + (this.nod.x * 8 * A);
    this.curFloatX = floatX;
    this.curFloatY = floatY;

    // Kemiringan melayang bebas: miring lembut mengikuti ayunan layang horizontal & kursor
    const bankTilt = (floatX / 24) * 0.028;
    const floatTilt = (bankTilt + speakTilt + lx * 0.04) * A + this.tiltExtra * A + this.winkAmt * 0.06;

    // Bernapas & peregangan lembut (squash & stretch) mengikuti ketinggian melayang
    const floatStretch = -(floatY / 55) * 0.016;
    const breath = Math.sin(this.breathPhase) * A * this.breathAmp;
    const sq = this.squish.x;
    const lean = 1 + this.lean * 0.035;
    const sx = (1 - floatStretch + sq * 0.03 - breath * 0.004) * lean;
    const sy = (1 + floatStretch - sq * 0.04 + breath * 0.007) * lean;

    // Pusat tubuh mengambang (melayang bebas di udara, bukan dipatok kaku di tanah)
    const center: Vec2 = [512, 620];
    const Bn = BODY.bangs;
    const EL = BODY.earL;
    const ER = BODY.earR;
    const WL = BODY.lockL.root;
    const WR = BODY.lockR.root;
    const jawDrop = this.mouthOpen * 7 * A;

    for (let i = 0; i < N; i++) {
      let x = rest[i * 2];
      let y = rest[i * 2 + 1];

      let wt = w.earL[i];
      if (wt > 0.001) { rotAbout(x, y, EL.base[0], EL.base[1], this.earL.x * wt); x = out2[0]; y = out2[1]; }
      wt = w.earR[i];
      if (wt > 0.001) { rotAbout(x, y, ER.base[0], ER.base[1], this.earR.x * wt); x = out2[0]; y = out2[1]; }
      wt = w.bangs[i];
      if (wt > 0.001) {
        rotAbout(x, y, Bn.pivot[0], Bn.pivot[1], this.hat.x * 0.25 * wt);
        x = out2[0];
        y = out2[1] + this.hatLift.x * 0.1 * wt;
      }
      wt = w.whL[i];
      if (wt > 0.001) { rotAbout(x, y, WL[0], WL[1], (this.whisk.x * 0.28 + 0.003 * breath) * wt); x = out2[0]; y = out2[1]; }
      wt = w.whR[i];
      if (wt > 0.001) { rotAbout(x, y, WR[0], WR[1], (this.whisk.x * 0.28 - 0.003 * breath) * wt); x = out2[0]; y = out2[1]; }

      y += w.jaw[i] * jawDrop;

      // Efek 3D menoleh: tengah wajah bergeser lebih jauh dari tepinya
      const wf = w.face[i];
      x += lx * (26 * wf - 7) * A;
      y += ly * (18 * wf - 5) * A;
      const we = w.eyes[i];
      x += (lx * 3 + this.eyeShift.x) * we * A;
      y += (ly * 2 + this.eyeShift.y) * we * A;

      // Deformasi berpusat di tengah tubuh melayang
      x = center[0] + (x - center[0]) * sx;
      y = center[1] + (y - center[1]) * sy;
      rotAbout(x, y, center[0], center[1], floatTilt);
      pos[i * 2] = out2[0] + floatX + this.shakeX;
      pos[i * 2 + 1] = out2[1] + floatY + this.headDown * 14 * A + this.shakeY;
    }

    this.applyFxTransform(sx, sy, floatTilt, floatX, floatY);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    this.bindSlot(0, POSES[this.poseA]);
    const to = this.transition?.to;
    this.bindSlot(1, POSES[to ?? this.poseA]);
    gl.uniform1f(this.uMix, to ? this.mix : 0);

    const shapeL = this.winkAmt < 0 ? 1 : 0;
    const shapeR = this.winkAmt > 0 ? 1 : 0;
    gl.uniform2f(this.uBlink, this.lidL, this.lidR);
    gl.uniform2f(this.uShape, shapeL, shapeR);
    // Pergeseran bola mata di dalam mata (piksel rig)
    gl.uniform2f(this.uGaze, this.gaze.x * 11 * A, this.gaze.y * 7 * A);
    gl.uniform4f(this.uTint, 1, 1, 1, 0);
    gl.uniform2f(this.uTintBand, 0, 1);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }

  private bindSlot(slot: 0 | 1, pose: PoseRig) {
    const gl = this.gl!;
    const u = this.uSlot[slot];
    const tex = this.textures[pose.id] ?? this.textures.idle!;
    gl.activeTexture(slot === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    const eyes = pose.eyes;
    const eyeTex = this.eyeTex[pose.id];
    gl.activeTexture(slot === 0 ? gl.TEXTURE3 : gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, eyeTex ?? this.eyeTex.idle!);
    gl.activeTexture(slot === 0 ? gl.TEXTURE5 : gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.lidTex[pose.id] ?? this.lidTex.idle!);
    gl.uniform3fv(u.lidTop, pose.lidTop);
    gl.uniform3fv(u.lidBot, pose.lidBottom);
    gl.uniform1f(u.hasEyes, eyes && eyeTex && this.lidTex[pose.id] ? 1 : 0);
    gl.uniform4f(u.span, eyes ? eyes.spanL[0] : 0, eyes ? eyes.spanL[1] : 1, eyes ? eyes.spanR[0] : 0, eyes ? eyes.spanR[1] : 1);

    const mouth = pose.mouth;
    if (!mouth) {
      gl.uniform4f(u.mPar, 1, 1, 0, 0);
      return;
    }
    const open = this.mouthOpen;
    const closed = mouth.closed ? MOUTH_SPRITES[mouth.closed] : null;
    const openSprite = MOUTH_SPRITES[mouth.open];
    // Mulut tertutup memudar tepat saat mulut terbuka mulai muncul (silang singkat)
    const appear = closed ? smooth(0.085, 0.13, open) : 1;
    const sy = (mouth.minOpen + (1 - mouth.minOpen) * open) * mouth.maxOpen;
    const sx = mouth.scaleX * (0.9 + 0.1 * open);
    gl.uniform4fv(u.cBox, closed ? closed.box : [0, 0, 0, 0]);
    gl.uniform4fv(u.cUV, closed ? closed.uv : [0, 0, 0, 0]);
    gl.uniform4fv(u.oBox, openSprite.box);
    gl.uniform4fv(u.oUV, openSprite.uv);
    gl.uniform4f(u.oMap, mouth.anchor[0], mouth.anchor[1], mouth.srcAnchor[0], mouth.srcAnchor[1]);
    gl.uniform4f(u.mPar, sx, sy, closed ? 1 - appear : 0, appear);
  }

  private applyFxTransform(sx: number, sy: number, tilt: number, floatX: number, floatY: number) {
    const layer = this.fxLayer;
    if (!layer) return;
    const box = S + 2 * RIG_PAD;
    const ty = ((floatY + this.shakeY) / box) * 100;
    const tx = ((floatX + this.shakeX) / box) * 100;
    layer.style.transform = `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) rotate(${tilt.toFixed(4)}rad) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  }
}
