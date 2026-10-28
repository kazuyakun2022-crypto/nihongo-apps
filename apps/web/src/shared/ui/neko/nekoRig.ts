/**
 * Data rig maskot Miu-chan.
 *
 * Semua koordinat memakai ruang gambar 1024 x 1024 piksel. Gambar asli
 * (1024 x 765) diletakkan 130 piksel dari atas, dan semua ekspresi sudah
 * selaras di posisi wajah yang sama.
 *
 * Kalau gambar ekspresi diganti, ukur ulang angka di file ini dan buat ulang
 * base-*.webp, eyes-*.png, dan mouth-atlas.webp.
 */

export type NekoMode = "idle" | "listening" | "processing" | "speaking";
export type PoseId = "idle" | "senang" | "semangat" | "sedih" | "nangis" | "kesal" | "marah" | "rese" | "kaget" | "bingung" | "malu" | "berpikir" | "dielus";
/** Emosi jawaban dari AI ("biasa" = pose idle). "berpikir" khusus status processing, "dielus" saat disentuh. */
export type NekoEmotion = "biasa" | Exclude<PoseId, "idle">;
export const EMOTIONS: readonly NekoEmotion[] = [
  "biasa", "senang", "semangat", "sedih", "nangis", "kesal", "marah", "rese", "kaget", "bingung", "malu",
];

export const RIG_SIZE = 1024;
/** Ruang ekstra di sekeliling gambar supaya telinga dan rambut tidak terpotong saat bergerak. */
export const RIG_PAD = 60;
export const ASSET_BASE = "/neko/";

/** [cx, cy, rx, ry] */
export type Ellipse = readonly [number, number, number, number];
export type Vec2 = readonly [number, number];
export type Rgb = readonly [number, number, number];
/** [x, y, lebar, tinggi] */
export type Box = readonly [number, number, number, number];

/**
 * Atlas mulut: setiap sprite hanya berisi mulut (latar transparan).
 * box = posisi asli sprite di ruang rig, uv = letaknya di atlas (0..1).
 */
export type MouthSpriteId = "marah" | "senang" | "kaget" | "nangis" | "rese" | "kesal" | "bingung" | "idle" | "sedih" | "malu" | "berpikir";
export const MOUTH_ATLAS_FILE = "mouth-atlas.webp";
export const MOUTH_SPRITES: Record<MouthSpriteId, { box: Box; uv: Box }> = {
  marah: { box: [421, 708, 162, 104], uv: [0.007812, 0.03125, 0.158203, 0.40625] },
  senang: { box: [440, 715, 122, 100], uv: [0.181641, 0.03125, 0.119141, 0.390625] },
  kaget: { box: [441, 713, 129, 101], uv: [0.316406, 0.03125, 0.125977, 0.394531] },
  nangis: { box: [437, 731, 133, 56], uv: [0.458008, 0.03125, 0.129883, 0.21875] },
  rese: { box: [439, 715, 122, 83], uv: [0.603516, 0.03125, 0.119141, 0.324219] },
  kesal: { box: [462, 720, 82, 54], uv: [0.738281, 0.03125, 0.080078, 0.210938] },
  bingung: { box: [446, 728, 122, 55], uv: [0.833984, 0.03125, 0.119141, 0.214844] },
  idle: { box: [459, 742, 93, 30], uv: [0.007812, 0.5, 0.09082, 0.117188] },
  sedih: { box: [453, 740, 100, 30], uv: [0.114258, 0.5, 0.097656, 0.117188] },
  malu: { box: [477, 745, 65, 32], uv: [0.227539, 0.5, 0.063477, 0.125] },
  berpikir: { box: [478, 732, 53, 35], uv: [0.306641, 0.5, 0.051758, 0.136719] },
};

export interface MouthRig {
  /** Mulut tertutup (digambar di posisi aslinya); null kalau mulut tidak pernah menutup. */
  closed: MouthSpriteId | null;
  /** Mulut terbuka yang diregang mengikuti volume suara. */
  open: MouthSpriteId;
  /** Titik tengah bibir atas di pose ini. */
  anchor: Vec2;
  /** Titik tengah bibir atas di sprite mulut terbuka (posisi aslinya). */
  srcAnchor: Vec2;
  /** Lebar mulut terbuka relatif terhadap sprite. */
  scaleX: number;
  /** Tinggi maksimum (1 = setinggi sprite). */
  maxOpen: number;
  /** Tinggi saat mulai terbuka (bagian dari maxOpen). */
  minOpen: number;
}

/**
 * Kedipan mengikuti bentuk mata asli. File mask (512 x 512, RGB):
 * R = area mata (bulu mata atas sampai garis bawah mata),
 * G = posisi vertikal di dalam mata (0 atas, 1 bawah), B = tinggi mata / 400 px.
 * spanL/spanR = rentang x mata kiri dan kanan; [0, 0] = mata itu tidak berkedip.
 */
export interface EyeRig {
  mask: string;
  /** Kulit di area mata (mata sudah ditutup kulit sekitarnya), dipakai untuk kelopak. Lihat LID_RECT. */
  lid: string;
  spanL: Vec2;
  spanR: Vec2;
}

export interface PoseRig {
  id: PoseId;
  /** Gambar dasar untuk animasi (mulut sudah dihapus). */
  file: string;
  /** Gambar utuh untuk tampilan statis. */
  still: string;
  eyes: EyeRig | null;
  lidTop: Rgb;
  lidBottom: Rgb;
  mouth: MouthRig | null;
}

/** Area tekstur kulit kelopak (lids-*.webp) di ruang rig: [x, y, lebar, tinggi]. */
export const LID_RECT: Box = [230, 460, 560, 270];

/** Batas antara mata kiri dan kanan (x di ruang rig). */
export const EYE_SPLIT_X = 507;

export const POSES: Record<PoseId, PoseRig> = {
  idle: {
    id: "idle",
    file: "base-idle.webp",
    still: "maskot-idle.webp",
    eyes: { mask: "eyes-idle.png", lid: "lids-idle.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.995, 0.926, 0.847],
    lidBottom: [0.997, 0.926, 0.848],
    mouth: {
      closed: "idle",
      open: "senang",
      anchor: [506, 748],
      srcAnchor: [501, 719],
      scaleX: 0.8,
      maxOpen: 0.9,
      minOpen: 0.3,
    },
  },
  senang: {
    id: "senang",
    file: "base-senang.webp",
    still: "maskot-senang.webp",
    eyes: { mask: "eyes-senang.png", lid: "lids-senang.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.994, 0.928, 0.847],
    lidBottom: [0.996, 0.926, 0.851],
    mouth: {
      closed: "idle",
      open: "senang",
      anchor: [501, 719],
      srcAnchor: [501, 719],
      scaleX: 1,
      maxOpen: 1,
      minOpen: 0.3,
    },
  },
  semangat: {
    id: "semangat",
    file: "base-semangat.webp",
    still: "maskot-semangat.webp",
    eyes: { mask: "eyes-semangat.png", lid: "lids-semangat.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.996, 0.930, 0.855],
    lidBottom: [0.994, 0.925, 0.853],
    mouth: {
      closed: "idle",
      open: "senang",
      anchor: [501, 719],
      srcAnchor: [501, 719],
      scaleX: 1,
      maxOpen: 1,
      minOpen: 0.3,
    },
  },
  sedih: {
    id: "sedih",
    file: "base-sedih.webp",
    still: "maskot-sedih.webp",
    eyes: { mask: "eyes-sedih.png", lid: "lids-sedih.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.887, 0.737, 0.691],
    lidBottom: [0.987, 0.883, 0.828],
    mouth: {
      closed: "sedih",
      open: "nangis",
      anchor: [503, 742],
      srcAnchor: [504, 735],
      scaleX: 0.75,
      maxOpen: 0.8,
      minOpen: 0.35,
    },
  },
  nangis: {
    id: "nangis",
    file: "base-nangis.webp",
    still: "maskot-nangis.webp",
    eyes: { mask: "eyes-nangis.png", lid: "lids-nangis.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.964, 0.741, 0.692],
    lidBottom: [0.936, 0.693, 0.648],
    mouth: {
      closed: "sedih",
      open: "nangis",
      anchor: [504, 735],
      srcAnchor: [504, 735],
      scaleX: 1,
      maxOpen: 1,
      minOpen: 0.35,
    },
  },
  kesal: {
    id: "kesal",
    file: "base-kesal.webp",
    still: "maskot-kesal.webp",
    eyes: { mask: "eyes-kesal.png", lid: "lids-kesal.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.990, 0.861, 0.794],
    lidBottom: [0.975, 0.853, 0.795],
    mouth: {
      closed: "kesal",
      open: "marah",
      anchor: [511, 736],
      srcAnchor: [501, 713],
      scaleX: 0.6,
      maxOpen: 0.6,
      minOpen: 0.35,
    },
  },
  marah: {
    id: "marah",
    file: "base-marah.webp",
    still: "maskot-marah.webp",
    eyes: { mask: "eyes-marah.png", lid: "lids-marah.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.931, 0.679, 0.627],
    lidBottom: [0.937, 0.698, 0.651],
    mouth: {
      closed: "kesal",
      open: "marah",
      anchor: [501, 713],
      srcAnchor: [501, 713],
      scaleX: 1,
      maxOpen: 1,
      minOpen: 0.4,
    },
  },
  rese: {
    id: "rese",
    file: "base-rese.webp",
    still: "maskot-rese.webp",
    eyes: { mask: "eyes-rese.png", lid: "lids-rese.webp", spanL: [260, 428], spanR: [0, 0] },
    lidTop: [0.989, 0.931, 0.847],
    lidBottom: [0.994, 0.927, 0.855],
    mouth: {
      closed: "rese",
      open: "senang",
      anchor: [496, 735],
      srcAnchor: [501, 719],
      scaleX: 0.7,
      maxOpen: 0.7,
      minOpen: 0.35,
    },
  },
  kaget: {
    id: "kaget",
    file: "base-kaget.webp",
    still: "maskot-kaget.webp",
    eyes: { mask: "eyes-kaget.png", lid: "lids-kaget.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.986, 0.933, 0.847],
    lidBottom: [0.994, 0.926, 0.849],
    mouth: {
      closed: null,
      open: "kaget",
      anchor: [504, 717],
      srcAnchor: [504, 717],
      scaleX: 1,
      maxOpen: 1,
      minOpen: 0.5,
    },
  },
  bingung: {
    id: "bingung",
    file: "base-bingung.webp",
    still: "maskot-bingung.webp",
    eyes: { mask: "eyes-bingung.png", lid: "lids-bingung.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.989, 0.930, 0.851],
    lidBottom: [0.993, 0.926, 0.851],
    mouth: {
      closed: "bingung",
      open: "kaget",
      anchor: [511, 736],
      srcAnchor: [504, 717],
      scaleX: 0.7,
      maxOpen: 0.7,
      minOpen: 0.35,
    },
  },
  malu: {
    id: "malu",
    file: "base-malu.webp",
    still: "maskot-malu.webp",
    eyes: { mask: "eyes-malu.png", lid: "lids-malu.webp", spanL: [260, 428], spanR: [576, 744] },
    lidTop: [0.961, 0.820, 0.780],
    lidBottom: [0.961, 0.820, 0.780],
    mouth: {
      closed: "malu",
      open: "senang",
      anchor: [509, 752],
      srcAnchor: [501, 719],
      scaleX: 0.55,
      maxOpen: 0.55,
      minOpen: 0.35,
    },
  },
  berpikir: {
    id: "berpikir",
    file: "base-berpikir.webp",
    still: "maskot-berpikir.webp",
    eyes: { mask: "eyes-berpikir.png", lid: "lids-berpikir.webp", spanL: [276, 428], spanR: [576, 744] },
    lidTop: [0.989, 0.930, 0.855],
    lidBottom: [0.989, 0.930, 0.855],
    mouth: {
      closed: "berpikir",
      open: "kaget",
      anchor: [509, 745],
      srcAnchor: [504, 717],
      scaleX: 0.5,
      maxOpen: 0.5,
      minOpen: 0.35,
    },
  },  dielus: {
    id: "dielus",
    file: "base-dielus.webp",
    still: "maskot-dielus.webp",
    // Mata terpejam senang dan mulut ":3" sudah ada di gambar
    eyes: null,
    lidTop: [0.995, 0.926, 0.847],
    lidBottom: [0.997, 0.926, 0.848],
    mouth: null,
  },

};


export const POSE_IDS = Object.keys(POSES) as PoseId[];

/** Bagian tubuh untuk deformasi mesh (diukur dari pose idle). */
export const BODY = {
  earL: { base: [240, 335] as Vec2, tip: [118, 160] as Vec2, width: 85 },
  earR: { base: [785, 325] as Vec2, tip: [880, 160] as Vec2, width: 85 },
  /** Untaian rambut samping yang berayun: akar, ujung, lebar. */
  lockL: { root: [200, 450] as Vec2, tip: [150, 890] as Vec2, width: 85 },
  lockR: { root: [830, 450] as Vec2, tip: [860, 890] as Vec2, width: 85 },
  /** Poni yang sedikit bergoyang. */
  bangs: { c: [512, 360] as Vec2, r: [250, 120] as Vec2, pivot: [512, 230] as Vec2 },
  face: { c: [512, 600] as Vec2, sigma: 260 },
  eyes: [
    [352, 598],
    [662, 594],
  ] as readonly Vec2[],
  jaw: { c: [507, 785] as Vec2, r: 90 },
  jawBand: [745, 790] as Vec2,
  ground: [512, 960] as Vec2,
};

/** Posisi efek (dalam ruang rig) untuk lapisan DOM di atas kanvas. */
export const FX_SPOTS = {
  /** Gelembung pikiran saat berpikir (dipotong dari gambar berpikir). */
  pikirTanya: { x: 26, y: 149, w: 133, h: 131 },
  pikirLampu: { x: 850, y: 154, w: 133, h: 140 },
  pikirSeru: { x: 11, y: 408, w: 119, h: 117 },
  pikirTitik: { x: 890, y: 344, w: 103, h: 85 },
  wavesL: { x: 0, y: 470, w: 120, h: 200 },
  wavesR: { x: 904, y: 470, w: 120, h: 200 },
};

/** Konversi koordinat rig ke persen dari kotak kanvas (termasuk padding). */
export function rigToPercent(v: number): number {
  return ((v + RIG_PAD) / (RIG_SIZE + 2 * RIG_PAD)) * 100;
}
