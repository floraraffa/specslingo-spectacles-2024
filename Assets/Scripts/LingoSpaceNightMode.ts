/** Night mode: while whisper is on, a calm dome of twinkling stars plus a
 * crescent moon wraps the wearer — a focus cocoon for quiet practice.
 * Spectacles' waveguide is additive (black = transparent), so the room cannot
 * be darkened by the Lens; the stars, moon and hushed audio carry the night
 * feeling instead. Pure decoration: no interactables, nothing to crash SIK. */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"

const STAR_TEXTURE = requireAsset("../LingoDesign/stars.png") as Texture
const MOON_TEXTURE = requireAsset("../Icons/moon.png") as Texture
const VEIL_TEXTURE = requireAsset("../Icons/veil.png") as Texture

const STAR_COUNT = 30
// Behind every UI band (cards/HUD start at 6): the sky never covers content.
const SKY_ORDER = 1
// The veil paints below even the stars: pure backdrop.
const VEIL_ORDER = 0
// Deep indigo, mostly transparent: in captures it genuinely darkens the room
// behind the UI; through the waveguide it reads as a soft violet night haze.
const VEIL_COLOR = new vec4(0.09, 0.05, 0.22, 0.55)

type SkySprite = {
  root: SceneObject
  material: Material
  baseAlpha: number
  baseScale: number
  twinkleSpeed: number
  twinklePhase: number
  bobPhase: number
  home: vec3
}

export class LingoSpaceNightMode {
  private root: SceneObject | null = null
  private sprites: SkySprite[] = []
  private veil: SceneObject | null = null
  private active = false
  private worldCamera = WorldCameraFinderProvider.getInstance()

  constructor(host: BaseScriptComponent) {
    // One shared update drives every sprite; it idles while the sky is off.
    host.createEvent("UpdateEvent").bind(() => this.animate())
  }

  setActive(on: boolean): void {
    if (on === this.active) return
    this.active = on
    if (!on) {
      if (this.root) this.root.enabled = false
      return
    }
    this.ensureBuilt()
    this.arrangeAroundWearer()
    this.root!.enabled = true
  }

  /** Built lazily on the first night: nobody pays for stars they never see. */
  private ensureBuilt(): void {
    if (this.root) return
    this.root = global.scene.createSceneObject("Lingo Night Sky")
    // Head-locked indigo veil: the "more night" layer behind everything else.
    this.veil = global.scene.createSceneObject("Night Veil")
    this.veil.setParent(this.root)
    const veilImage = this.veil.createComponent("Component.Image") as Image
    const veilMaterial = IMAGE_MATERIAL_ASSET.clone() as Material
    veilMaterial.mainPass.baseTex = VEIL_TEXTURE
    veilMaterial.mainPass.baseColor = VEIL_COLOR
    veilMaterial.mainPass.blendMode = BlendMode.Normal
    veilMaterial.mainPass.depthTest = false
    veilMaterial.mainPass.depthWrite = false
    veilMaterial.mainPass.twoSided = true
    veilImage.clearMaterials()
    veilImage.addMaterial(veilMaterial)
    veilImage.setRenderOrder(VEIL_ORDER)
    this.veil.getTransform().setLocalScale(new vec3(460, 460, 1))
    for (let i = 0; i < STAR_COUNT; i++) {
      this.sprites.push(this.makeSprite(STAR_TEXTURE, 0.62 + Math.random() * 0.33, 4 + Math.random() * 6))
    }
    // One big dreamy moon, brighter and slower than any star.
    const moon = this.makeSprite(MOON_TEXTURE, 0.92, 24)
    moon.twinkleSpeed = 0.25
    this.sprites.push(moon)
  }

  private makeSprite(texture: Texture, alpha: number, scale: number): SkySprite {
    const object = global.scene.createSceneObject("Night Sprite")
    object.setParent(this.root!)
    const image = object.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL_ASSET.clone() as Material
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, alpha)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(SKY_ORDER)
    object.getTransform().setLocalScale(new vec3(scale, scale, 1))
    return {
      root: object,
      material,
      baseAlpha: alpha,
      baseScale: scale,
      twinkleSpeed: 0.8 + Math.random() * 1.4,
      twinklePhase: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      home: vec3.zero(),
    }
  }

  /** Fresh constellation around wherever the wearer stands right now. */
  private arrangeAroundWearer(): void {
    const head = this.worldCamera.getWorldPosition()
    const forward = this.worldCamera.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const facing = Math.atan2(forward.x, forward.z)
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i]
      const isMoon = i === this.sprites.length - 1
      // Stars ring the full 360; the moon hangs ahead-left where eyes rest.
      const azimuth = isMoon ? facing + Math.PI + 0.5 : Math.random() * Math.PI * 2
      const elevation = isMoon ? 0.62 : 0.05 + Math.random() * 0.85
      const radius = isMoon ? 300 : 150 + Math.random() * 160
      const flat = Math.cos(elevation) * radius
      sprite.home = new vec3(
        head.x + Math.sin(azimuth) * flat,
        head.y + Math.sin(elevation) * radius,
        head.z + Math.cos(azimuth) * flat,
      )
      sprite.root.getTransform().setWorldPosition(sprite.home)
    }
  }

  private animate(): void {
    if (!this.active || !this.root) return
    const camera = this.worldCamera.getWorldPosition()
    const time = getTime()
    if (this.veil) {
      // Re-locked to the head every frame: at 140cm a 460cm quad blankets the
      // whole capture FOV, so the recording is night wherever the wearer looks.
      const ahead = this.worldCamera.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
      const veilTransform = this.veil.getTransform()
      veilTransform.setWorldPosition(camera.add(ahead.uniformScale(140)))
      veilTransform.setWorldRotation(quat.lookAt(ahead.uniformScale(-1), vec3.up()))
    }
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i]
      const transform = sprite.root.getTransform()
      // Gentle float + twinkle; every star breathes on its own clock.
      const wave = Math.sin(time * sprite.twinkleSpeed + sprite.twinklePhase)
      const bob = Math.sin(time * 0.35 + sprite.bobPhase) * 3
      transform.setWorldPosition(new vec3(sprite.home.x, sprite.home.y + bob, sprite.home.z))
      sprite.material.mainPass.baseColor = new vec4(1, 1, 1, sprite.baseAlpha * (0.72 + 0.28 * wave))
      const pulse = sprite.baseScale * (1 + 0.06 * wave)
      transform.setLocalScale(new vec3(pulse, pulse, 1))
      // Face the wearer so no star is ever seen edge-on.
      const toCamera = camera.sub(sprite.home)
      if (toCamera.length > 1) transform.setWorldRotation(quat.lookAt(toCamera.normalize(), vec3.up()))
    }
  }
}
