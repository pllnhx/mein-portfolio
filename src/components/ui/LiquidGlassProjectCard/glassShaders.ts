import { GLASS_GRID } from './glassGeometry.ts'

/** Refraction/dispersion approach adapted from iyinchao/liquid-glass-studio.
 * Copyright (c) 2024 Charles Yin. MIT license in THIRD_PARTY_LICENSE.txt.
 */
export const glassVertexShader = `#version 300 es
precision highp float;
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`

export const glassFragmentShader = `#version 300 es
/* Refraction profile adapted from https://github.com/iyinchao/liquid-glass-studio
MIT License
Copyright (c) 2024 Charles Yin
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
precision highp float;
uniform vec2 uViewSize;
uniform vec2 uResolution;
uniform float uWorldTop;
uniform vec2 uSectionSize;
uniform float uBackgroundOffset;
uniform vec4 uCards[16];
uniform int uCardCount;
uniform float uRadius;
out vec4 fragColor;

// One analytic background is used both outside the panes and in refraction.
vec3 background(vec2 p) {
  p.y += uBackgroundOffset;
  vec2 uv = p / max(uSectionSize, vec2(1.0));
  vec3 color = vec3(0.018, 0.040, 0.180);
  vec2 delta = (uv - vec2(.25, .16)) * vec2(1.5, 1.3);
  float glow = exp(-dot(delta, delta) * 4.0);
  color += vec3(.025, .080, .25) * glow;
  float diagonal = sin((p.x + p.y * .48) / 160.0);
  color += vec3(.018, .035, .095) * (diagonal * .5 + .5);
  vec2 grid = abs(mod(p + ${GLASS_GRID / 2}.0, ${GLASS_GRID}.0) - ${GLASS_GRID / 2}.0);
  float lines = 1.0 - smoothstep(.2, 1.1, min(grid.x, grid.y));
  color += vec3(.10, .16, .32) * lines * .25;
  float sweep = exp(-pow((p.x - p.y * .42 - uSectionSize.x * .38) / 105.0, 2.0));
  color += vec3(.04, .11, .30) * sweep * .52;
  return color;
}

// Rounded-rectangle SDF; screen units are CSS px, so the rim is DPR invariant.
float distanceToCard(vec2 p, vec4 card) {
  vec2 q = abs(p - card.xy - card.zw * .5) - card.zw * .5 + uRadius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}
vec3 blurredBackground(vec2 p) {
  return background(p) * .28 +
    (background(p + vec2(2.2, 0.0)) + background(p - vec2(2.2, 0.0)) +
     background(p + vec2(0.0, 2.2)) + background(p - vec2(0.0, 2.2))) * .18;
}

void main() {
  vec2 point = vec2(gl_FragCoord.x / uResolution.x * uViewSize.x,
    (1.0 - gl_FragCoord.y / uResolution.y) * uViewSize.y + uWorldTop);
  vec3 color = background(point);
  for (int i = 0; i < 16; i++) {
    if (i >= uCardCount) break;
    vec4 card = uCards[i];
    if (any(lessThan(point, card.xy - 2.0)) || any(greaterThan(point, card.xy + card.zw + 2.0))) continue;
    float sdf = distanceToCard(point, card);
    if (sdf > 1.0) continue;
    float inside = 1.0 - smoothstep(-.7, .7, sdf);
    float depth = max(0.0, -sdf);
    vec2 normal = normalize(vec2(
      distanceToCard(point + vec2(.5, 0), card) - distanceToCard(point - vec2(.5, 0), card),
      distanceToCard(point + vec2(0, .5), card) - distanceToCard(point - vec2(0, .5), card)) + vec2(.00001));
    // Snell's-law lens profile from Liquid Glass Studio, confined to the bezel.
    float ratio = clamp(1.0 - depth / 20.0, 0.0, .995);
    float incident = asin(ratio * ratio);
    float transmitted = asin(sin(incident) / 1.45);
    float edgeFactor = -tan(transmitted - incident);
    vec2 offset = -normal * edgeFactor * 15.0;
    vec2 local = (point - card.xy) / card.zw;
    offset += (local - .5) * .8;
    vec3 glass;
    glass.r = blurredBackground(point + offset * 1.035).r;
    glass.g = blurredBackground(point + offset).g;
    glass.b = blurredBackground(point + offset * .965).b;
    // A low translucent tint keeps the blue depth, unlike an opaque white body.
    glass = mix(glass, vec3(.54, .67, .96), .105);
    float fresnel = pow(clamp(1.0 - depth / 11.0, 0.0, 1.0), 3.0);
    // Each DOM pane supplies its own moving spot; shared rim lighting stays calm.
    vec2 light = normalize(vec2(-.65, -.9));
    float glare = pow(abs(dot(normal, light)), 4.0);
    glass += vec3(.72, .84, 1.0) * fresnel * (.12 + glare * .4);
    float broadLight = exp(-dot(local - vec2(.1, -.1), local - vec2(.1, -.1)) * 2.8);
    glass += vec3(.16, .21, .34) * broadLight * .35;
    color = mix(color, glass, inside);
    break;
  }
  fragColor = vec4(color, 1.0);
}`
