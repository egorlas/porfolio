import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildRoom } from './scene.js';
import { GradeShader } from './shaders.js';
import { loadFonts } from './textures.js';
import { RainSound } from './audio.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const body = document.body;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
const SECTIONS = ['about', 'work', 'products', 'stack', 'contact'];
const EMAIL = 'egorlas1996@gmail.com';

const V = (a) => new THREE.Vector3(...a);
const POSES = {
  intro: { pos: [0.7, 2.2, 5.6], target: [-0.15, 1.3, -1.0] },
  overview: { pos: [0.1, 1.65, 2.75], target: [-0.15, 1.36, -1.0] },
  about: { pos: [-0.1, 1.2, 0.45], target: [-0.15, 1.1, -0.6] },
  work: { pos: [-0.56, 1.3, 0.22], target: [-0.86, 0.96, -0.9] },
  products: { pos: [0.52, 1.18, 0.08], target: [0.66, 0.85, -0.78] },
  stack: { pos: [1.08, 1.62, 0.6], target: [1.32, 1.62, -1.15] },
  contact: { pos: [0.7, 1.12, 0.32], target: [0.8, 0.84, -0.36] }
};

/* ---------- Loader ---------- */
const loader = $('[data-loader]');
const setProgress = (value) => {
  $('[data-loader-bar]').style.transform = `scaleX(${value})`;
  $('[data-loader-pct]').textContent = `${Math.round(value * 100)}%`;
};

const loadImage = (src) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

/* ---------- UI helpers ---------- */
const toast = $('[data-toast]');
let toastTimer;
const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
};

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText(EMAIL);
  } catch {
    const input = document.createElement('textarea');
    input.value = EMAIL;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  showToast('Email copied to clipboard');
};

const downloadCV = () => {
  const link = document.createElement('a');
  link.href = 'assets/ngo-vuong-cv.pdf';
  link.download = 'CV - Ngo Vuong.pdf';
  link.click();
  showToast('Downloading CV…');
};

const updateClock = () => {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  $$('[data-time]').forEach((el) => { el.textContent = `Ha Noi ${time}`; });
};
updateClock();
setInterval(updateClock, 30_000);

async function boot() {
  setProgress(0.08);
  const [, portrait] = await Promise.all([loadFonts(), loadImage('assets/portrait.webp')]);
  setProgress(0.55);

  const room = buildRoom({ portrait });
  const { scene } = room;
  setProgress(0.75);

  /* ---------- Renderer & post ---------- */
  const canvas = $('[data-scene]');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 40);
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: coarse ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.55, 0.85);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  let W = 1;
  let H = 1;

  /* ---------- Camera rig ---------- */
  const rig = {
    pos: V(POSES.intro.pos),
    target: V(POSES.intro.target),
    from: { pos: new THREE.Vector3(), target: new THREE.Vector3() },
    to: { pos: new THREE.Vector3(), target: new THREE.Vector3() },
    t: 1,
    duration: 1.4,
    pose: 'intro'
  };

  const resolvePose = (name) => {
    const pose = POSES[name];
    const pos = V(pose.pos);
    const look = V(pose.target);
    const aspect = W / H;
    const wide = name === 'overview' || name === 'intro';
    if (wide && aspect < 1) {
      // Portrait screens: centre between the lamp and the corkboard so both stay in frame.
      pos.x += 0.3;
      look.x += 0.3;
    }
    const dir = pos.clone().sub(look);
    if (wide) {
      const halfH = THREE.MathUtils.degToRad(camera.fov / 2);
      const halfW = Math.atan(Math.tan(halfH) * aspect);
      const needed = (aspect < 1 ? 1.55 : 1.3) / Math.tan(halfW);
      const length = dir.length();
      if (needed > length) pos.copy(look).addScaledVector(dir.normalize(), needed + (name === 'intro' ? 2.5 : 0));
    } else if (aspect < 1) {
      pos.copy(look).addScaledVector(dir, 1 + (1 - aspect) * 1.1);
    }
    return { pos, target: look };
  };

  const flyTo = (name, { duration = 1.5, instant = false } = {}) => {
    const pose = resolvePose(name);
    rig.pose = name;
    rig.from.pos.copy(rig.pos);
    rig.from.target.copy(rig.target);
    rig.to.pos.copy(pose.pos);
    rig.to.target.copy(pose.target);
    rig.duration = duration;
    rig.t = 0;
    if (instant || reduced) {
      rig.t = 1;
      rig.pos.copy(pose.pos);
      rig.target.copy(pose.target);
    }
  };

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* ---------- View offset (keeps the focused object clear of the panel) ---------- */
  const sheet = $('[data-sheet]');
  const offset = { x: 0, y: 0, tx: 0, ty: 0 };
  const updateOffsetTarget = () => {
    const wide = W > 860;
    if (!body.classList.contains('is-open')) {
      // Overview: nudge the room up and right so the title in the lower-left corner has clear space.
      offset.tx = wide ? -W * 0.025 : 0;
      offset.ty = H * (wide ? 0.07 : 0.05);
      return;
    }
    offset.tx = wide ? sheet.offsetWidth / 2 : 0;
    offset.ty = wide ? 0 : sheet.offsetHeight / 2;
  };

  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    camera.aspect = W / H;
    camera.fov = W / H >= 1.1 ? 40 : 54;
    renderer.setSize(W, H, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(W, H);
    bloom.resolution.set(W * (coarse ? 0.5 : 1), H * (coarse ? 0.5 : 1));
    camera.updateProjectionMatrix();
    updateOffsetTarget();
    if (rig.t >= 1) flyTo(rig.pose, { instant: true });
  };
  window.addEventListener('resize', resize);
  resize();
  rig.pos.copy(resolvePose('intro').pos);
  rig.target.copy(resolvePose('intro').target);

  /* ---------- Markers (DOM buttons that follow 3D anchors) ---------- */
  const markerLayer = $('[data-markers]');
  const markers = room.markers.map((m) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker';
    button.dataset.go = m.section;
    button.innerHTML = `<span class="marker-dot" aria-hidden="true"></span><span class="marker-label">${m.label}</span>`;
    if (m.section === 'cv') button.setAttribute('aria-label', 'Download CV (PDF)');
    markerLayer.appendChild(button);
    return { ...m, button };
  });
  const projected = new THREE.Vector3();
  const placeMarkers = () => {
    markers.forEach((m) => {
      projected.copy(m.anchor).project(camera);
      const visible = projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05;
      m.button.classList.toggle('is-offscreen', !visible);
      const x = (projected.x * 0.5 + 0.5) * W;
      const y = (-projected.y * 0.5 + 0.5) * H;
      if (!m.labelWidth) m.labelWidth = m.button.querySelector('.marker-label').offsetWidth;
      m.button.classList.toggle('is-flip', x + 26 + m.labelWidth > W - 8);
      m.button.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  };

  /* ---------- Sections ---------- */
  const pages = $$('[data-page]');
  const navButtons = $$('.room-nav [data-go]');
  let current = null;
  let returnFocus = null;
  let closeTimer;

  const open = (section, { project, from } = {}) => {
    if (section === 'cv') {
      downloadCV();
      return;
    }
    if (!SECTIONS.includes(section)) return;
    clearTimeout(closeTimer);
    if (!current) returnFocus = from || document.activeElement;
    current = section;
    pages.forEach((page) => { page.hidden = page.dataset.page !== section; });
    sheet.hidden = false;
    sheet.scrollTop = 0;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    body.classList.add('is-open');
    navButtons.forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === section)));
    $$('[data-project]').forEach((el) => el.classList.remove('is-flagged'));
    if (project) {
      const card = $(`[data-project="${project}"]`);
      if (card) {
        card.classList.add('is-flagged');
        requestAnimationFrame(() => { sheet.scrollTop = card.offsetTop - 24; });
      }
    }
    flyTo(section);
    updateOffsetTarget();
    history.replaceState(null, '', `#${section}`);
    const heading = $(`[data-page="${section}"] h2`);
    heading?.focus({ preventScroll: true });
  };

  const close = () => {
    if (!current) return;
    current = null;
    sheet.classList.remove('is-open');
    body.classList.remove('is-open');
    navButtons.forEach((b) => b.setAttribute('aria-current', 'false'));
    closeTimer = setTimeout(() => { if (!current) sheet.hidden = true; }, 500);
    flyTo('overview');
    updateOffsetTarget();
    history.replaceState(null, '', location.pathname + location.search);
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  };

  /* ---------- Actions ---------- */
  const sound = new RainSound();
  const soundButton = $('[data-sound]');
  const toggleSound = async () => {
    const playing = await sound.toggle();
    room.setRadio(playing);
    soundButton.setAttribute('aria-pressed', String(playing));
    soundButton.querySelector('span').textContent = playing ? 'Rain on' : 'Rain off';
    showToast(playing ? 'Rain radio on' : 'Rain radio off');
  };

  const runItem = (item) => {
    if (item.action === 'lamp') {
      room.setLamp(!room.lampOn);
      showToast(room.lampOn ? 'Lamp on' : 'Lamp off. Click it again for light.');
    } else if (item.action === 'sound') {
      toggleSound();
    } else if (item.action === 'cv') {
      downloadCV();
    } else if (item.section) {
      open(item.section, { project: item.project, from: canvas });
    }
  };

  document.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go) {
      event.preventDefault();
      if (go.dataset.go === 'overview') close();
      else open(go.dataset.go, { from: go });
      return;
    }
    if (event.target.closest('[data-copy-email]')) copyEmail();
    if (event.target.closest('[data-download-cv]')) {
      event.preventDefault();
      downloadCV();
    }
    if (event.target.closest('[data-sound]')) toggleSound();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current) {
      event.preventDefault();
      close();
    }
  });

  /* ---------- Pointer: parallax, hover, click ---------- */
  const tooltip = $('[data-tooltip]');
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false, dirty: false, cx: 0, cy: 0 };
  let hovered = null;
  let down = null;

  const pick = (clientX, clientY) => {
    ndc.set((clientX / W) * 2 - 1, -(clientY / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(room.pickables, false)[0];
    return hit?.object.userData.item || null;
  };

  canvas.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / W) * 2 - 1;
    pointer.y = (event.clientY / H) * 2 - 1;
    pointer.cx = event.clientX;
    pointer.cy = event.clientY;
    pointer.inside = event.pointerType === 'mouse';
    pointer.dirty = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
    pointer.dirty = true;
  });
  canvas.addEventListener('pointerdown', (event) => { down = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', (event) => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) return;
    down = null;
    const item = pick(event.clientX, event.clientY);
    if (item) runItem(item);
    else if (current) close();
  });

  const updateHover = () => {
    if (!pointer.dirty) return;
    pointer.dirty = false;
    const item = pointer.inside && rig.pose !== 'intro' ? pick(pointer.cx, pointer.cy) : null;
    if (item !== hovered) {
      hovered = item;
      canvas.style.cursor = item ? 'pointer' : '';
      tooltip.hidden = !item;
      if (item) {
        tooltip.querySelector('strong').textContent = item.label;
        tooltip.querySelector('span').textContent = item.hint;
      }
    }
    if (hovered) tooltip.style.transform = `translate3d(${pointer.cx + 18}px, ${pointer.cy + 18}px, 0)`;
  };

  /* ---------- Frame loop ---------- */
  const clock = new THREE.Clock();
  let elapsed = 0;
  let perfFrames = 0;
  let perfTime = 0;
  let perfChecked = false;

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (rig.t < 1) {
      rig.t = Math.min(1, rig.t + dt / rig.duration);
      const k = ease(rig.t);
      rig.pos.lerpVectors(rig.from.pos, rig.to.pos, k);
      rig.target.lerpVectors(rig.from.target, rig.to.target, k);
    }

    const amp = reduced ? 0 : current ? 0.035 : 0.16;
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
    const breathe = reduced ? 0 : Math.sin(elapsed * 0.35) * 0.012;
    camera.position.set(rig.pos.x + pointer.sx * amp, rig.pos.y - pointer.sy * amp * 0.5 + breathe, rig.pos.z);
    camera.lookAt(rig.target);

    offset.x += (offset.tx - offset.x) * Math.min(1, dt * (reduced ? 60 : 5));
    offset.y += (offset.ty - offset.y) * Math.min(1, dt * (reduced ? 60 : 5));
    if (Math.abs(offset.x) + Math.abs(offset.y) > 0.5) camera.setViewOffset(W, H, offset.x, offset.y, W, H);
    else camera.clearViewOffset();

    updateHover();
    room.items.forEach((item) => {
      const goal = item === hovered ? 1 : 0;
      item.hover += (goal - item.hover) * Math.min(1, dt * 9);
    });
    room.tick(dt, elapsed, reduced);
    grade.uniforms.uTime.value = elapsed;
    placeMarkers();
    composer.render(dt);

    if (!perfChecked && body.classList.contains('is-ready')) {
      perfFrames += 1;
      perfTime += dt;
      if (perfTime > 3) {
        perfChecked = true;
        if (perfFrames / perfTime < 32 && pixelRatio > 1) {
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          resize();
        }
      }
    }
    requestAnimationFrame(frame);
  };

  renderer.compile(scene, camera);
  setProgress(1);

  /* ---------- Intro ---------- */
  requestAnimationFrame(frame);
  loader.classList.add('is-done');
  setTimeout(() => { loader.hidden = true; }, 900);

  const startHash = location.hash.slice(1);
  const finishIntro = () => {
    body.classList.add('is-ready');
    if (SECTIONS.includes(startHash)) open(startHash);
  };

  if (reduced) {
    room.setLamp(true);
    room.setNeon(true);
    flyTo('overview', { instant: true });
    finishIntro();
  } else {
    flyTo('overview', { duration: 3 });
    setTimeout(() => room.setLamp(true), 700);
    setTimeout(() => room.setNeon(true), 1500);
    setTimeout(finishIntro, 2600);
  }
}

boot().catch((error) => {
  console.error(error);
  location.replace('static.html?from=room');
});
