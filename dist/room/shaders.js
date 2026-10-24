import * as THREE from 'three';

const HASH = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Night skyline seen through the window: three layers of buildings, lit windows, a moon and falling rain.
export function createCityMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      ${HASH}

      void main() {
        vec2 uv = vUv;
        vec3 sky = mix(vec3(0.075, 0.05, 0.09), vec3(0.012, 0.018, 0.05), smoothstep(0.05, 0.95, uv.y));
        sky += vec3(0.32, 0.11, 0.07) * pow(1.0 - uv.y, 5.0) * 0.7;

        vec2 moonPos = vec2(0.66, 0.78);
        float moonDist = length((uv - moonPos) * vec2(1.33, 1.0));
        sky += vec3(0.75, 0.8, 0.95) * smoothstep(0.045, 0.04, moonDist);
        sky += vec3(0.2, 0.25, 0.4) * exp(-moonDist * 9.0) * 0.5;

        vec3 color = sky;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float cols = 22.0 - fi * 7.0;
          float x = uv.x * cols + fi * 13.7;
          float id = floor(x);
          float h = 0.14 + hash(vec2(id, fi)) * (0.42 - fi * 0.07);
          if (uv.y < h) {
            vec3 bcol = mix(vec3(0.045, 0.05, 0.085), vec3(0.012, 0.014, 0.024), fi / 2.0);
            vec2 wuv = vec2(fract(x) * 5.0, uv.y * (70.0 - fi * 16.0));
            vec2 wid = floor(wuv);
            vec2 wf = fract(wuv);
            float inWin = step(0.28, wf.x) * step(wf.x, 0.72) * step(0.3, wf.y) * step(wf.y, 0.72);
            float edge = step(1.0, wid.x) * step(wid.x, 3.0) * step(uv.y, h - 0.02);
            float lit = step(0.7, hash(wid + id * 7.3 + fi * 31.0));
            float flick = step(0.15, hash(vec2(id + wid.y, floor(uTime * 0.15 + hash(wid) * 10.0))));
            vec3 wcol = mix(vec3(1.0, 0.62, 0.28), vec3(0.55, 0.75, 1.0), step(0.75, hash(wid + 3.1)));
            bcol += wcol * inWin * edge * lit * flick * (0.85 - fi * 0.2);
            color = mix(bcol, sky, 0.38 - fi * 0.17);
          }
        }

        float rain = 0.0;
        for (int k = 0; k < 2; k++) {
          float fk = float(k);
          float sc = 90.0 + fk * 70.0;
          vec2 p = vec2(uv.x * sc + uv.y * 6.0, uv.y * (2.5 + fk) + uTime * (2.2 + fk * 0.9));
          float col = floor(p.x);
          float seg = fract(p.y + hash(vec2(col, fk)) * 10.0);
          float line = 1.0 - smoothstep(0.0, 0.12, abs(fract(p.x) - 0.5));
          rain += step(0.8, hash(vec2(col, fk + 5.0))) * smoothstep(0.0, 0.05, seg) * smoothstep(0.3, 0.05, seg) * line;
        }
        color += vec3(0.45, 0.5, 0.65) * rain * 0.16;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    fog: false,
    toneMapped: true
  });
}

// Droplets on the glass: static beads that fade in and out, plus drops that slide down with a trail.
export function createRainGlassMaterial(aspect) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAspect: { value: aspect } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAspect;
      varying vec2 vUv;
      ${HASH}

      float beads(vec2 uv, float t, float scale) {
        vec2 p = uv * scale;
        vec2 id = floor(p);
        vec2 f = fract(p) - 0.5;
        float h = hash(id);
        vec2 o = vec2(h - 0.5, fract(h * 13.1) - 0.5) * 0.6;
        float size = 0.05 + 0.09 * fract(h * 7.7);
        float d = length(f - o);
        float life = sin(t * 0.4 + h * 6.283) * 0.5 + 0.5;
        float ring = smoothstep(size, size * 0.5, d) - smoothstep(size * 0.55, 0.0, d) * 0.55;
        return ring * step(0.45, h) * life;
      }

      float sliders(vec2 uv, float t) {
        float cols = 11.0;
        float x = uv.x * cols;
        float id = floor(x);
        float h = hash(vec2(id, 2.0));
        float y = fract(-t * (0.05 + h * 0.09) + h * 3.0) * 1.3 - 0.15;
        float wobble = sin(uv.y * 24.0 + h * 10.0) * 0.07;
        vec2 lp = vec2(fract(x) - 0.5 - wobble, uv.y);
        float k = cols / uAspect;
        float drop = smoothstep(0.16, 0.06, length(vec2(lp.x, (lp.y - y) * k)));
        float trail = smoothstep(0.05, 0.0, abs(lp.x)) * step(y, lp.y) * smoothstep(y + 0.3, y, lp.y) * 0.45;
        return (drop + trail) * step(0.4, h);
      }

      void main() {
        vec2 auv = vUv * vec2(uAspect, 1.0);
        float a = beads(auv, uTime, 16.0) + beads(auv + 3.1, uTime * 1.3, 30.0) * 0.6 + sliders(vUv, uTime);
        a = clamp(a, 0.0, 1.0);
        vec3 col = mix(vec3(0.5, 0.58, 0.8), vec3(1.0, 0.8, 0.6), vUv.y * 0.35);
        gl_FragColor = vec4(col, a * 0.32 + 0.035);
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: false
  });
}

// Final grade: soft vignette and film grain, applied in linear space before the output pass.
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.85 },
    uGrain: { value: 0.035 }
  },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;
    ${HASH}

    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.2, length(d * vec2(1.1, 1.25)));
      c.rgb *= mix(1.0, v, uVignette);
      float n = hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5;
      c.rgb += n * uGrain * (0.4 + c.rgb);
      gl_FragColor = c;
    }
  `
};
