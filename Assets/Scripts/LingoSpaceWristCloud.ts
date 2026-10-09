/** Right-wrist mini cloud: the studied language's cloud rides the RIGHT wrist
 * during scan and quiz (mirroring the glossary book on the left wrist). One tap
 * opens Live Talk. Without hand tracking it docks beside the main panel. */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {SIK} from "SpectaclesInteractionKit.lspkg/SIK"
import {LanguageId} from "./LingoSpaceData"
import {artButton, artPiece} from "./LingoSpaceArtKit"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"

const LANGUAGE_CLOUDS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../LingoDesign/nube-es.png") as Texture,
  English: requireAsset("../LingoDesign/nube-en.png") as Texture,
  German: requireAsset("../LingoDesign/nube-gr.png") as Texture,
  French: requireAsset("../LingoDesign/nube-fr.png") as Texture,
  Italian: requireAsset("../LingoDesign/nube-it.png") as Texture,
  Japanese: requireAsset("../LingoDesign/nube-jp.png") as Texture,
}

/** Above the HUD bands, like the other wrist chips. */
const CLOUD_ORDER = 30
const WRIST_SIZE = 6
/** Floating free (no hand tracked) it grows so it reads from panel distance. */
const DOCKED_SCALE = 1.7
/** Dock point beside the main panel, mirroring the glossary book on the left. */
const DOCK_OFFSET = new vec3(28, -6, 6)

export class LingoSpaceWristCloud {
  private root: SceneObject
  private cloud: SceneObject
  private worldCamera = WorldCameraFinderProvider.getInstance()
  private smoothed: vec3 | null = null
  private time = 0
  private language: LanguageId | null = null
  private button: ReturnType<typeof artButton> | null = null

  constructor(host: BaseScriptComponent, private panelAnchor: SceneObject, private audio: LingoSpaceAudioController, private onTap: () => void) {
    this.root = global.scene.createSceneObject("Lingo Wrist Cloud")
    this.cloud = global.scene.createSceneObject("Wrist Cloud Bob")
    this.cloud.setParent(this.root)
    this.root.enabled = false
    host.createEvent("UpdateEvent").bind(() => this.follow())
  }

  /** Shown for the scan / quiz session in `language`; rebuilt if the language changed. */
  show(language: LanguageId): void {
    if (this.language !== language || !this.button) {
      if (this.button && !isNull(this.button.root)) this.button.root.destroy()
      this.button = artButton(this.cloud, artPiece(LANGUAGE_CLOUDS[language], 1, 1), WRIST_SIZE, "Wrist Cloud")
      this.button.button.onTriggerUp.add(() => {
        this.audio.playClick()
        this.onTap()
      })
      const image = this.button.art.getComponent("Component.Image") as Image | null
      if (image) image.setRenderOrder(CLOUD_ORDER)
      this.language = language
    }
    this.smoothed = null
    this.root.enabled = true
  }

  hide(): void {
    this.root.enabled = false
  }

  private follow(): void {
    if (!this.root.enabled) return
    const hand = SIK.HandInputData.getHand("right")
    const tracked = !!(hand && hand.isTracked())
    let target: vec3
    let visible = true
    if (tracked) {
      // Hug the wrist, floated toward the wearer so the hand never covers it.
      const towardCamera = this.worldCamera.getWorldPosition().sub(hand.wrist.position).normalize()
      target = hand.wrist.position.add(new vec3(0, 2, 0)).add(towardCamera.uniformScale(3.5))
      // Palm turned away: the cloud hides instead of drifting through the scene.
      visible = hand.isFacingCamera()
    } else {
      target = this.panelAnchor.getTransform().getWorldTransform().multiplyPoint(DOCK_OFFSET)
    }
    if (this.cloud.enabled !== visible) this.cloud.enabled = visible
    const blend = Math.min(1, getDeltaTime() * 10)
    this.smoothed = this.smoothed ? vec3.lerp(this.smoothed, target, blend) : target
    const transform = this.root.getTransform()
    transform.setWorldPosition(this.smoothed)
    // Always face the wearer.
    const toCamera = this.worldCamera.getWorldPosition().sub(this.smoothed)
    if (toCamera.length > 0.01) transform.setWorldRotation(quat.lookAt(toCamera.normalize(), vec3.up()))
    const scaleTarget = tracked ? 1 : DOCKED_SCALE
    const current = transform.getLocalScale().x
    const next = current + (scaleTarget - current) * blend
    transform.setLocalScale(new vec3(next, next, next))
    // A gentle float, like the clouds on the menu.
    this.time += getDeltaTime()
    this.cloud.getTransform().setLocalPosition(new vec3(0, Math.sin(this.time * 1.7) * 0.35, 0))
    this.cloud.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, Math.sin(this.time * 1.1) * 6 * MathUtils.DegToRad))
  }
}
