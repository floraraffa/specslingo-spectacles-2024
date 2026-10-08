/** Day / night brightness: a sun–moon toggle beside MOVE / FOLLOW. The Lens
 * always opens at full brightness (sun); choosing the moon halves the
 * brightness of everything the Lens draws. Spectacles' display is additive,
 * so a 50% black veil drawn last over the whole view scales every pixel the
 * Lens renders by 0.5 — the real room behind stays untouched. */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {artButton, artPiece, setArt} from "./LingoSpaceArtKit"

const TOGGLE_SUN = artPiece(requireAsset("../ScreenDesign/brightness/toggle-sun.png") as Texture, 924, 520)
const TOGGLE_MOON = artPiece(requireAsset("../ScreenDesign/brightness/toggle-moon.png") as Texture, 924, 520)
const WHITE_TEXTURE = requireAsset("../Icons/white.png") as Texture

/** Share of brightness removed at night. */
const NIGHT_DIM = 0.5
/** Drawn after everything else, so the veil covers every panel, card and cloud. */
const VEIL_ORDER = 10000
/** Head-locked a little in front of the eyes, big enough to fill the whole view. */
const VEIL_DISTANCE = 25
const VEIL_SIZE = 300
const TOGGLE_WIDTH = 7.6

export class LingoSpaceBrightness {
  private dimmed = false
  private veil: SceneObject
  private toggleArt: SceneObject
  private worldCamera = WorldCameraFinderProvider.getInstance()
  readonly toggleRoot: SceneObject

  constructor(host: BaseScriptComponent, panelRoot: SceneObject, position: vec3) {
    this.veil = global.scene.createSceneObject("Lingo Brightness Veil")
    const image = this.veil.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL_ASSET.clone()
    material.mainPass.baseTex = WHITE_TEXTURE
    material.mainPass.baseColor = new vec4(0, 0, 0, NIGHT_DIM)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(VEIL_ORDER)
    this.veil.getTransform().setLocalScale(new vec3(VEIL_SIZE, VEIL_SIZE, 1))
    this.veil.enabled = false

    // Opens on the sun: full brightness every time the Lens starts.
    const toggle = artButton(panelRoot, TOGGLE_SUN, TOGGLE_WIDTH, "Brightness Toggle", position)
    this.toggleRoot = toggle.root
    this.toggleArt = toggle.art
    toggle.button.onTriggerUp.add(() => this.setDimmed(!this.dimmed))

    host.createEvent("UpdateEvent").bind(() => this.followHead())
  }

  setDimmed(on: boolean): void {
    this.dimmed = on
    setArt(this.toggleArt, on ? TOGGLE_MOON : TOGGLE_SUN)
    this.veil.enabled = on
    if (on) this.followHead()
  }

  private followHead(): void {
    if (!this.dimmed) return
    const head = this.worldCamera.getWorldPosition()
    const ahead = this.worldCamera.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const transform = this.veil.getTransform()
    transform.setWorldPosition(head.add(ahead.uniformScale(VEIL_DISTANCE)))
    transform.setWorldRotation(quat.lookAt(ahead.uniformScale(-1), vec3.up()))
  }
}
