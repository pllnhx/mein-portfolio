import * as THREE from 'three'
import type { ArtToolId } from '../../../data/art'

export type ArtToolKind = ArtToolId

const heights: Record<ArtToolKind, number> = {
  graphite: 4.15,
  charcoal: 3.05,
  'colored-pencil': 4.05,
  'flat-brush': 4.2,
  'palette-knife': 3.85,
  fineliner: 3.85,
  'round-brush': 4.2,
}

function random(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

type Grain = 'wood' | 'charcoal' | 'bristle' | 'lacquer'

/** Local material maps keep these models independent of network/model loaders. */
function grainTexture(kind: Grain, seed = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const context = canvas.getContext('2d')!
  const next = random(seed)
  const image = context.createImageData(canvas.width, canvas.height)

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const offset = (y * canvas.width + x) * 4
      const noise = next()
      const thread = Math.sin(x * 1.86 + Math.sin(y * 0.018) * 0.8)
      const growth = Math.sin(x * 0.21 + Math.sin(y * 0.011) * 2.6)
      let r: number
      let g: number
      let b: number
      if (kind === 'wood') {
        const grain = thread * 7 + growth * 11 + noise * 12
        r = 227 + grain
        g = 208 + grain * 0.9
        b = 175 + grain * 0.7
      } else if (kind === 'charcoal') {
        const pore = noise > 0.88 ? 10 : 0
        const grain = noise * 17 + thread * 2 - pore
        r = 22 + grain
        g = 22 + grain
        b = 21 + grain
      } else if (kind === 'bristle') {
        const grain = thread * 22 + noise * 16
        r = 143 + grain
        g = 94 + grain * 0.8
        b = 45 + grain * 0.5
      } else {
        const grain = noise * 9 + thread * 1.7
        r = 238 + grain
        g = 238 + grain
        b = 238 + grain
      }
      image.data[offset] = r
      image.data[offset + 1] = g
      image.data[offset + 2] = b
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function texturedMaterial(kind: Grain, color: THREE.ColorRepresentation = '#ffffff', seed = 1) {
  const map = grainTexture(kind, seed)
  const bumpMap = map.clone()
  bumpMap.colorSpace = THREE.NoColorSpace
  bumpMap.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: kind === 'charcoal' ? 0.035 : kind === 'bristle' ? 0.012 : 0.003,
    color,
    roughness: kind === 'charcoal' ? 0.98 : kind === 'lacquer' ? 0.32 : 0.63,
    metalness: kind === 'lacquer' ? 0.04 : 0,
  })
}

function metal(color: THREE.ColorRepresentation = '#d5d5cf', roughness = 0.24) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.88, roughness })
}

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  y: number,
  x = 0,
  z = 0,
) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function cylinder(
  group: THREE.Group,
  material: THREE.Material,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  y: number,
  segments = 24,
) {
  return addMesh(group, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, y)
}

function lathe(group: THREE.Group, material: THREE.Material, profile: [number, number][], segments = 32) {
  return addMesh(group, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material, 0)
}

function printedLabel(group: THREE.Group, text: string, color: string, y: number, z: number, height = 1.1) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 768
  const context = canvas.getContext('2d')!
  context.translate(64, 384)
  context.rotate(-Math.PI / 2)
  context.fillStyle = color
  context.font = '500 37px Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  addMesh(group, new THREE.PlaneGeometry(0.13, height), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), y, 0, z)
}

function pencil(colored: boolean) {
  const group = new THREE.Group()
  const lacquer = texturedMaterial('lacquer', colored ? '#1e4286' : '#24251f', 21)
  const wood = texturedMaterial('wood', '#f4d6a5', 17)
  const core = new THREE.MeshStandardMaterial({ color: colored ? '#3d5ea8' : '#2b2c2a', roughness: 0.64, metalness: colored ? 0 : 0.16 })

  cylinder(group, new THREE.MeshStandardMaterial({ color: colored ? '#233e6b' : '#493a23', roughness: 0.4 }), 0.101, 0.095, 0.17, 0.085, 24)
  cylinder(group, new THREE.MeshStandardMaterial({ color: '#e3dfd1', roughness: 0.42 }), 0.105, 0.105, 0.037, 0.191, 24)
  const shaft = cylinder(group, lacquer, 0.105, 0.105, 3.22, 1.82, 6)
  shaft.rotation.y = Math.PI / 6
  cylinder(group, wood, 0.024, 0.105, 0.51, 3.685, 6).rotation.y = Math.PI / 6
  cylinder(group, core, 0.001, 0.025, 0.21, 4.045, 10)
  printedLabel(group, colored ? 'COLOUR  ·  ULTRAMARINE' : 'GRAPHITE  ·  2B', '#e9d9ad', 1.58, 0.094, 1.28)
  printedLabel(group, colored ? 'B' : '2B', '#e5dfcf', 0.42, 0.096, 0.19)
  return group
}

function charcoal() {
  const group = new THREE.Group()
  const geometry = new THREE.CylinderGeometry(0.162, 0.17, 3.05, 11, 30)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    // Coherent displacement preserves the cylinder seam while breaking the silhouette.
    const rough = Math.sin(x * 53 + y * 31 + z * 47) * 0.009 + Math.sin(y * 8 + x * 20) * 0.01
    const radius = Math.hypot(x, z)
    if (radius > 0.001) {
      positions.setXYZ(i, x * (1 + rough / radius) + Math.sin(y * 2.8) * 0.023, y + Math.sin(x * 28 + z * 37) * 0.017, z * (1 + rough / radius))
    }
  }
  geometry.computeVertexNormals()
  addMesh(group, geometry, texturedMaterial('charcoal', '#ffffff', 24), 1.525)
  return group
}

function brushHandle(group: THREE.Group, top = 2.68) {
  const wood = texturedMaterial('wood', '#fff9ed', 8)
  lathe(group, wood, [[0, 0], [0.04, 0.015], [0.075, 0.07], [0.078, 0.38], [0.071, 0.8], [0.09, 1.22], [0.077, 1.7], [0.062, 2.12], [0.074, top], [0, top]])
  printedLabel(group, 'ATELIER  ·  06', '#7d6442', 1.27, 0.085, 0.66)
}

function roundBrush() {
  const group = new THREE.Group()
  brushHandle(group, 2.85)
  const silver = metal()
  lathe(group, silver, [[0.075, 2.57], [0.09, 2.59], [0.092, 2.83], [0.105, 2.9], [0.109, 3.11], [0.103, 3.13]])
  cylinder(group, metal('#9d9d93', 0.36), 0.096, 0.096, 0.015, 2.67)
  cylinder(group, silver, 0.111, 0.111, 0.018, 3.1)
  const bristles = texturedMaterial('bristle', '#c6a276', 17)
  lathe(group, bristles, [[0.1, 3.105], [0.13, 3.23], [0.137, 3.4], [0.124, 3.63], [0.095, 3.86], [0.048, 4.08], [0.003, 4.2]])

  // Fine fibers follow the tuft surface rather than reading as a solid plastic cone.
  const strands: number[] = []
  const next = random(18)
  for (let i = 0; i < 68; i++) {
    const angle = (i / 68) * Math.PI * 2
    const length = 0.88 + next() * 0.13
    for (let j = 0; j < 6; j++) {
      const t0 = j / 6
      const t1 = (j + 1) / 6
      for (const t of [t0, t1]) {
        const y = 3.14 + t * length
        const radius = (0.102 + Math.sin(t * Math.PI) * 0.06) * (1 - t * 0.9)
        strands.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      }
    }
  }
  const fiberGeometry = new THREE.BufferGeometry()
  fiberGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strands, 3))
  group.add(new THREE.LineSegments(fiberGeometry, new THREE.LineBasicMaterial({ color: '#a38454', transparent: true, opacity: 0.42 })))
  return group
}

function flatBrush() {
  const group = new THREE.Group()
  brushHandle(group, 2.65)
  const silver = metal()
  const ferruleShape = new THREE.Shape()
  ferruleShape.moveTo(-0.105, 2.47)
  ferruleShape.lineTo(0.105, 2.47)
  ferruleShape.lineTo(0.21, 2.98)
  ferruleShape.lineTo(-0.21, 2.98)
  ferruleShape.closePath()
  const ferrule = new THREE.ExtrudeGeometry(ferruleShape, { depth: 0.105, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.009, bevelSegments: 2, steps: 1 })
  addMesh(group, ferrule, silver, 0, 0, -0.0525)
  addMesh(group, new THREE.BoxGeometry(0.395, 0.016, 0.127), metal('#989b94', 0.3), 2.88)
  addMesh(group, new THREE.BoxGeometry(0.275, 0.014, 0.116), silver, 2.59)

  const next = random(39)
  const tuft = new THREE.Shape()
  tuft.moveTo(-0.194, 2.97)
  tuft.lineTo(0.194, 2.97)
  for (let i = 0; i <= 26; i++) {
    tuft.lineTo(0.255 - (i / 26) * 0.51, 4.18 - next() * 0.045)
  }
  tuft.lineTo(-0.194, 2.97)
  const tuftGeometry = new THREE.ExtrudeGeometry(tuft, { depth: 0.078, bevelEnabled: false, steps: 1 })
  const uv = tuftGeometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.26) / 0.52, (uv.getY(i) - 2.97) / 1.22)
  addMesh(group, tuftGeometry, texturedMaterial('bristle', '#e8c48a', 34), 0, 0, -0.039)

  const pigment = new THREE.Shape()
  pigment.moveTo(-0.25, 3.98)
  for (let i = 0; i <= 24; i++) pigment.lineTo(-0.25 + i / 24 * 0.5, 3.98 + next() * 0.075)
  pigment.lineTo(0.255, 4.17)
  for (let i = 0; i <= 24; i++) pigment.lineTo(0.255 - i / 24 * 0.51, 4.19 - next() * 0.04)
  pigment.closePath()
  addMesh(group, new THREE.ExtrudeGeometry(pigment, { depth: 0.085, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#d26b39', roughness: 0.49 }), 0, 0, -0.0425)
  return group
}

function paletteKnife() {
  const group = new THREE.Group()
  const handle = lathe(group, texturedMaterial('wood', '#a86335', 12), [[0, 0], [0.07, 0.025], [0.115, 0.12], [0.14, 0.55], [0.145, 1.06], [0.12, 1.7], [0.065, 2.03], [0, 2.07]])
  handle.scale.z = 0.6
  const silver = metal('#c6cbc9', 0.23)
  for (const y of [0.34, 1.61]) {
    const rivet = addMesh(group, new THREE.SphereGeometry(0.031, 12, 8), metal('#b5a785', 0.35), y, 0, 0.087)
    rivet.scale.z = 0.3
  }
  const tang = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.97, 0),
    new THREE.Vector3(0, 2.16, 0),
    new THREE.Vector3(0, 2.34, 0.09),
    new THREE.Vector3(0, 2.55, 0.11),
  ])
  addMesh(group, new THREE.TubeGeometry(tang, 16, 0.025, 8, false), silver, 0)
  const bladeShape = new THREE.Shape()
  bladeShape.moveTo(0, 2.48)
  bladeShape.quadraticCurveTo(0.055, 2.62, 0.13, 2.85)
  bladeShape.quadraticCurveTo(0.26, 3.12, 0.23, 3.25)
  bladeShape.quadraticCurveTo(0.11, 3.58, 0, 3.84)
  bladeShape.quadraticCurveTo(-0.11, 3.58, -0.23, 3.25)
  bladeShape.quadraticCurveTo(-0.26, 3.12, -0.13, 2.85)
  bladeShape.quadraticCurveTo(-0.055, 2.62, 0, 2.48)
  const blade = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.01, bevelSegments: 2, curveSegments: 18 })
  addMesh(group, blade, silver, 0, 0, 0.1)
  // A subtle central ridge catches the light on the very thin steel blade.
  const ridge = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.56, 0.126), new THREE.Vector3(0, 3.76, 0.126)])
  group.add(new THREE.Line(ridge, new THREE.LineBasicMaterial({ color: '#e6e7de', transparent: true, opacity: 0.45 })))
  return group
}

function fineliner() {
  const group = new THREE.Group()
  const black = texturedMaterial('lacquer', '#242623', 39)
  const grip = new THREE.MeshStandardMaterial({ color: '#222522', roughness: 0.58 })
  cylinder(group, black, 0.104, 0.104, 2.74, 1.46)
  cylinder(group, grip, 0.115, 0.108, 0.18, 0.09)
  cylinder(group, black, 0.106, 0.106, 0.05, 0.23)
  cylinder(group, metal('#858781', 0.5), 0.106, 0.106, 0.012, 0.31)
  cylinder(group, grip, 0.083, 0.104, 0.37, 3.015)
  cylinder(group, black, 0.07, 0.083, 0.27, 3.335)
  for (let i = 0; i < 7; i++) cylinder(group, black, 0.086, 0.086, 0.013, 2.89 + i * 0.039)
  cylinder(group, metal('#d5d6c6', 0.33), 0.026, 0.04, 0.215, 3.577)
  cylinder(group, new THREE.MeshStandardMaterial({ color: '#292d29', roughness: 0.69 }), 0.007, 0.012, 0.12, 3.745)
  printedLabel(group, 'PIGMENT LINER  ·  0.3', '#c4c6bb', 1.58, 0.106, 1.31)
  printedLabel(group, '03', '#d3d2c6', 2.58, 0.106, 0.24)
  return group
}

/**
 * Tool pivot is always the bottom at y=0; its tip points along positive y.
 * Individual meshes share a root so the dock can magnify without moving the base.
 */
export function createArtTool(kind: ArtToolKind): THREE.Group {
  const factory: Record<ArtToolKind, () => THREE.Group> = {
    graphite: () => pencil(false),
    charcoal,
    'colored-pencil': () => pencil(true),
    'flat-brush': flatBrush,
    'palette-knife': paletteKnife,
    fineliner,
    'round-brush': roundBrush,
  }
  const content = factory[kind]()
  const bounds = new THREE.Box3().setFromObject(content)
  const size = bounds.getSize(new THREE.Vector3())
  const scale = heights[kind] / size.y
  content.scale.setScalar(scale)
  content.position.set(-(bounds.min.x + bounds.max.x) * 0.5 * scale, -bounds.min.y * scale, 0)
  const root = new THREE.Group()
  root.name = `art-tool-${kind}`
  root.userData.height = heights[kind]
  root.userData.toolKind = kind
  root.add(content)
  return root
}
