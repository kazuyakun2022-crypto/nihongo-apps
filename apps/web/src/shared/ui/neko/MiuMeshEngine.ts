/**
 * MiuMeshEngine — animasi ala Live2D dari satu gambar (mesh-warp WebGL).
 *
 * Gambar dibagi jadi jaring 48×48; vertex shader menggerakkan telinga, ahoge,
 * rambut, napas, dan kepala. Ekspresi mata = 3 tekstur yang di-crossfade
 * (open / wink / closed). Gerak sekunder (telinga, miring kepala, pantulan)
 * memakai pegas supaya terasa punya bobot.
 *
 * API publik sengaja kecil agar timeline bisa ditulis di luar (lihat splashScript.ts).
 */

export type EyeState = "open" | "wink" | "closed";
export type EarSide = "left" | "right";

export interface MiuMeshOptions {
  /** URL tiga tekstur: mata terbuka, wink, dan terpejam (rasio 1:1). */
  assets: { open: string; wink: string; closed: string };
  /** Kepala/wajah mengikuti pointer. Default true. */
  followPointer?: boolean;
  /** Render satu frame statis (pose wink) tanpa animasi. */
  reducedMotion?: boolean;
  /** Resolusi canvas internal (px). Default 768. */
  size?: number;
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

const VS = `
attribute vec2 p;varying vec2 uv;
uniform float t,uEL,uER,uTilt,uLag,uMouth;uniform vec2 m;
float sm(float a,float b,float x){x=clamp((x-a)/(b-a),0.,1.);return x*x*(3.-2.*x);}
vec2 rot(vec2 q,vec2 c,float a){vec2 d=q-c;float s=sin(a),k=cos(a);return c+vec2(d.x*k-d.y*s,d.x*s+d.y*k);}
float earW(vec2 p,vec2 c,vec2 r,vec2 pv){return (1.-sm(.55,1.,length((p-c)/r)))*sm(.03,.24,length(p-pv));}
void main(){uv=p;vec2 q=p;
 float face=1.-sm(.9,1.35,length((p-vec2(.5,.68))/vec2(.21,.23)));
 vec2 pl=vec2(.25,.40),pr=vec2(.79,.40);
 q=rot(q,pl,uEL*earW(p,vec2(.15,.30),vec2(.17,.14),pl));
 q=rot(q,pr,-uER*earW(p,vec2(.85,.29),vec2(.17,.14),pr));
 q=rot(q,vec2(.45,.23),exp(-pow(length(p-vec2(.52,.16))/.09,2.))*(sin(t*2.1)*.1-uLag*1.2));
 float hw=sm(.4,.95,p.y)*(1.-face);
 q.x+=(sin(t*1.7+p.y*7.+p.x*3.)*.006-uLag*.22)*hw;q.y+=cos(t*1.3+p.x*5.)*.003*hw;
 q.y+=(p.y-.78)*uMouth*exp(-pow(length((p-vec2(.5,.78))/vec2(.1,.05)),2.));
 q+=m*vec2(.014,.009)*face+m*vec2(.006,.004)*(1.-face);
 q.y=.97+(q.y-.97)*(1.+sin(t*1.8)*.009);
 q=rot(q,vec2(.5,.95),sin(t*.9)*.015+m.x*.03+uTilt);
 gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0.,1.);}`;

const FS = `
precision mediump float;varying vec2 uv;
uniform sampler2D a,b,c;uniform vec3 w;uniform float uBlush;
void main(){vec4 o=texture2D(a,uv)*w.x+texture2D(b,uv)*w.y+texture2D(c,uv)*w.z;
 float bm=exp(-pow(length((uv-vec2(.34,.74))/vec2(.1,.06)),2.))+exp(-pow(length((uv-vec2(.66,.73))/vec2(.1,.06)),2.));
 o.rgb+=vec3(.12,-.04,-.02)*bm*uBlush*o.a;gl_FragColor=o;}`;

const GRID = 48;
const TEX_KEYS = ["a", "b", "c"] as const;

export class MiuMeshEngine {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private buffers: WebGLBuffer[] = [];
  private textures: WebGLTexture[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private indexCount = 0;
  private raf = 0;
  private t0 = 0;
  private prev = 0;
  private running = false;
  private destroyed = false;
  private readyFired = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  // state (pegas)
  private eL = spring();
  private eR = spring();
  private tilt = spring();
  private lag = spring();
  private bounceS = spring();
  private mouth = spring();
  private blush = spring(0.1);
  private eyes: [number, number, number] = [1, 0, 0];
  private eyeT: [number, number, number] = [1, 0, 0];
  private ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  private nextL = 2.2;
  private nextR = 3.1;

  private readonly onMove = (e: PointerEvent) => {
    this.ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    this.ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: MiuMeshOptions,
  ) {
    const size = opts.size ?? 768;
    canvas.width = size;
    canvas.height = size;
    const ctxOpts: WebGLContextAttributes = { premultipliedAlpha: true, alpha: true };
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
    this.setEyes("open", true);
    // Ketiga tekstur dimuat dulu (sudah di-preload di layout, jadi cepat). Kalau wink belum siap saat
    // dipakai, mata berbaur ke tekstur kosong dan karakter tampak patah/berkedip.
    Promise.all([
      this.loadTextureInto(0, opts.assets.open),
      this.loadTextureInto(1, opts.assets.wink),
      this.loadTextureInto(2, opts.assets.closed),
    ]).then(
      () => {
        if (this.destroyed) return;
        if (opts.followPointer !== false && !opts.reducedMotion) {
          window.addEventListener("pointermove", this.onMove, { passive: true });
        }
        this.running = true;
        this.t0 = this.prev = performance.now();
        // onReady dipanggil setelah frame pertama tergambar, supaya poster bisa diganti canvas tanpa jeda kosong
        this.raf = requestAnimationFrame(this.frame);
      },
      (err) => {
        console.error("[MiuMeshEngine] load texture failed:", err);
        opts.onError?.(err);
      },
    );

  }

  // ───────── API publik ─────────

  setEyes(state: EyeState, instant = false) {
    this.eyeT = state === "open" ? [1, 0, 0] : state === "wink" ? [0, 1, 0] : [0, 0, 1];
    if (instant) this.eyes = [...this.eyeT];
  }
  /** Tutup mata sebentar. `delay` = jeda sebelum menutup (ms). */
  blink(duration = 130, delay = 0) {
    this.later(() => {
      this.setEyes("closed");
      this.later(() => this.setEyes("open"), duration);
    }, delay);
  }
  /** Sentakan telinga (impuls negatif = menunduk dulu, positif = menyentak naik). */
  flickEar(side: EarSide, impulse: number) {
    (side === "left" ? this.eL : this.eR).v += impulse;
  }
  /** Posisi istirahat telinga (rad). 0 = normal, positif = tegak. */
  setEarPerk(rad: number) {
    this.eL.g = this.eR.g = rad;
  }
  /** Kemiringan kepala (rad). Rambut menyusul dengan jeda. */
  setTilt(rad: number) {
    this.tilt.g = rad;
  }
  /** 0..1 — mulut melebar saat senang. */
  setMouth(v: number) {
    this.mouth.g = v;
  }
  /** 0..1 — intensitas rona pipi. */
  setBlush(v: number) {
    this.blush.g = v;
  }
  /** Dorongan pantulan (squash & stretch). Negatif = mendarat. */
  bounce(impulse: number) {
    this.bounceS.v += impulse;
  }
  destroy() {

    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.onMove);
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    const gl = this.gl;
    if (!gl) return;
    this.textures.forEach((t) => {
      try { gl.deleteTexture(t); } catch {}
    });
    this.textures = [];
    this.buffers.forEach((b) => {
      try { gl.deleteBuffer(b); } catch {}
    });
    this.buffers = [];
    if (this.program) {
      try { gl.deleteProgram(this.program); } catch {}
    }
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
      const s = gl.createShader(type);
      if (!s) throw new Error("Failed to create WebGL shader");
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s) || "shader error";
        console.error("WebGL shader compile error:", log, "src:", src);
        throw new Error(log);
      }
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
    for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) verts.push(i / GRID, j / GRID);
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const a = j * (GRID + 1) + i;
        const c = a + GRID + 1;
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

    for (const n of ["t", "m", "w", "uEL", "uER", "uTilt", "uLag", "uMouth", "uBlush", ...TEX_KEYS]) {
      this.uniforms[n] = gl.getUniformLocation(pr, n);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    // Placeholder 1x1 transparan untuk setiap slot agar shader siap draw sejak frame 0
    const blank = new Uint8Array([255, 255, 255, 0]);
    for (let i = 0; i < TEX_KEYS.length; i++) {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blank);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (this.uniforms[TEX_KEYS[i]]) {
        gl.uniform1i(this.uniforms[TEX_KEYS[i]], i);
      }
      this.textures.push(tex);
    }
  }

  private loadTextureInto(index: number, src: string): Promise<void> {
    const gl = this.gl;
    if (!gl) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const im = new Image();
      const upload = () => {
        if (this.destroyed || !this.gl || !this.textures[index]) return;
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[index]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        resolve();
      };
      im.onload = upload;
      im.onerror = () => reject(new Error(`Gagal memuat ${src}`));
      im.src = src;
      if (im.complete && im.naturalWidth > 0) {
        upload();
      }
    });
  }


  private frame = (ms: number) => {
    const gl = this.gl;
    if (!this.running || !gl || !this.program) return;
    const reduced = !!this.opts.reducedMotion;
    const t = reduced ? 0 : (ms - this.t0) / 1000;
    const dt = Math.min(0.033, (ms - this.prev) / 1000 || 0.016);
    this.prev = ms;

    if (!reduced) {
      // sentakan telinga acak saat idle
      if (t > this.nextL) {
        this.eL.v -= 2.5;
        this.nextL = t + 3 + Math.random() * 2.5;
      }
      if (t > this.nextR) {
        this.eR.v -= 2.5;
        this.nextR = t + 3.4 + Math.random() * 2.5;
      }
      // redaman tinggi (rasio ~0.65) agar telinga tidak memantul berlebihan
      step(this.eL, 90, 12, dt);
      step(this.eR, 90, 12, dt);
      step(this.tilt, 40, 7, dt);
      step(this.lag, 18, 3.2, dt);
      step(this.bounceS, 160, 9, dt);
      step(this.mouth, 90, 9, dt);
      step(this.blush, 30, 8, dt);
      this.lag.g = this.tilt.x;
      this.ptr.x += (this.ptr.tx - this.ptr.x) * 0.08;
      this.ptr.y += (this.ptr.ty - this.ptr.y) * 0.08;
      // Peralihan mata berbasis waktu (±95% dalam ~130 ms), tidak bergantung frame rate
      const eyeEase = 1 - Math.exp(-dt * 23);
      for (let i = 0; i < 3; i++) this.eyes[i] += (this.eyeT[i] - this.eyes[i]) * eyeEase;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Pastikan buffer terhubung
    if (this.buffers[0] && this.buffers[1]) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]);
      const loc = gl.getAttribLocation(this.program, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers[1]);
    }

    // Pastikan tekstur terhubung ke sampler
    for (let i = 0; i < this.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      if (this.uniforms[TEX_KEYS[i]]) {
        gl.uniform1i(this.uniforms[TEX_KEYS[i]], i);
      }
    }

    const u = this.uniforms;
    gl.uniform1f(u.t, t);
    gl.uniform2f(u.m, this.ptr.x, this.ptr.y);
    gl.uniform3f(u.w, this.eyes[0], this.eyes[1], this.eyes[2]);
    gl.uniform1f(u.uEL, this.eL.x);
    gl.uniform1f(u.uER, this.eR.x);
    gl.uniform1f(u.uTilt, this.tilt.x);
    gl.uniform1f(u.uLag, this.lag.x - this.tilt.x);
    gl.uniform1f(u.uMouth, this.mouth.x);
    gl.uniform1f(u.uBlush, this.blush.x);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const b = this.bounceS.x * 0.04;
    this.canvas.style.transform = `scale(${1 + b},${1 - b})`;
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    if (!this.readyFired) {
      this.readyFired = true;
      this.opts.onReady?.();
    }
    this.raf = requestAnimationFrame(this.frame);
  };


}
