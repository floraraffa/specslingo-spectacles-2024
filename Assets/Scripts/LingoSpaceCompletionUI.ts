/**
 * Owns the round-complete summary and emits next/change-language intent.
 * Must not mutate vocabulary or progress state.
 */
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./compat515/FlexTypes515"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button515 as Button} from "./compat515/Button515"
import {ElementContent515 as ElementContent} from "./compat515/ElementContent515"
import {afterComponentStart} from "./compat515/Timing515"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {CategoryId, LanguageId} from "./LingoSpaceData"
import {categoryName, lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"

const NEXT_ICON: Texture = requireAsset("../Icons/refresh.png") as Texture
const LANGUAGE_ICON: Texture = requireAsset("../Icons/language.png") as Texture
const DONE_ICON: Texture = requireAsset("../Icons/check_circle.png") as Texture
const IMAGE_MATERIAL: Material = IMAGE_MATERIAL_ASSET
const BACKGROUND_TEXTURE: Texture = requireAsset("../ScreenDesign/background.png") as Texture
const LOGO_TEXTURE: Texture = requireAsset("../LingoDesign/LOGO.png") as Texture
@component
export class LingoSpaceCompletionUI extends BaseScriptComponent {
  private title!: Text
  private summary!: Text
  private xpSummary!: Text
  private nextContent!: ElementContent
  private setupContent!: ElementContent
  private _onNextRound = new Event<void>()
  private _onChangeLanguage = new Event<void>()

  get onNextRound(): PublicApi<void> { return this._onNextRound.publicApi() }
  get onChangeLanguage(): PublicApi<void> { return this._onChangeLanguage.publicApi() }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(48, 60)
    afterComponentStart(this, () => {
      const rounded = this.sceneObject.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
      if (!rounded) return
      rounded.gradient = false
      rounded.backgroundColor = new vec4(1, 1, 1, 0)
      rounded.border = false
    })
    this.addImage(this.sceneObject, BACKGROUND_TEXTURE, 48, 60, "Completion Background", new vec3(0, 0, 0.1))
    const content = this.makeObject(this.sceneObject, "Content", new vec3(0, 0, 1.2))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = 42
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Start
    flex.rowGap = 0.8
    flex.paddingTop = 1.4
    flex.paddingBottom = 2
    flex.paddingLeft = 1.6
    flex.paddingRight = 1.6
    this.addImage(content, LOGO_TEXTURE, 13.5, 13.5, "Completion Logo", undefined, FlexAlignSelf.Center)
    this.title = this.addText(content, "MISSION COMPLETE!", 38, 4.2, 56, 700)
    this.summary = this.addText(content, "HOME 0  •  FOOD 0\nWORK 0  •  TRAVEL 0\nPEOPLE 0  •  OUTSIDE 0", 38, 8, 41, 700)
    this.xpSummary = this.addText(content, "AUDIO XP 0  •  TEXT XP 0\nTOTAL XP 0", 38, 5.2, 44, 700)
    this.title.textFill.color = LINGO_COLORS.purple
    this.summary.textFill.color = LINGO_COLORS.ink
    this.xpSummary.textFill.color = new vec4(0.05, 0.48, 0.43, 1)
    this.nextContent = this.addButton(content, "NEXT WORDS", NEXT_ICON, () => this._onNextRound.invoke(), "primary")
    this.setupContent = this.addButton(content, "CHANGE LANGUAGES", LANGUAGE_ICON, () => this._onChangeLanguage.invoke(), "neutral")
    this.hide()
  }

  showSummary(counts: Record<string, number>, audioXp: number, textXp: number, language: LanguageId): void {
    const name = (id: CategoryId): string => categoryName(id, language)
    this.title.text = lingoCopy(language, "complete")
    this.summary.text = `${name("HOME")} ${counts.HOME || 0}  •  ${name("FOOD")} ${counts.FOOD || 0}\n${name("WORK")} ${counts.WORK || 0}  •  ${name("TRAVEL")} ${counts.TRAVEL || 0}\n${name("PEOPLE")} ${counts.PEOPLE || 0}  •  ${name("OUTSIDE")} ${counts.OUTSIDE || 0}`
    this.xpSummary.text = `${lingoCopy(language, "audioXp")} ${audioXp}  •  ${lingoCopy(language, "textXp")} ${textXp}\n${lingoCopy(language, "totalXp")} ${audioXp + textXp}`
    this.nextContent.text = lingoCopy(language, "nextWords")
    this.setupContent.text = lingoCopy(language, "changeSetup")
    this.show()
  }
  show(): void { this.sceneObject.enabled = true }
  hide(): void { this.sceneObject.enabled = false }

  private addButton(parent: SceneObject, label: string, icon: Texture, action: () => void, tone: "primary" | "neutral"): ElementContent {
    const root = this.makeObject(parent, label)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: tone === "primary" ? "Primary" : "Secondary"})
    styleLingoButton(button, tone)
    const content = root.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = label
    content.textSize = 39
    content.leadingIcon = icon
    content.leadingIconSize = 2
    content.spacing = 0.8
    content.sizeOverride = new vec2(32, 5)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = 32
    item.overrideHeight = 5
    button.onInitialized.add(() => {
      button.size = new vec3(32, 5, 1)
      button.onTriggerUp.add(action)
    })
    return content
  }

  private addElement(parent: SceneObject, label: string, icon: Texture, width: number, height: number, textSize: number): void {
    const root = this.makeObject(parent, `Element-${label}`)
    const content = root.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = label
    content.textSize = textSize
    content.leadingIcon = icon
    content.leadingIconSize = 2.4
    content.spacing = 0.8
    content.sizeOverride = new vec2(width, height)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, size: number, weight: number): Text {
    const root = this.makeObject(parent, "Summary")
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = size
    ;(text as Text & {weight?: number}).weight = weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    return text
  }

  private addImage(
    parent: SceneObject,
    texture: Texture,
    width: number,
    height: number,
    name: string,
    position?: vec3,
    alignment?: FlexAlignSelf,
  ): void {
    const root = this.makeObject(parent, name, position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = true
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    root.getTransform().setLocalScale(new vec3(width, height, 1))
    if (parent.getComponent(FlexLayout.getTypeName())) {
      const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideWidth = width
      item.overrideHeight = height
      item.flexShrink = 0
      if (alignment !== undefined) item.alignSelf = alignment
    }
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
