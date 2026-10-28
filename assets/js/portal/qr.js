// Generador de códigos QR en JavaScript puro · Club Hunk Cartagena
// ------------------------------------------------------------------
// Implementa la norma ISO/IEC 18004 en lo necesario para la ficha de emergencia:
//   · modo byte (texto en UTF-8)
//   · corrección de errores nivel M (~15 % del código puede dañarse)
//   · versiones 1 a 10 (21×21 a 57×57 módulos, hasta 213 bytes), elegida automáticamente
//   · máscara elegida por la menor penalización (las 4 reglas de la norma)
//   · Reed-Solomon sobre GF(256) con polinomio primitivo 0x11D
// Salida: SVG con un solo <path> para los módulos oscuros.

// ---------- Tablas de la norma (solo nivel M, versiones 1-10) ----------
// Por versión: [codewords de corrección por bloque, nº bloques grupo 1, datos por bloque g1, nº bloques g2, datos por bloque g2]
const BLOQUES_M = [
  null,
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
];
// Centros de los patrones de alineación por versión.
const ALINEACION = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const VERSION_MAX = 10;
const BITS_NIVEL_M = 0b00; // L=01, M=00, Q=11, H=10

const capacidadDatos = (v) => {
  const [, b1, d1, b2, d2] = BLOQUES_M[v];
  return b1 * d1 + b2 * d2;
};

// ---------- Aritmética en GF(256) ----------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Polinomio generador g(x) = Π (x - α^i), i = 0..grado-1. Coeficientes de mayor a menor grado, sin el 1 líder. */
function generadorRS(grado) {
  let g = [1];
  for (let i = 0; i < grado; i++) {
    const sig = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      sig[j] ^= g[j];
      sig[j + 1] ^= gfMul(g[j], EXP[i]);
    }
    g = sig;
  }
  return g.slice(1);
}

/** Residuo de datos(x)·x^n / g(x): los n codewords de corrección. */
function restoRS(datos, grado) {
  const gen = generadorRS(grado);
  const resto = new Array(grado).fill(0);
  for (const byte of datos) {
    const factor = byte ^ resto.shift();
    resto.push(0);
    for (let i = 0; i < grado; i++) resto[i] ^= gfMul(gen[i], factor);
  }
  return resto;
}

// ---------- Códigos BCH de formato y versión ----------
/** 15 bits de formato (nivel M + máscara), ya con la máscara XOR 0x5412. */
function bitsFormato(mascara) {
  const dato = (BITS_NIVEL_M << 3) | mascara;
  let r = dato;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  return ((dato << 10) | r) ^ 0x5412;
}

/** 18 bits de versión (versiones >= 7). */
function bitsVersion(version) {
  let r = version;
  for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
  return (version << 12) | r;
}

// ---------- Codificación de datos ----------
function codificarTexto(texto) {
  return Array.from(new TextEncoder().encode(String(texto)));
}

/** Elige la versión mínima en la que caben los bytes (modo byte, nivel M). */
function elegirVersion(nBytes) {
  for (let v = 1; v <= VERSION_MAX; v++) {
    const bitsConteo = v <= 9 ? 8 : 16;
    if (4 + bitsConteo + nBytes * 8 <= capacidadDatos(v) * 8) return v;
  }
  throw new Error('El texto es demasiado largo para el código QR (máximo 213 bytes).');
}

/** Flujo de codewords de datos: modo, conteo, bytes, terminador y relleno. */
function codewordsDatos(bytes, version) {
  const bits = [];
  const poner = (valor, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };
  poner(0b0100, 4); // modo byte
  poner(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) poner(b, 8);
  const capBits = capacidadDatos(version) * 8;
  poner(0, Math.min(4, capBits - bits.length)); // terminador
  while (bits.length % 8) bits.push(0);
  const cw = [];
  for (let i = 0; i < bits.length; i += 8) cw.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; cw.length < capBits / 8; pad ^= 0xec ^ 0x11) cw.push(pad);
  return cw;
}

/** Divide en bloques, calcula Reed-Solomon de cada uno e intercala. */
function intercalar(datos, version) {
  const [nEc, b1, d1, b2, d2] = BLOQUES_M[version];
  const bloques = [];
  let k = 0;
  for (let i = 0; i < b1 + b2; i++) {
    const largo = i < b1 ? d1 : d2;
    const d = datos.slice(k, k + largo);
    k += largo;
    bloques.push({ d, ec: restoRS(d, nEc) });
  }
  const salida = [];
  const maxD = Math.max(d1, d2);
  for (let i = 0; i < maxD; i++) for (const b of bloques) if (i < b.d.length) salida.push(b.d[i]);
  for (let i = 0; i < nEc; i++) for (const b of bloques) salida.push(b.ec[i]);
  return salida;
}

// ---------- Matriz ----------
class Matriz {
  constructor(version) {
    this.version = version;
    this.n = version * 4 + 17;
    this.m = Array.from({ length: this.n }, () => new Array(this.n).fill(false)); // m[y][x]
    this.funcion = Array.from({ length: this.n }, () => new Array(this.n).fill(false));
  }

  fijar(x, y, oscuro) {
    this.m[y][x] = oscuro;
    this.funcion[y][x] = true;
  }

  patronesFijos() {
    const n = this.n;
    // Patrones de temporización
    for (let i = 0; i < n; i++) {
      this.fijar(6, i, i % 2 === 0);
      this.fijar(i, 6, i % 2 === 0);
    }
    // Buscadores (con su separador blanco)
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          this.fijar(x, y, dist !== 2 && dist !== 4);
        }
      }
    }
    // Alineación (sin pisar los buscadores)
    const pos = ALINEACION[this.version];
    const ult = pos.length - 1;
    pos.forEach((cy, i) => {
      pos.forEach((cx, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === ult) || (i === ult && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) this.fijar(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    // Reservar zonas de formato (se escriben después) y de versión
    this.escribirFormato(0);
    if (this.version >= 7) {
      const bits = bitsVersion(this.version);
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) === 1;
        const a = n - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this.fijar(a, b, bit);
        this.fijar(b, a, bit);
      }
    }
  }

  escribirFormato(mascara) {
    const n = this.n;
    const bits = bitsFormato(mascara);
    const bit = (i) => ((bits >>> i) & 1) === 1;
    // Copia 1: alrededor del buscador superior izquierdo
    for (let i = 0; i <= 5; i++) this.fijar(8, i, bit(i));
    this.fijar(8, 7, bit(6));
    this.fijar(8, 8, bit(7));
    this.fijar(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.fijar(14 - i, 8, bit(i));
    // Copia 2: repartida entre los otros dos buscadores
    for (let i = 0; i < 8; i++) this.fijar(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.fijar(8, n - 15 + i, bit(i));
    this.fijar(8, n - 8, true); // módulo oscuro fijo
  }

  /** Coloca los codewords en zigzag de dos columnas, de abajo hacia arriba y viceversa. */
  colocarDatos(codewords) {
    const n = this.n;
    const totalBits = codewords.length * 8;
    let i = 0;
    for (let der = n - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5; // salta la columna de temporización
      const subiendo = ((der + 1) & 2) === 0;
      for (let k = 0; k < n; k++) {
        const y = subiendo ? n - 1 - k : k;
        for (let j = 0; j < 2; j++) {
          const x = der - j;
          if (this.funcion[y][x]) continue;
          if (i < totalBits) {
            this.m[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
            i++;
          }
          // Los módulos sobrantes (bits de resto) quedan en blanco = 0.
        }
      }
    }
  }

  aplicarMascara(mascara) {
    const cond = CONDICIONES_MASCARA[mascara];
    for (let y = 0; y < this.n; y++)
      for (let x = 0; x < this.n; x++) if (!this.funcion[y][x] && cond(x, y)) this.m[y][x] = !this.m[y][x];
  }

  /** Penalización según las 4 reglas de la norma (menor es mejor). */
  penalizacion() {
    const n = this.n;
    const m = this.m;
    let p = 0;
    const lineas = [];
    for (let y = 0; y < n; y++) lineas.push(m[y]);
    for (let x = 0; x < n; x++) lineas.push(m.map((fila) => fila[x]));
    for (const l of lineas) {
      // Regla 1: 5 o más módulos seguidos del mismo color
      let corrida = 1;
      for (let i = 1; i <= n; i++) {
        if (i < n && l[i] === l[i - 1]) corrida++;
        else {
          if (corrida >= 5) p += 3 + (corrida - 5);
          corrida = 1;
        }
      }
      // Regla 3: patrón 1:1:3:1:1 con 4 blancos a un lado
      for (let i = 0; i + 11 <= n; i++) {
        const s = l.slice(i, i + 11).map((b) => (b ? 1 : 0)).join('');
        if (s === '10111010000' || s === '00001011101') p += 40;
      }
    }
    // Regla 2: bloques de 2×2 del mismo color
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
      }
    // Regla 4: proporción de módulos oscuros alejada del 50 %
    let oscuros = 0;
    for (const fila of m) for (const b of fila) if (b) oscuros++;
    const pct = (oscuros * 100) / (n * n);
    p += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return p;
  }
}

const CONDICIONES_MASCARA = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/**
 * Genera la matriz QR del texto.
 * @returns {{ version:number, mascara:number, tamano:number, modulos:boolean[][] }}
 */
export function qrMatriz(texto, { mascara: mascaraFija } = {}) {
  const bytes = codificarTexto(texto);
  const version = elegirVersion(bytes.length);
  const codewords = intercalar(codewordsDatos(bytes, version), version);

  const base = new Matriz(version);
  base.patronesFijos();
  base.colocarDatos(codewords);

  let mejor = null;
  const candidatas = mascaraFija === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [mascaraFija];
  for (const mascara of candidatas) {
    const q = new Matriz(version);
    q.m = base.m.map((f) => f.slice());
    q.funcion = base.funcion;
    q.aplicarMascara(mascara);
    q.escribirFormato(mascara);
    const pen = q.penalizacion();
    if (!mejor || pen < mejor.pen) mejor = { q, pen, mascara };
  }
  return { version, mascara: mejor.mascara, tamano: mejor.q.n, modulos: mejor.q.m };
}

const escaparAtributo = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * QR como texto SVG (viewBox en módulos, crispEdges, un solo <path> para los módulos oscuros).
 * @param {string} texto
 * @param {{tamano?:number, color?:string, fondo?:string, margen?:number}} opciones
 */
export function qrSVG(texto, { tamano = 200, color = '#030203', fondo = '#fff', margen = 4 } = {}) {
  const { tamano: n, modulos } = qrMatriz(texto);
  const total = n + margen * 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!modulos[y][x]) {
        x++;
        continue;
      }
      const ini = x;
      while (x < n && modulos[y][x]) x++;
      d += `M${ini + margen} ${y + margen}h${x - ini}v1h-${x - ini}z`;
    }
  }
  const fondoSVG = fondo && fondo !== 'transparent' && fondo !== 'none'
    ? `<rect width="${total}" height="${total}" fill="${escaparAtributo(fondo)}"/>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tamano}" height="${tamano}" viewBox="0 0 ${total} ${total}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="Código QR">` +
    fondoSVG +
    `<path fill="${escaparAtributo(color)}" d="${d}"/></svg>`
  );
}

/** Raíz del sitio: este archivo vive en assets/js/portal/. Funciona en localhost y en GitHub Pages en subcarpeta. */
const RAIZ_SITIO = new URL('../../../', import.meta.url);

/** URL absoluta de la ficha pública de emergencia de un miembro (lo que va en el QR del casco). */
export function urlEmergencia(id) {
  return new URL('portal/emergencia.html?id=' + encodeURIComponent(id), RAIZ_SITIO).href;
}

// Expuesto solo para pruebas automáticas.
export const _interno = { restoRS, bitsFormato, bitsVersion, codewordsDatos, intercalar, elegirVersion, gfMul };
