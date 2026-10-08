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
import {LINGO_COLORS} from "./LingoSpaceTheme"
import {ART, ART_FLOW, artButton, artIcon, artImage, artLabel, ArtPiece, kitText} from "./LingoSpaceArtKit"

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
  private titleTop!: Text
  private nextContent!: Text
  private setupContent!: Text
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
    flex.rowGap = 1
    flex.paddingTop = 1.4
    flex.paddingBottom = 2
    flex.paddingLeft = 1.6
    flex.paddingRight = 1.6
    // The Lingo Specs logo, then "MISSION COMPLETE!" as a bubbly title below it.
    this.addImage(content, LOGO_TEXTURE, 16, 16, "Completion Logo", undefined, FlexAlignSelf.Center)
    const titleSlot = this.addSlot(content, "Mission Title", 38, 4.4)
    this.titleTop = this.bubblyLine(kitText(titleSlot, "", 38, 4.4, new vec3(0, 0, 1.2), 62, new vec4(0.36, 0.16, 0.9, 1)))

    // Framed cream card: words learned per category, then the XP.
    const cardWidth = 35
    const cardHeight = cardWidth * ART.statsCard.aspect
    const card = this.addSlot(content, "Mission Stats", cardWidth, cardHeight)
    artImage(card, ART.statsCard, cardWidth, new vec3(0, 0, 0.4), "Mission Stats Art")
    this.summary = kitText(card, "", cardWidth * 0.8, cardHeight * 0.48, new vec3(0, cardHeight * 0.15, 1.2), 38, LINGO_COLORS.ink, false)
    this.xpSummary = kitText(card, "", cardWidth * 0.8, cardHeight * 0.3, new vec3(0, -cardHeight * 0.24, 1.2), 40, new vec4(0.05, 0.48, 0.43, 1))
    this.title = this.titleTop

    this.nextContent = this.addKitButton(content, ART.longPrimary, NEXT_ICON, () => this._onNextRound.invoke())
    this.setupContent = this.addKitButton(content, ART.longDark, LANGUAGE_ICON, () => this._onChangeLanguage.invoke())
    this.hide()
  }

  showSummary(counts: Record<string, number>, audioXp: number, textXp: number, language: LanguageId): void {
    const name = (id: CategoryId): string => categoryName(id, language)
    this.titleTop.text = lingoCopy(language, "complete")
    this.summary.text = `${name("HOME")} ${counts.HOME || 0}  ·  ${name("FOOD")} ${counts.FOOD || 0}\n${name("WORK")} ${counts.WORK || 0}  •  ${name("TRAVEL")} ${counts.TRAVEL || 0}\n${name("PEOPLE")} ${counts.PEOPLE || 0}  •  ${name("OUTSIDE")} ${counts.OUTSIDE || 0}`
    this.xpSummary.text = `${lingoCopy(language, "audioXp")} ${audioXp}  •  ${lingoCopy(language, "textXp")} ${textXp}\n${lingoCopy(language, "totalXp")} ${audioXp + textXp}`
    this.nextContent.text = lingoCopy(language, "nextWords")
    this.setupContent.text = lingoCopy(language, "changeSetup")
    this.show()
  }
  show(): void { this.sceneObject.enabled = true }
  hide(): void { this.sceneObject.enabled = false }

  /** Long kit button (no baked icon): a white icon on the left, the label beside it. */
  private addKitButton(parent: SceneObject, art: ArtPiece, icon: Texture, action: () => void): Text {
    const width = 35
    const made = artButton(parent, art, width, "Completion Action")
    const item = made.root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = made.height * ART_FLOW
    item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Center
    artIcon(made.root, icon, width, 0.13, 2.4)
    made.button.onTriggerUp.add(action)
    return artLabel(made.root, art, width, "", 42)
  }

  private addSlot(parent: SceneObject, name: string, width: number, height: number): SceneObject {
    const root = this.makeObject(parent, name)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Center
    return root
  }

  /** Bubbly title: deep violet letters, thick white outline, soft lilac shadow (as on every other screen). */
  private bubblyLine(text: Text): Text {
    text.outlineSettings.enabled = true
    text.outlineSettings.size = 0.22
    text.outlineSettings.fill.color = LINGO_COLORS.white
    text.dropshadowSettings.enabled = true
    text.dropshadowSettings.offset = new vec2(0.06, -0.12)
    text.dropshadowSettings.fill.color = new vec4(0.55, 0.42, 0.95, 0.55)
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
