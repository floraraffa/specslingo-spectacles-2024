/** In-section language switcher: tap the "Español → Français" label in any
 * mode and this pop-up swaps the TARGET language without walking the menu. */
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {Button515 as Button} from "./compat515/Button515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {LanguageId, SUPPORTED_LANGUAGES} from "./LingoSpaceData"
import {languageName, lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {LingoFX} from "./LingoSpaceFX"

const PANEL_TEXTURE = requireAsset("../ScreenDesign/background2.png") as Texture

// The same country clouds the menu greets with: instant recognition.
const LANGUAGE_CLOUDS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../LingoDesign/nube-es.png") as Texture,
  English: requireAsset("../LingoDesign/nube-en.png") as Texture,
  German: requireAsset("../LingoDesign/nube-gr.png") as Texture,
  French: requireAsset("../LingoDesign/nube-fr.png") as Texture,
  Italian: requireAsset("../LingoDesign/nube-it.png") as Texture,
  Japanese: requireAsset("../LingoDesign/nube-jp.png") as Texture,
}

// Its own band ABOVE every HUD (they top out at 18): the pop-up always wins.
const ORDER = {background: 40, text: 44, buttonMesh: 46, buttonIcon: 47, buttonText: 48}

type PickerButton = {language: LanguageId, root: SceneObject, button: Button, label: Text}

export class LingoSpaceLanguagePicker {
  private root: SceneObject | null = null
  private titleText!: Text
  private pickerButtons: PickerButton[] = []
  private worldCamera = WorldCameraFinderProvider.getInstance()
  private fx: LingoFX

  constructor(
    private host: BaseScriptComponent,
    private audio: LingoSpaceAudioController,
    private onPick: (language: LanguageId) => void,
  ) {
    this.fx = new LingoFX(host)
    // Built LAZILY on first open: buttons created disabled at boot leave
    // half-initialized interactables in SIK's cursor cache (null-collider
    // crashes every frame on device).
  }

  isOpen(): boolean {
    return !!this.root && this.root.enabled
  }

  private ensureBuilt(): SceneObject {
    if (this.root) return this.root
    this.root = global.scene.createSceneObject("Lingo Language Picker")
    const billboard = this.root.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.3, 0.3, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    this.build()
    return this.root
  }

  show(nativeLanguage: LanguageId, currentTarget: LanguageId | null): void {
    const root = this.ensureBuilt()
    this.titleText.text = lingoCopy(nativeLanguage, "targetPrompt").replace("\n", " ")
    for (let i = 0; i < this.pickerButtons.length; i++) {
      const entry = this.pickerButtons[i]
      entry.root.enabled = entry.language !== nativeLanguage
      const name = languageName(entry.language, nativeLanguage)
      entry.label.text = entry.language === currentTarget ? `✓ ${name}` : name
    }
    // Straight ahead at reading distance, then the billboard keeps facing.
    const head = this.worldCamera.getWorldPosition()
    const forward = this.worldCamera.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const flat = new vec3(forward.x, 0, forward.z)
    const direction = flat.length > 0.001 ? flat.normalize() : new vec3(0, 0, -1)
    root.getTransform().setWorldPosition(head.add(direction.uniformScale(60)))
    root.enabled = true
    this.fx.popIn(root, {rotateDegrees: 0})
  }

  hide(): void {
    if (this.root) this.root.enabled = false
  }

  private build(): void {
    const root = this.root!
    this.addImage(root, PANEL_TEXTURE, new vec2(40, 27), new vec3(0, 0, 0), ORDER.background)
    this.titleText = this.addText(root, "", 33, 3.4, 46, LINGO_COLORS.ink, new vec3(0, 9.6, 0.8))
    const closeRoot = this.makeObject(root, "Picker Close", new vec3(16.4, 9.6, 0.8))
    const close = closeRoot.createComponent(Button.getTypeName()) as Button
    close.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(close, "neutral")
    close.size = new vec3(3.4, 3.4, 1)
    close.onInitialized.add(() => close.size = new vec3(3.4, 3.4, 1))
    this.addText(closeRoot, "✕", 3, 2.4, 40, LINGO_COLORS.white, new vec3(0, 0, 1.2))
    close.onTriggerUp.add(() => {
      this.audio.playClick()
      this.hide()
    })
    // Six languages in a 2 × 3 grid; the wearer's native tongue hides itself.
    // Cream marshmallow buttons: each one carries its country CLOUD plus the
    // language name in dark ink, readable at a glance.
    for (let i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      const language = SUPPORTED_LANGUAGES[i] as LanguageId
      const column = i % 2
      const row = Math.floor(i / 2)
      const position = new vec3(column === 0 ? -8.6 : 8.6, 4.2 - row * 5.3, 0.8)
      const buttonRoot = this.makeObject(root, `Pick ${language}`, position)
      const button = buttonRoot.createComponent(Button.getTypeName()) as Button
      button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
      styleLingoButton(button, "card")
      button.size = new vec3(15.6, 4.6, 1)
      button.onInitialized.add(() => button.size = new vec3(15.6, 4.6, 1))
      this.addIcon(buttonRoot, LANGUAGE_CLOUDS[language], 4.2, new vec3(-5.4, 0.1, 1.2))
      const label = this.addText(buttonRoot, language, 10.2, 2.6, 40, LINGO_COLORS.ink, new vec3(2.1, 0, 1.2))
      button.onTriggerUp.add(() => {
        this.audio.playClick()
        this.hide()
        this.onPick(language)
      })
      this.pickerButtons.push({language, root: buttonRoot, button, label})
    }
    this.scheduleOrderPass()
  }

  /** Button internals initialize late and default to render order 0: sweep the
   * tree on the same delayed cadence every other screen uses. */
  private scheduleOrderPass(): void {
    const delays = [0.3, 1.2]
    for (let i = 0; i < delays.length; i++) {
      const event = this.host.createEvent("DelayedCallbackEvent")
      event.bind(() => {
        if (this.root) this.applyOrders(this.root)
      })
      event.reset(delays[i])
    }
  }

  private applyOrders(object: SceneObject): void {
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      const typeName = visual.getTypeName()
      if (typeName === "Component.Text") {
        if (visual.getRenderOrder() < ORDER.text) visual.setRenderOrder(ORDER.buttonText)
      } else if (visual.getRenderOrder() < ORDER.background) {
        visual.setRenderOrder(ORDER.buttonMesh)
      }
      if (visual instanceof RoundedRectangleVisual) visual.setRenderOrder(ORDER.buttonMesh)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) this.applyOrders(object.getChild(i))
  }

  private addIcon(parent: SceneObject, texture: Texture, scale: number, position: vec3): void {
    const root = this.makeObject(parent, "Picker Icon", position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL_ASSET.clone() as Material
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(ORDER.buttonIcon)
    root.getTransform().setLocalScale(new vec3(scale, scale, 1))
  }

  private addImage(parent: SceneObject, texture: Texture, size: vec2, position: vec3, order: number): void {
    const root = this.makeObject(parent, "Picker Image", position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL_ASSET.clone() as Material
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(order)
    root.getTransform().setLocalScale(new vec3(size.x, size.y, 1))
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, size: number, color: vec4, position: vec3): Text {
    const root = this.makeObject(parent, "Picker Text", position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = false
    text.size = size
    ;(text as Text & {weight?: number}).weight = 700
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color
    text.setRenderOrder(ORDER.text)
    return text
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
