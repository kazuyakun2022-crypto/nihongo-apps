/**
 * ChibiMeshEngine — animasi ala Live2D untuk maskot chibi seluruh badan (landing page), dari satu gambar.
 *
 * Seperti MiuMeshEngine, gambar dibagi jadi jaring dan vertex shader menggerakkan wilayah berbobot:
 * telinga, kepala, rambut samping, mulut, ekor, dan napas. Bedanya, hanya ada satu tekstur (mata terbuka),
 * jadi kedipan digambar di fragment shader: kelopak berwarna kulit turun menutup mata dan
 * garis bulu mata mengikuti tepinya. Mata juga melirik ke arah kursor.
 *
 * Semua koordinat wilayah diukur dalam piksel gambar asli 1084×1451 (lihat S di shader).
 */

export interface ChibiMeshOptions {
  src: string;
  closedEyesSrc?: string;
  /** Render satu frame diam tanpa animasi. */
  reducedMotion?: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

interface Spring {
  x: number;
  v: number;
  g: number;
}
const spring = (x = 0): Spring => ({ x, v: 0, g: x });
function step(s: Spring, k: number, d: number, dt: number) {
  s.v += ((s.g - s.x) * k - s.v * d) * dt;
  s.x += s.v * dt;
}

const IMAGE_W = 1084;
const IMAGE_H = 1451;
/** Ruang kosong di sekitar karakter (px gambar) supaya telinga dan ekor yang bergerak tidak terpotong. */
const PAD_X = 80;
const PAD_Y = 60;
/** Rasio canvas (lebar/tinggi), dipakai komponen untuk aspect-ratio. */
export const CHIBI_ASPECT = (IMAGE_W + PAD_X * 2) / (IMAGE_H + PAD_Y * 2);

const GRID_X = 64;
const GRID_Y = 86;

const COMMON = `
const vec2 S=vec2(${IMAGE_W}.,${IMAGE_H}.);
float sm(float a,float b,float x){x=clamp((x-a)/(b-a),0.,1.);return x*x*(3.-2.*x);}
float ell(vec2 P,vec2 c,vec2 r){return length((P-c)/r);}`;

const VS = `
attribute vec2 p;varying vec2 uv;
uniform float t,uEL,uER,uTilt,uLag,uTalk,uTail;uniform vec2 m;
${COMMON}
const vec2 PAD=vec2(${PAD_X}.,${PAD_Y}.);
vec2 rot(vec2 q,vec2 c,float a){vec2 d=q-c;float s=sin(a),k=cos(a);return c+vec2(d.x*k-d.y*s,d.x*s+d.y*k);}
void main(){uv=p;vec2 P=p*S;vec2 Q=P;
 // Ekor: berporos di pangkal (balik rok); sudut makin besar ke ujung dan merambat seperti gelombang
 vec2 tp=vec2(730.,1110.);
 float tm=max(1.-sm(.7,1.,ell(P,vec2(960.,820.),vec2(140.,200.))),1.-sm(.7,1.,ell(P,vec2(900.,1040.),vec2(180.,100.))));
 float bag=sm(625.,645.,P.x)*(1.-sm(825.,845.,P.x))*sm(670.,690.,P.y)*(1.-sm(985.,1005.,P.y));
 float tw=tm*(1.-bag)*sm(770.,830.,P.x);
 float td=length(P-tp);
 Q=rot(Q,tp,tw*sm(0.,320.,td)*(uTail*sin(t*2.3-td*.007)+.02*sin(t*.7)));
 // Telinga: berporos di pangkal, ujungnya paling bebas
 float wl=(1.-sm(.6,1.,ell(P,vec2(200.,130.),vec2(150.)))) *sm(20.,140.,length(P-vec2(300.,230.)));
 float wr=(1.-sm(.6,1.,ell(P,vec2(860.,140.),vec2(150.)))) *sm(20.,140.,length(P-vec2(760.,215.)));
 Q=rot(Q,vec2(300.,230.),-uEL*wl);
 Q=rot(Q,vec2(760.,215.),uER*wr);
 float face=1.-sm(.85,1.15,ell(P,vec2(530.,520.),vec2(250.,200.)));
 float head=(1.-sm(640.,740.,P.y))*(1.-tw);
 // Rambut samping menjuntai: berayun pelan dan tertinggal saat kepala miring
 float side=max(1.-sm(300.,340.,P.x),sm(730.,770.,P.x));
 float lock=sm(300.,660.,P.y)*(1.-sm(720.,760.,P.y))*(1.-face)*side*(1.-tw);
 Q.x+=lock*(sin(t*1.6+P.y*.012)*5.-uLag*60.);
 // Mulut: membuka/menutup berengsel di bibir atas saat bicara
 Q.y+=(P.y-578.)*uTalk*exp(-pow(ell(P,vec2(540.,618.),vec2(85.,62.)),2.));
 // Wajah sedikit bergeser ke arah kursor (paralaks), kepala ikut miring
 Q+=m*vec2(7.,5.)*face;
 Q=rot(Q,vec2(540.,700.),(uTilt+sin(t*.9)*.022+m.x*.035)*head);
 // Napas: seluruh badan mengembang sedikit bertumpu di kaki
 Q.y=1430.+(Q.y-1430.)*(1.+sin(t*1.8)*.006);
 vec2 c=(Q+PAD)/(S+2.*PAD);
 gl_Position=vec4(c.x*2.-1.,1.-c.y*2.,0.,1.);}`;

const FS = `
precision mediump float;varying vec2 uv;
uniform sampler2D tex,texClosed;
uniform float uBlink;
uniform vec2 uLook;
${COMMON}
const vec2 EL=vec2(371.,470.),ER=vec2(683.,470.),RE=vec2(95.,80.);
void main(){
  vec2 P=uv*S;
  // Iris bergeser ke arah kursor; tepi mata (bulu mata) tetap di tempat
  vec2 look=uLook*vec2(9.,6.)*((1.-sm(.45,.85,ell(P,EL,RE)))+(1.-sm(.45,.85,ell(P,ER,RE))));
  vec4 openCol=texture2D(tex,(P-look)/S);
  vec4 closedCol=texture2D(texClosed,P/S);
  // Animasi kedipan mata anime alami: transisi halus mata terpejam
  float b=smoothstep(0.04,0.96,uBlink);
  vec3 eyeRgb=mix(openCol.rgb,closedCol.rgb,closedCol.a*b);
  gl_FragColor=vec4(eyeRgb,openCol.a);
}`;

export class ChibiMeshEngine {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private textureClosed: WebGLTexture | null = null;
  private buffers: WebGLBuffer[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private indexCount = 0;
  private raf = 0;
  private t0 = 0;
  private prev = 0;
  private running = false;
  private visible = true;
  private destroyed = false;
  private readyFired = false;
  private observer: IntersectionObserver | null = null;

  private eL = spring();
  private eR = spring();
  private tilt = spring();
  private lag = spring();
  private tail = spring(0.08);
  private talk = 0;
  private talkUntil = 0;
  private blink = 0;
  private blinkTarget = 0;
  private eyesHeld = false;
  private happy = 0;
  private ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  private nextBlink = 1.2;
  private nextEar = 2.5;
  private nextTilt = 3;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private readonly onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    // Pusat di wajah (±35% dari atas canvas); dinormalkan terhadap ukuran layar supaya gerakannya halus
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.35;
    this.ptr.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.45)));
    this.ptr.ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.45)));
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: ChibiMeshOptions,
  ) {
    const ctxOpts: WebGLContextAttributes = { premultipliedAlpha: true, alpha: true, antialias: true };
    this.gl = (canvas.getContext("webgl", ctxOpts) ||
      canvas.getContext("experimental-webgl", ctxOpts)) as WebGLRenderingContext | null;
    if (!this.gl) {
      opts.onError?.(new Error("WebGL tidak tersedia"));
      return;
    }
    try {
      this.initGL(this.gl);
    } catch (err) {
      opts.onError?.(err);
      return;
    }
    const closedSrc = opts.closedEyesSrc ?? "/neko/chibi/chibi-closed-eyes.webp";
    Promise.all([
      this.loadTexture(0, opts.src),
      this.loadTexture(1, closedSrc),
    ]).then(
      ([texOpen, texClosed]) => {
        if (this.destroyed) return;
        this.texture = texOpen;
        this.textureClosed = texClosed;
        if (!opts.reducedMotion) {
          window.addEventListener("pointermove", this.onMove, { passive: true });
          // Hemat baterai: berhenti menggambar saat maskot tidak terlihat
          this.observer = new IntersectionObserver((entries) => {
            this.visible = entries[entries.length - 1].isIntersecting;
            if (this.visible) this.refresh();
          });
          this.observer.observe(canvas);
        }
        this.running = true;
        this.t0 = this.prev = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      },
      (err) => opts.onError?.(err),
    );
  }

  /** Sentuhan: lompat kecil, mata ^^, telinga menyentak, ekor dikibas, dan mulut berceloteh. */
  poke() {
    if (this.opts.reducedMotion || !this.running) return;
    this.canvas.animate(
      [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: "translateY(0) scale(1.05, 0.93)", offset: 0.18 },
        { transform: "translateY(-7%) scale(0.95, 1.06)", offset: 0.45 },
        { transform: "translateY(0) scale(1.04, 0.96)", offset: 0.72 },
        { transform: "translateY(0) scale(1, 1)" },
      ],
      { duration: 620, easing: "ease-out" },
    );
    this.eL.v += 7;
    this.eR.v += 7;
    this.tilt.v += (Math.random() < 0.5 ? -1 : 1) * 0.5;
    this.happy = 1;
    this.blinkTarget = 1;
    this.later(() => (this.blinkTarget = 0), 750);
    this.tail.g = 0.22;
    this.later(() => (this.tail.g = 0.08), 1300);
    this.say(900);
  }

  /** Gerakan mulut berbicara selama `ms`. */
  say(ms: number) {
    this.talkUntil = Math.max(this.talkUntil, performance.now() + ms);
  }

  /** Tahan mata tetap terpejam (mis. "tidak mengintip" saat password diketik). */
  holdEyes(closed: boolean) {
    this.eyesHeld = closed;
    if (!closed) this.blinkTarget = 0;
    this.refresh();
  }

  /** Panggil setelah ukuran canvas berubah: menggambar ulang (resize mengosongkan canvas) dan melanjutkan loop. */
  refresh() {
    if (!this.running || this.raf) return;
    this.prev = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.onMove);
    this.observer?.disconnect();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.textureClosed) gl.deleteTexture(this.textureClosed);
    this.buffers.forEach((b) => gl.deleteBuffer(b));
    if (this.program) gl.deleteProgram(this.program);
    this.gl = null;
  }

  // ───────── internal ─────────

  private later(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  private initGL(gl: WebGLRenderingContext) {
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader error");
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("program link error");
    gl.useProgram(pr);
    this.program = pr;

    const verts: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= GRID_Y; j++) for (let i = 0; i <= GRID_X; i++) verts.push(i / GRID_X, j / GRID_Y);
    for (let j = 0; j < GRID_Y; j++) {
      for (let i = 0; i < GRID_X; i++) {
        const a = j * (GRID_X + 1) + i;
        const c = a + GRID_X + 1;
        idx.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
    this.indexCount = idx.length;
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    this.buffers.push(vb, ib);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const n of ["t", "m", "uEL", "uER", "uTilt", "uLag", "uTalk", "uTail", "tex", "texClosed", "uBlink", "uLook"]) {
      this.uniforms[n] = gl.getUniformLocation(pr, n);
    }
    gl.uniform1i(this.uniforms.tex, 0);
    gl.uniform1i(this.uniforms.texClosed, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  }

  private loadTexture(unit: number, src: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const gl = this.gl;
        if (this.destroyed || !gl) return;
        const tex = gl.createTexture()!;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        resolve(tex);
      };
      im.onerror = () => reject(new Error(`Gagal memuat ${src}`));
      im.src = src;
    });
  }

  /** Jadwal gerak spontan: kedip (kadang dua kali), telinga berkedut, dan ganti posisi miring kepala. */
  private idle(t: number) {
    if (t > this.nextBlink && this.happy === 0 && !this.eyesHeld) {
      this.blinkTarget = 1;
      this.later(() => (this.blinkTarget = 0), 120);
      if (Math.random() < 0.25) {
        this.later(() => (this.blinkTarget = 1), 260);
        this.later(() => (this.blinkTarget = 0), 380);
      }
      this.nextBlink = t + 2.8 + Math.random() * 2.8;
    }
    if (t > this.nextEar) {
      const ear = Math.random() < 0.5 ? this.eL : this.eR;
      ear.v += (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 2);
      if (Math.random() < 0.3) this.later(() => (ear.v += 3), 160);
      this.nextEar = t + 2.2 + Math.random() * 3.5;
    }
    if (t > this.nextTilt) {
      this.tilt.g = (Math.random() - 0.5) * 0.09;
      this.nextTilt = t + 3 + Math.random() * 3;
    }
  }

  private frame = (ms: number) => {
    this.raf = 0;
    const gl = this.gl;
    if (!this.running || !gl || !this.program || !this.texture) return;
    // Belum punya ukuran (mis. halaman masih disembunyikan splash): jangan lapor siap, tunggu refresh()
    if (this.canvas.width === 0 || this.canvas.height === 0) return;
    const reduced = !!this.opts.reducedMotion;
    const t = reduced ? 0 : (ms - this.t0) / 1000;
    const dt = Math.min(0.033, (ms - this.prev) / 1000 || 0.016);
    this.prev = ms;

    if (!reduced) {
      this.idle(t);
      // Redaman ±0,57: telinga memantul sekali-dua kali lalu diam, tidak berlebihan
      step(this.eL, 110, 12, dt);
      step(this.eR, 110, 12, dt);
      step(this.tilt, 40, 7, dt);
      step(this.lag, 18, 3.2, dt);
      step(this.tail, 20, 9, dt);
      this.lag.g = this.tilt.x;
      this.ptr.x += (this.ptr.tx - this.ptr.x) * (1 - Math.exp(-dt * 5));
      this.ptr.y += (this.ptr.ty - this.ptr.y) * (1 - Math.exp(-dt * 5));
      // Gerakan kedip anime alami: menutup cepat (~60ms), membuka lembut (~140ms)
      const blinkGoal = this.eyesHeld ? 1 : this.blinkTarget;
      const blinkRate = blinkGoal > this.blink ? 36 : 18;
      this.blink += (blinkGoal - this.blink) * (1 - Math.exp(-dt * blinkRate));
      if (this.blinkTarget === 0 && this.blink < 0.02) this.happy = 0;
      // Celoteh: mulut mengecil-membesar cepat lalu kembali ke senyum lebar semula
      const talking = ms < this.talkUntil;
      const goal = talking ? -0.24 * (0.5 + 0.5 * Math.sin(t * 17)) + 0.06 : 0;
      this.talk += (goal - this.talk) * (1 - Math.exp(-dt * 25));
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textureClosed);

    const u = this.uniforms;
    gl.uniform1f(u.t, t);
    gl.uniform2f(u.m, this.ptr.x, this.ptr.y);
    // Sentakan 3–7 → ±0,1–0,2 rad di ujung telinga
    gl.uniform1f(u.uEL, this.eL.x * 0.3);
    gl.uniform1f(u.uER, this.eR.x * 0.3);
    gl.uniform1f(u.uTilt, this.tilt.x);
    gl.uniform1f(u.uLag, this.lag.x - this.tilt.x);
    gl.uniform1f(u.uTalk, this.talk);
    gl.uniform1f(u.uTail, this.tail.x);
    gl.uniform1f(u.uBlink, this.blink);
    gl.uniform2f(u.uLook, this.ptr.x, this.ptr.y);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    if (!this.readyFired) {
      this.readyFired = true;
      this.opts.onReady?.();
    }
    if (!reduced && this.visible) this.raf = requestAnimationFrame(this.frame);
  };
}
