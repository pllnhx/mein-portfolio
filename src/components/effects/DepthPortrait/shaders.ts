export const portraitVertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

export const portraitFragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform sampler2D uDepth;
uniform sampler2D uRoughness;
uniform sampler2D uAlpha;
uniform vec2 uPointer;
uniform vec2 uTexel;
uniform float uParallax;
uniform float uReflection;

void main() {
  // Small overscan prevents exposing the cropped source edges during parallax.
  vec2 baseUv = (vUv - 0.5) / 1.025 + 0.5;
  vec2 uv = baseUv;
  for (int pass = 0; pass < 5; pass++) {
    float depth = texture2D(uDepth, uv).r;
    uv = baseUv - uPointer * vec2(uParallax, uParallax * 0.72) * (depth - 0.32);
  }
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  float alpha = smoothstep(0.08, 0.96, texture2D(uAlpha, uv).r);
  if (alpha < 0.005) discard;

  vec2 imageUv = vec2(uv.x, 1.0 - uv.y);
  // The supplied roughness map isolates the smooth visor from helmet and fabric.
  float roughness = texture2D(uRoughness, uv).r;
  vec2 visor = (imageUv - vec2(0.515, 0.463)) / vec2(0.15, 0.095);
  float region = 1.0 - smoothstep(0.78, 1.08, length(visor));
  float glass = (1.0 - smoothstep(0.08, 0.35, roughness)) * region * alpha;

  float dx = texture2D(uDepth, uv + vec2(uTexel.x, 0.0)).r
           - texture2D(uDepth, uv - vec2(uTexel.x, 0.0)).r;
  float dy = texture2D(uDepth, uv + vec2(0.0, uTexel.y)).r
           - texture2D(uDepth, uv - vec2(0.0, uTexel.y)).r;
  vec3 depthNormal = normalize(vec3(-dx * 9.0, -dy * 9.0, 1.0));
  vec3 visorNormal = normalize(vec3(visor.x * 0.55, -visor.y * 0.55, 1.0));
  vec3 normal = normalize(mix(depthNormal, visorNormal, region));
  vec3 view = normalize(vec3(-uPointer * 0.2, 1.0));
  // At rest, the virtual highlight meets the photographed sun in the upper visor.
  vec3 light = normalize(vec3(uPointer.x * 0.85 + 0.04, uPointer.y * 0.75 + 0.65, 1.25));
  vec3 halfway = normalize(light + view);
  float specular = pow(max(dot(normal, halfway), 0.0), mix(24.0, 150.0, 1.0 - roughness));

  // The photographed reflection shifts locally with the curved glass surface.
  vec2 reflectedUv = uv + glass * uPointer * vec2(0.008, 0.005);
  vec3 photo = texture2D(uPhoto, reflectedUv).rgb;
  float band = exp(-pow((visor.x + visor.y * 0.28 - uPointer.x * 0.55 + 0.3) * 6.5, 2.0));
  vec3 reflection = vec3(0.91, 0.96, 1.0) * (specular * 0.62 + band * 0.065);
  vec3 color = photo + reflection * glass * uReflection;
  gl_FragColor = vec4(min(color, vec3(1.0)), alpha);
}`
