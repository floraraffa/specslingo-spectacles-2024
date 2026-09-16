import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"

const CONTENT_FONT: Font = requireAsset("../../Fonts/Fredoka.ttf") as Font
const CONTENT_MATERIAL: Material = IMAGE_MATERIAL_ASSET

/** Text + leading icon facade for the UIKit 2.0 ElementContent API. */
@component
export class ElementContent515 extends BaseScriptComponent {
  private textComponent!: Text
  private textRoot!: SceneObject
  private iconRoot: SceneObject | null = null
  private iconImage: Image | null = null
  private iconMaterial: Material | null = null
  private currentText: string = ""
  private currentTextSize: number = 39
  private currentIcon: Texture | null = null
  private currentIconSize: number = 2
  private currentSpacing: number = 0.6
  private currentAlignment: string = "center"
  private currentSize: vec2 = new vec2(12, 4)

  onAwake(): void {
    this.textRoot = global.scene.createSceneObject("Content Text")
    this.textRoot.setParent(this.sceneObject)
    this.textComponent = this.textRoot.createComponent("Component.Text") as Text
    this.textComponent.font = CONTENT_FONT
    this.textComponent.depthTest = true
    this.textComponent.horizontalAlignment = HorizontalAlignment.Center
    this.textComponent.verticalAlignment = VerticalAlignment.Center
    this.textComponent.horizontalOverflow = HorizontalOverflow.Shrink
    this.textComponent.verticalOverflow = VerticalOverflow.Shrink
    this.textComponent.textFill.color = new vec4(1, 1, 1, 1)
    this.refresh()
  }

  get text(): string { return this.currentText }
  set text(value: string) { this.currentText = value || ""; this.refresh() }
  get textSize(): number { return this.currentTextSize }
  set textSize(value: number) { this.currentTextSize = value; this.refresh() }
  get leadingIcon(): Texture | null { return this.currentIcon }
  set leadingIcon(value: Texture | null) { this.currentIcon = value; this.ensureIcon(); this.refresh() }
  get leadingIconSize(): number { return this.currentIconSize }
  set leadingIconSize(value: number) { this.currentIconSize = value; this.refresh() }
  get spacing(): number { return this.currentSpacing }
  set spacing(value: number) { this.currentSpacing = value; this.refresh() }
  get contentAlignment(): string { return this.currentAlignment }
  set contentAlignment(value: string) { this.currentAlignment = value || "center"; this.refresh() }
  get sizeOverride(): vec2 { return this.currentSize }
  set sizeOverride(value: vec2) { if (value) this.currentSize = value; this.refresh() }

  private ensureIcon(): void {
    if (!this.currentIcon || this.iconRoot) return
    this.iconRoot = global.scene.createSceneObject("Content Icon")
    this.iconRoot.setParent(this.sceneObject)
    this.iconImage = this.iconRoot.createComponent("Component.Image") as Image
    this.iconMaterial = CONTENT_MATERIAL.clone()
    this.iconMaterial.mainPass.baseColor = new vec4(1, 1, 1, 1)
    this.iconMaterial.mainPass.depthTest = true
    this.iconMaterial.mainPass.depthWrite = false
    this.iconImage.clearMaterials()
    this.iconImage.addMaterial(this.iconMaterial)
  }

  private refresh(): void {
    if (!this.textComponent || !this.textRoot) return
    this.textComponent.text = this.currentText
    this.textComponent.size = this.currentTextSize
    ;(this.textComponent as Text & {weight?: number}).weight = 700
    ;(this.textComponent as any).layoutRect = Rect.create(
      -this.currentSize.x * 0.5,
      this.currentSize.x * 0.5,
      -this.currentSize.y * 0.5,
      this.currentSize.y * 0.5,
    )
    const hasIcon = this.currentIcon !== null
    const textOffset = hasIcon ? (this.currentIconSize + this.currentSpacing) * 0.35 : 0
    const leftAligned = this.currentAlignment === "left"
    this.textRoot.getTransform().setLocalPosition(new vec3(leftAligned ? 0.8 : textOffset, 0, 1.2))
    if (this.iconRoot && this.iconMaterial && this.currentIcon) {
      this.iconMaterial.mainPass.baseTex = this.currentIcon
      this.iconRoot.enabled = true
      this.iconRoot.getTransform().setLocalScale(new vec3(this.currentIconSize, this.currentIconSize, 1))
      const x = leftAligned ? -this.currentSize.x * 0.5 + this.currentIconSize : -this.currentSize.x * 0.32
      this.iconRoot.getTransform().setLocalPosition(new vec3(x, 0, 1.2))
    }
  }
}
