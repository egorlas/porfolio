import * as THREE from 'three';

export const FONTS = {
  display: '"Archivo", "Arial Narrow", Arial, sans-serif',
  mono: '"IBM Plex Mono", "Consolas", monospace',
  crt: '"VT323", "Consolas", monospace',
  hand: '"Caveat", "Comic Sans MS", cursive'
};

export async function loadFonts() {
  if (!document.fonts) return;
  const faces = [
    `40px ${FONTS.crt}`,
    `700 40px ${FONTS.mono}`,
    `500 40px ${FONTS.mono}`,
    `800 40px ${FONTS.display}`,
    `700 40px ${FONTS.hand}`
  ];
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([Promise.all(faces.map((face) => document.fonts.load(face))), timeout]);
}

const toTexture = (canvas, { repeat } = {}) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
};

const makeCanvas = (w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
};

const rand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export function plankTexture() {
  const [canvas, ctx] = makeCanvas(512, 512);
  const r = rand(7);
  const plank = 512 / 4;
  for (let i = 0; i < 4; i++) {
    const tone = 30 + r() * 12;
    ctx.fillStyle = `rgb(${tone + 14}, ${tone + 4}, ${tone - 6})`;
    ctx.fillRect(0, i * plank, 512, plank);
    for (let g = 0; g < 26; g++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`;
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      const y = i * plank + r() * plank;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + r() * 8 - 4, 340, y + r() * 8 - 4, 512, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, i * plank, 512, 3);
    ctx.fillRect(((i * 197) % 512), i * plank, 3, plank);
  }
  return toTexture(canvas, { repeat: [3, 3] });
}

export function corkTexture() {
  const [canvas, ctx] = makeCanvas(512, 384);
  ctx.fillStyle = '#9a6a3e';
  ctx.fillRect(0, 0, 512, 384);
  const r = rand(11);
  for (let i = 0; i < 5200; i++) {
    const shade = r() > 0.5 ? 'rgba(60,32,12,' : 'rgba(210,160,105,';
    ctx.fillStyle = `${shade}${0.15 + r() * 0.35})`;
    ctx.fillRect(r() * 512, r() * 384, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  return toTexture(canvas);
}

export function rugTexture() {
  const [canvas, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#3b1219';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#c9a76a';
  ctx.lineWidth = 6;
  ctx.strokeRect(22, 22, 468, 276);
  ctx.strokeStyle = 'rgba(201,167,106,.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, 436, 244);
  ctx.fillStyle = 'rgba(201,167,106,.35)';
  for (let x = 70; x < 450; x += 38) {
    ctx.save();
    ctx.translate(x, 160);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
  }
  const r = rand(3);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${r() * 0.18})`;
    ctx.fillRect(r() * 512, r() * 320, 2, 2);
  }
  return toTexture(canvas);
}

// Front face of a standing binder: colored cover with a paper label and vertical text.
export function binderSpine({ color, company, years }) {
  const [canvas, ctx] = makeCanvas(128, 544);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 544);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(0, 0, 10, 544);
  ctx.fillStyle = '#f1ebdf';
  ctx.fillRect(22, 60, 84, 330);
  ctx.save();
  ctx.translate(64, 225);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#141214';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 40px ${FONTS.display}`;
  ctx.fillText(company.toUpperCase(), 0, -10, 300);
  ctx.font = `500 22px ${FONTS.mono}`;
  ctx.fillText(years, 0, 24, 300);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.arc(64, 470, 18, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

// Spine of a VHS tape lying flat: black plastic with a hand-labelled sticker.
export function tapeSpine({ title, tag, index }) {
  const [canvas, ctx] = makeCanvas(640, 96);
  ctx.fillStyle = '#121112';
  ctx.fillRect(0, 0, 640, 96);
  ctx.fillStyle = '#efe9dc';
  ctx.fillRect(40, 14, 560, 68);
  ctx.fillStyle = '#ff2148';
  ctx.fillRect(40, 14, 14, 68);
  ctx.fillStyle = '#141214';
  ctx.textBaseline = 'middle';
  ctx.font = `700 46px ${FONTS.hand}`;
  ctx.fillText(title, 72, 50, 380);
  ctx.font = `500 20px ${FONTS.mono}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${index} · ${tag.toUpperCase()}`, 588, 50);
  return toTexture(canvas);
}

export function stickyNote({ color, title, lines }) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,.12)');
  grad.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#1b1718';
  ctx.font = `700 46px ${FONTS.hand}`;
  ctx.fillText(title, 20, 66, 220);
  ctx.font = `700 31px ${FONTS.hand}`;
  lines.forEach((line, i) => ctx.fillText(line, 20, 118 + i * 38, 220));
  return toTexture(canvas);
}

export function polaroid(image) {
  const [canvas, ctx] = makeCanvas(440, 540);
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, 440, 540);
  if (image) {
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 28, 28, 384, 384);
  } else {
    ctx.fillStyle = '#2a2224';
    ctx.fillRect(28, 28, 384, 384);
  }
  ctx.fillStyle = '#26202a';
  ctx.font = `700 48px ${FONTS.hand}`;
  ctx.textAlign = 'center';
  ctx.fillText('Vuong · Ha Noi', 220, 480);
  return toTexture(canvas);
}

export function floppyTop() {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#c4122f';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#b9bcc2';
  ctx.fillRect(64, 0, 128, 82);
  ctx.fillStyle = '#7d8087';
  ctx.fillRect(140, 14, 26, 56);
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(30, 112, 196, 128);
  ctx.fillStyle = '#141214';
  ctx.font = `800 34px ${FONTS.display}`;
  ctx.fillText('CV.PDF', 46, 162);
  ctx.font = `500 17px ${FONTS.mono}`;
  ctx.fillText('NGO VUONG · 2026', 46, 196);
  ctx.fillText('1.44 MB  ↓', 46, 222);
  return toTexture(canvas);
}

export function speakerGrille() {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#2b2627';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#100d0e';
  for (let y = 14; y < 256; y += 16) {
    for (let x = 14 + ((y / 16) % 2) * 8; x < 256; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return toTexture(canvas);
}

export function neonSign(text) {
  const [canvas, ctx] = makeCanvas(1024, 280);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 190px ${FONTS.hand}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 33, 72, 0.9)';
  ctx.shadowColor = '#ff2148';
  [42, 24, 10].forEach((blur) => {
    ctx.shadowBlur = blur;
    ctx.lineWidth = 12;
    ctx.strokeText(text, 512, 150);
  });
  ctx.shadowBlur = 0;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffd9df';
  ctx.strokeText(text, 512, 150);
  return toTexture(canvas);
}

export function softDot() {
  const [canvas, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas);
}

// Amber CRT terminal that types a short script on loop. Only redraws when something on it changes.
export function createTerminal() {
  const W = 1024;
  const H = 768;
  const [canvas, ctx] = makeCanvas(W, H);
  const texture = toTexture(canvas);
  const PROMPT = 'egorlas@hanoi:~$ ';
  const script = [
    { cmd: 'whoami' },
    { out: 'Vuong Ngo · Product Engineer, AI Product Builder' },
    { cmd: 'cat motto.txt' },
    { out: 'I build products people keep using.' },
    { cmd: 'ls ~/products' },
    { out: 'class-management  boxtravel  carie  tree-shop' },
    { cmd: 'uptime' },
    { out: '9 years shipping · ~2M users reached' },
    { cmd: 'open ./room --click-anything' }
  ];
  const amber = '#ffb347';
  let step = 0;
  let chars = 0;
  let wait = 0.8;
  let last = '';
  let boost = 0;

  const lines = () => {
    const out = [];
    for (let i = 0; i < step && i < script.length; i++) {
      const s = script[i];
      out.push(s.cmd ? PROMPT + s.cmd : s.out);
    }
    const current = script[step];
    if (current?.cmd) out.push(PROMPT + current.cmd.slice(0, chars));
    else if (step >= script.length) out.push(PROMPT);
    return out;
  };

  const draw = (cursorOn, clock) => {
    const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, '#24140a');
    g.addColorStop(1, '#070302');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = amber;
    ctx.fillRect(48, 44, W - 96, 46);
    ctx.fillStyle = '#1a0d04';
    ctx.font = `38px ${FONTS.crt}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('VN-TERM 2.6 · PORTFOLIO', 64, 68);
    ctx.textAlign = 'right';
    ctx.fillText(`HA NOI ${clock}`, W - 64, 68);
    ctx.textAlign = 'left';

    ctx.fillStyle = amber;
    ctx.shadowColor = amber;
    ctx.shadowBlur = 14;
    ctx.font = `44px ${FONTS.crt}`;
    const shown = lines();
    shown.forEach((line, i) => ctx.fillText(line, 64, 140 + i * 56, W - 128));
    if (cursorOn) {
      const lastLine = shown[shown.length - 1] || '';
      const x = 64 + Math.min(ctx.measureText(lastLine).width, W - 160);
      ctx.fillRect(x + 4, 140 + (shown.length - 1) * 56 - 20, 22, 40);
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
    texture.needsUpdate = true;
  };

  const clockText = () => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());

  return {
    texture,
    get boost() { return boost; },
    set boost(v) { boost = v; },
    update(dt, elapsed, reduced) {
      if (reduced) {
        step = script.length;
      } else {
        wait -= dt;
        if (wait <= 0) {
          const current = script[step];
          if (!current) {
            step = 0; chars = 0; wait = 0.6;
          } else if (current.cmd && chars < current.cmd.length) {
            chars += 1;
            wait = 0.045 + Math.random() * 0.06;
          } else {
            step += 1;
            chars = 0;
            wait = script[step]?.cmd ? 0.9 : 0.35;
            if (step >= script.length) wait = 6;
          }
        }
      }
      const cursorOn = Math.floor(elapsed * 2) % 2 === 0;
      const clock = clockText();
      const key = `${step}:${chars}:${cursorOn}:${clock}`;
      if (key !== last) {
        last = key;
        draw(cursorOn, clock);
      }
    }
  };
}
