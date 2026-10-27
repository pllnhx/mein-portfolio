import {
  ACESFilmicToneMapping, Box3, DirectionalLight, Group, HemisphereLight,
  Line, Material, Mesh, OrthographicCamera, PCFShadowMap, PlaneGeometry,
  PMREMGenerator, Scene, ShadowMaterial, Texture, Vector3, WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createArtTool } from './artToolModels'
import type { ArtToolKind } from './artToolModels'

/** One transparent rendering context; HTML anchors remain the navigation. */
export function mountArtDock(
  canvas: HTMLCanvasElement,
  navigation: HTMLElement,
  onReady: (ready: boolean) => void,
): () => void {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap

  const scene = new Scene()
  const camera = new OrthographicCamera(-400, 400, 150, -150, .1, 1400)
  camera.position.z = 600
  const environment = new RoomEnvironment()
  const pmrem = new PMREMGenerator(renderer)
  const environmentTarget = pmrem.fromScene(environment, .04)
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = .55
  environment.dispose()
  pmrem.dispose()

  const keyLight = new DirectionalLight(0xfff1db, 3.5)
  keyLight.position.set(-180, 320, 500)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 512)
  keyLight.shadow.camera.left = -600
  keyLight.shadow.camera.right = 600
  keyLight.shadow.camera.top = 450
  keyLight.shadow.camera.bottom = -450
  keyLight.shadow.camera.near = .1
  keyLight.shadow.camera.far = 1200
  keyLight.shadow.normalBias = .2
  scene.add(keyLight, new HemisphereLight(0xffffff, 0x9e8c72, 2))

  const shadowPlane = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: .14 }))
  shadowPlane.position.z = -25
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  const links = Array.from(navigation.querySelectorAll<HTMLAnchorElement>('[data-art-tool]'))
  const heights: Record<ArtToolKind, number> = {
    graphite: 133, charcoal: 87, 'colored-pencil': 128, 'flat-brush': 137,
    'palette-knife': 132, fineliner: 118, 'round-brush': 140,
  }
  const tools = links.map((link, index) => {
    const kind = link.dataset.artTool as ArtToolKind
    const model = createArtTool(kind)
    const bounds = new Box3().setFromObject(model)
    const size = bounds.getSize(new Vector3())
    model.position.y -= bounds.min.y
    model.position.x -= (bounds.min.x + bounds.max.x) / 2
    const pivot = new Group()
    pivot.add(model)
    pivot.rotation.z = [-.025, .035, -.02, -.045, .035, .015, .045][index]
    scene.add(pivot)
    return { pivot, link, baseScale: heights[kind] / size.y, x: 0, current: 1, rotation: pivot.rotation.z }
  })

  let disposed = false
  let lost = false
  let frame = 0
  let previousTime = 0
  let pointerX: number | null = null
  let focusedIndex = -1
  let width = 0
  let height = 0
  let pixelRatio = 0
  let compact = false
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const render = (time: number) => {
    frame = 0
    if (disposed || lost || document.hidden) return
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .06) : 1 / 60
    previousTime = time
    const damping = 1 - Math.exp(-delta * 17)
    let unsettled = false

    tools.forEach((tool, index) => {
      const focusedX = focusedIndex >= 0 ? tools[focusedIndex].x : null
      const targetX = pointerX ?? focusedX
      const distance = targetX === null ? Infinity : Math.abs(targetX - tool.x)
      const radius = compact ? 77 : 104
      const magnification = reducedMotion.matches ? 0 : .65 * Math.exp(-((distance / radius) ** 2))
      const target = 1 + magnification
      tool.current = reducedMotion.matches ? target : tool.current + (target - tool.current) * damping
      if (Math.abs(target - tool.current) > .0005) unsettled = true
      else tool.current = target
      const base = tool.baseScale * (compact ? .82 : 1)
      tool.pivot.scale.setScalar(base * tool.current)
      tool.pivot.position.set(tool.x, -height / 2 + (compact ? 55 : 61), 0)
      tool.pivot.rotation.y = (tool.current - 1) * .18 * (index % 2 === 0 ? 1 : -1)
      tool.pivot.rotation.x = (tool.current - 1) * -.055
      tool.pivot.rotation.z = tool.rotation + (targetX === null ? 0 : Math.max(-1, Math.min(1, (tool.x - targetX) / radius)) * (tool.current - 1) * .025)
    })

    renderer.render(scene, camera)
    if (unsettled) schedule()
    else previousTime = 0
  }

  const schedule = () => {
    if (!frame && !disposed && !lost && !document.hidden) frame = requestAnimationFrame(render)
  }

  const measure = () => {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2)
    const resized = width !== rect.width || height !== rect.height || pixelRatio !== nextRatio
    width = rect.width
    height = rect.height
    compact = window.matchMedia('(max-width: 700px)').matches
    if (resized) {
      pixelRatio = nextRatio
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()
      shadowPlane.scale.set(width + 80, height + 80, 1)
    }
    tools.forEach((tool) => {
      const linkRect = tool.link.getBoundingClientRect()
      tool.x = linkRect.left + linkRect.width / 2 - rect.left - width / 2
      tool.pivot.visible = linkRect.right > rect.left && linkRect.left < rect.right
    })
    schedule()
  }

  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const rect = canvas.getBoundingClientRect()
    pointerX = event.clientX - rect.left - width / 2
    schedule()
  }
  const leave = () => { pointerX = null; schedule() }
  const focus = () => {
    pointerX = null
    focusedIndex = links.findIndex((link) => link === document.activeElement)
    schedule()
  }
  const blur = () => { focusedIndex = -1; schedule() }
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
    } else measure()
  }
  const contextLost = (event: Event) => {
    event.preventDefault()
    lost = true
    cancelAnimationFrame(frame)
    frame = 0
    onReady(false)
  }
  const contextRestored = () => {
    lost = false
    measure()
    onReady(true)
  }

  navigation.addEventListener('pointermove', move)
  navigation.addEventListener('pointerleave', leave)
  navigation.addEventListener('focusin', focus)
  navigation.addEventListener('focusout', blur)
  navigation.addEventListener('scroll', measure, { passive: true })
  canvas.addEventListener('webglcontextlost', contextLost)
  canvas.addEventListener('webglcontextrestored', contextRestored)
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('resize', measure, { passive: true })
  reducedMotion.addEventListener('change', schedule)
  const observer = new ResizeObserver(measure)
  observer.observe(navigation)
  measure()
  onReady(true)

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
    navigation.removeEventListener('pointermove', move)
    navigation.removeEventListener('pointerleave', leave)
    navigation.removeEventListener('focusin', focus)
    navigation.removeEventListener('focusout', blur)
    navigation.removeEventListener('scroll', measure)
    canvas.removeEventListener('webglcontextlost', contextLost)
    canvas.removeEventListener('webglcontextrestored', contextRestored)
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('resize', measure)
    reducedMotion.removeEventListener('change', schedule)

    const materials = new Set<Material>()
    const textures = new Set<Texture>()
    const geometries = new Set<Mesh['geometry']>()
    scene.traverse((object) => {
      if (!(object instanceof Mesh) && !(object instanceof Line)) return
      geometries.add(object.geometry)
      const list = Array.isArray(object.material) ? object.material : [object.material]
      list.forEach((material) => {
        materials.add(material)
        Object.values(material).forEach((value) => { if (value instanceof Texture) textures.add(value) })
      })
    })
    geometries.forEach((geometry) => geometry.dispose())
    textures.forEach((texture) => texture.dispose())
    materials.forEach((material) => material.dispose())
    environmentTarget.dispose()
    keyLight.shadow.dispose()
    renderer.dispose()
  }
}
