/** Shared kit of designed PNG pieces (buttons, bubbles, pills) used by every
 * screen, so Live Talk, the quiz and the rest of the UI share one look.
 * Each piece knows its proportions and where its label goes, clear of the
 * icon baked into the art; labels are written in code so all languages work. */
import {Button515 as Button} from "./compat515/Button515"
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {LINGO_COLORS, LINGO_FONT_BOLD, LINGO_FONT_SEMIBOLD} from "./LingoSpaceTheme"

export type ArtPiece = {
  texture: Texture
  /** Height / width of the PNG. */
  aspect: number
  /** Label slot as fractions of the width (center, span), clear of baked icons. */
  labelCenter: number
  labelSpan: number
}

export function artPiece(texture: Texture, width: number, height: number, labelCenter: number = 0.5, labelSpan: number = 0.8): ArtPiece {
  return {texture, aspect: height / width, labelCenter, labelSpan}
}

export const ART = {
  // Buttons
  listen: artPiece(requireAsset("../ScreenDesign/talk/btn-listen.png") as Texture, 536, 140, 0.66, 0.46),
  speak: artPiece(requireAsset("../ScreenDesign/talk/btn-answer.png") as Texture, 528, 140, 0.67, 0.44),
  next: artPiece(requireAsset("../ScreenDesign/quiz/next.png") as Texture, 382, 120, 0.37, 0.5),
  /** The one VOLVER of the app (arrow left, sparkle right), used on every screen. */
  back: artPiece(requireAsset("../ScreenDesign/scan/btn-back.png") as Texture, 492, 101, 0.55, 0.6),
  dontKnow: artPiece(requireAsset("../ScreenDesign/talk/btn-dontknow.png") as Texture, 401, 158, 0.61, 0.36),
  answer: artPiece(requireAsset("../ScreenDesign/quiz/answer.png") as Texture, 413, 105, 0.5, 0.86),
  answerGold: artPiece(requireAsset("../ScreenDesign/quiz/answer-gold.png") as Texture, 412, 116, 0.5, 0.86),
  speaker: artPiece(requireAsset("../ScreenDesign/quiz/speaker.png") as Texture, 198, 149),
  levelA0: artPiece(requireAsset("../ScreenDesign/talk/level-btn-a0.png") as Texture, 587, 133, 0.62, 0.6),
  levelA1: artPiece(requireAsset("../ScreenDesign/talk/level-btn-a1.png") as Texture, 585, 135, 0.62, 0.6),
  levelA2: artPiece(requireAsset("../ScreenDesign/talk/level-btn-a2.png") as Texture, 599, 142, 0.62, 0.6),
  levelB1: artPiece(requireAsset("../ScreenDesign/talk/level-btn-b1.png") as Texture, 587, 145, 0.62, 0.6),
  // Bubbles, pills and cards
  hintPill: artPiece(requireAsset("../ScreenDesign/talk/hint-pill-mic.png") as Texture, 790, 88, 0.54, 0.8),
  bubbleLilac: artPiece(requireAsset("../ScreenDesign/talk/bubble-lilac.png") as Texture, 610, 113, 0.5, 0.88),
  bubbleCloud: artPiece(requireAsset("../ScreenDesign/talk/bubble-cloud.png") as Texture, 530, 235, 0.5, 0.72),
  bubbleCream: artPiece(requireAsset("../ScreenDesign/talk/bubble.png") as Texture, 656, 182, 0.53, 0.8),
  bubbleQuiz: artPiece(requireAsset("../ScreenDesign/quiz/bubble.png") as Texture, 486, 185, 0.54, 0.78),
  pillStars: artPiece(requireAsset("../ScreenDesign/talk/pill-stars.png") as Texture, 427, 76, 0.5, 0.7),
  questionCard: artPiece(requireAsset("../ScreenDesign/talk/card-question.png") as Texture, 1062, 220, 0.6, 0.5),
  // Language confirmation (menu)
  startLong: artPiece(requireAsset("../ScreenDesign/menu/start-btn.png") as Texture, 542, 123, 0.52, 0.56),
  readyBubble: artPiece(requireAsset("../ScreenDesign/menu/ready-bubble.png") as Texture, 648, 185, 0.52, 0.8),
  modePill: artPiece(requireAsset("../ScreenDesign/menu/mode-pill.png") as Texture, 550, 99, 0.5, 0.86),
  // Round complete
  missionTitle: artPiece(requireAsset("../ScreenDesign/completion/mission-title.png") as Texture, 477, 285),
  statsCard: artPiece(requireAsset("../ScreenDesign/completion/stats-card.png") as Texture, 612, 280, 0.5, 0.86),
  longPrimary: artPiece(requireAsset("../ScreenDesign/completion/btn-long-primary.png") as Texture, 693, 118, 0.55, 0.7),
  longDark: artPiece(requireAsset("../ScreenDesign/completion/btn-long-dark.png") as Texture, 688, 118, 0.55, 0.7),
  // Scan guide
  scanCamera: artPiece(requireAsset("../ScreenDesign/scan/btn-camera.png") as Texture, 540, 140, 0.55, 0.58),
  scanBack: artPiece(requireAsset("../ScreenDesign/scan/btn-back.png") as Texture, 492, 101, 0.55, 0.6),
  scanTealA: artPiece(requireAsset("../ScreenDesign/scan/btn-teal-a.png") as Texture, 559, 125, 0.57, 0.68),
  scanTealB: artPiece(requireAsset("../ScreenDesign/scan/btn-teal-b.png") as Texture, 502, 130, 0.57, 0.68),
  checkPill: artPiece(requireAsset("../ScreenDesign/scan/check-pill.png") as Texture, 553, 105, 0.55, 0.82),
  cloudPill: artPiece(requireAsset("../ScreenDesign/scan/cloud-pill.png") as Texture, 597, 113, 0.5, 0.86),
  bubbleTail: artPiece(requireAsset("../ScreenDesign/scan/bubble-tail.png") as Texture, 612, 165, 0.53, 0.82),
  cameraCloud: artPiece(requireAsset("../ScreenDesign/scan/camera-cloud.png") as Texture, 378, 314),
  mapPin: artPiece(requireAsset("../ScreenDesign/scan/map-pin.png") as Texture, 322, 291),
  housesFrench: artPiece(requireAsset("../ScreenDesign/menu/houses-fr.png") as Texture, 400, 233),
  eiffelLampFrench: artPiece(requireAsset("../ScreenDesign/menu/eiffel-lamp-fr.png") as Texture, 393, 484),
  statsPill: artPiece(requireAsset("../ScreenDesign/quiz/stats-pill.png") as Texture, 670, 88),
  tape: artPiece(requireAsset("../ScreenDesign/quiz/tape.png") as Texture, 145, 78),
}

/** Share of an art button's height kept in the layout flow: a little more than
 * the art itself, so stacked buttons always keep some air between them. */
export const ART_FLOW = 1.04
/** Minimum gap between buttons sharing a row. */
export const ROW_GAP = 1.3

/** The piece drawn as an image (no depth test, alpha blended). Returns its object. */
export function artImage(parent: SceneObject, art: ArtPiece, width: number, position: vec3, name: string, height: number = 0): SceneObject {
  const root = global.scene.createSceneObject(name)
  root.setParent(parent)
  root.getTransform().setLocalPosition(position)
  root.getTransform().setLocalScale(new vec3(width, height > 0 ? height : width * art.aspect, 1))
  const image = root.createComponent("Component.Image") as Image
  const material = IMAGE_MATERIAL_ASSET.clone()
  material.mainPass.baseTex = art.texture
  material.mainPass.baseColor = new vec4(1, 1, 1, 1)
  material.mainPass.blendMode = BlendMode.Normal
  material.mainPass.depthTest = false
  material.mainPass.depthWrite = false
  material.mainPass.twoSided = true
  image.clearMaterials()
  image.addMaterial(material)
  return root
}

/** Swaps the texture (and optional tint) of an art image made by artImage. */
export function setArt(image: SceneObject, art: ArtPiece, tint: vec4 = new vec4(1, 1, 1, 1)): void {
  if (!image || isNull(image)) return
  const component = image.getComponent("Component.Image") as Image | null
  if (!component) return
  component.mainMaterial.mainPass.baseTex = art.texture
  component.mainMaterial.mainPass.baseColor = tint
}

export type ArtButton = {root: SceneObject, button: Button, art: SceneObject, width: number, height: number}

/** A SIK button drawn by its PNG: the capsule is cleared, the art grows a little
 * under the finger. The caller places / registers `root` in its layout. */
export function artButton(parent: SceneObject, art: ArtPiece, width: number, name: string, position: vec3 = vec3.zero(), fixedHeight: number = 0): ArtButton {
  // A fixed height lets sibling buttons cut from different crops line up evenly.
  const height = fixedHeight > 0 ? fixedHeight : width * art.aspect
  const root = global.scene.createSceneObject(name)
  root.setParent(parent)
  root.getTransform().setLocalPosition(position)
  const button = root.createComponent(Button.getTypeName()) as Button
  button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Ghost"})
  const hit = new vec3(width * 0.96, height * 0.9, 1)
  button.size = hit
  button.onInitialized.add(() => {
    button.size = hit
    clearButtonVisual(button)
  })
  const image = artImage(root, art, width, new vec3(0, 0, 0.6), `${name} Art`, height)
  button.onHoverEnter.add(() => root.getTransform().setLocalScale(new vec3(1.03, 1.03, 1)))
  button.onHoverExit.add(() => root.getTransform().setLocalScale(vec3.one()))
  return {root, button, art: image, width, height}
}

/** Grows a fixed-height row (and its own flow item) so a taller art button fits
 * inside it, and keeps at least ROW_GAP between the row's buttons. */
export function fitRow(row: SceneObject, height: number): void {
  const flex = row.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
  if (!flex) return
  if (flex.columnGap < ROW_GAP) flex.columnGap = ROW_GAP
  if (flex.height >= 0 && flex.height < height) {
    flex.height = height
    const item = row.getComponent(FlexItem.getTypeName()) as FlexItem | null
    if (item) item.overrideHeight = height
  }
}

/** Invisible pinch target over a part of the art (e.g. a speaker baked into a card). */
export function hitButton(parent: SceneObject, width: number, height: number, name: string, position: vec3): Button {
  const root = global.scene.createSceneObject(name)
  root.setParent(parent)
  root.getTransform().setLocalPosition(position)
  const button = root.createComponent(Button.getTypeName()) as Button
  button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Ghost"})
  const size = new vec3(width, height, 1)
  button.size = size
  button.onInitialized.add(() => {
    button.size = size
    clearButtonVisual(button)
  })
  button.onHoverEnter.add(() => root.getTransform().setLocalScale(new vec3(1.06, 1.06, 1)))
  button.onHoverExit.add(() => root.getTransform().setLocalScale(vec3.one()))
  return button
}

/** Label in the piece's text slot (bold rounded font). Too long for one line, it
 * wraps onto two centered lines, shrinking only if two lines still don't fit. */
export function artLabel(parent: SceneObject, art: ArtPiece, width: number, value: string, size: number, color: vec4 = LINGO_COLORS.white, yOffset: number = 0, lineHeight: number = 0): Text {
  const height = lineHeight > 0 ? lineHeight / 0.6 : width * art.aspect
  const span = width * art.labelSpan
  const root = global.scene.createSceneObject("Art Label")
  root.setParent(parent)
  root.getTransform().setLocalPosition(new vec3((art.labelCenter - 0.5) * width, yOffset, 1.4))
  const text = root.createComponent("Component.Text") as Text
  text.text = value
  text.font = LINGO_FONT_BOLD
  text.size = size
  text.depthTest = false
  text.horizontalAlignment = HorizontalAlignment.Center
  text.verticalAlignment = VerticalAlignment.Center
  text.horizontalOverflow = HorizontalOverflow.Wrap
  text.verticalOverflow = VerticalOverflow.Shrink
  const boxHeight = lineHeight > 0 ? lineHeight : height * 0.72
  text.worldSpaceRect = Rect.create(-span / 2, span / 2, -boxHeight / 2, boxHeight / 2)
  text.textFill.color = color
  return text
}

/** Free-standing kit text (bold or semibold rounded face), shrinks to its box. */
export function kitText(parent: SceneObject, value: string, width: number, height: number, position: vec3, size: number, color: vec4, bold: boolean = true, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
  const root = global.scene.createSceneObject("Kit Text")
  root.setParent(parent)
  root.getTransform().setLocalPosition(position)
  const text = root.createComponent("Component.Text") as Text
  text.text = value
  text.font = bold ? LINGO_FONT_BOLD : LINGO_FONT_SEMIBOLD
  text.size = size
  text.depthTest = false
  text.horizontalAlignment = alignment
  text.verticalAlignment = VerticalAlignment.Center
  text.horizontalOverflow = HorizontalOverflow.Shrink
  text.verticalOverflow = VerticalOverflow.Shrink
  text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
  text.textFill.color = color
  return text
}

/** A white icon on an art button at a fraction of its width (for art without a baked icon). */
export function artIcon(parent: SceneObject, texture: Texture, width: number, at: number, size: number): SceneObject {
  const root = global.scene.createSceneObject("Art Icon")
  root.setParent(parent)
  root.getTransform().setLocalPosition(new vec3((at - 0.5) * width, 0, 1.3))
  root.getTransform().setLocalScale(new vec3(size, size, 1))
  const image = root.createComponent("Component.Image") as Image
  const material = IMAGE_MATERIAL_ASSET.clone()
  material.mainPass.baseTex = texture
  material.mainPass.baseColor = new vec4(1, 1, 1, 1)
  material.mainPass.blendMode = BlendMode.Normal
  material.mainPass.depthTest = false
  material.mainPass.depthWrite = false
  material.mainPass.twoSided = true
  image.clearMaterials()
  image.addMaterial(material)
  return root
}

/** The shared VOLVER: art button + centered label. `height` > 0 keeps rows even. */
export function backButton(parent: SceneObject, width: number, label: string, size: number, height: number = 0, position: vec3 = vec3.zero()): {made: ArtButton, label: Text} {
  const made = artButton(parent, ART.back, width, "Back", position, height)
  const text = artLabel(made.root, ART.back, width, stripArrow(label), size)
  return {made, label: text}
}

/** The shared SALTAR / SKIP: same art, width and label size on every screen. */
export const SKIP_WIDTH = 15
export function skipButton(parent: SceneObject, label: string): {made: ArtButton, label: Text} {
  const made = artButton(parent, ART.next, SKIP_WIDTH, "Skip")
  const text = artLabel(made.root, ART.next, SKIP_WIDTH, stripArrow(label), 40)
  return {made, label: text}
}

/** Arrows baked into the art: drop the ones the copy carries ("SKIP ▸"). */
export function stripArrow(label: string): string {
  return label.replace(/\s*[▸▶►→]\s*$/, "").replace(/^\s*[◂◀←]\s*/, "")
}

export function clearButtonVisual(button: Button): void {
  const visual = button.visual as RoundedRectangleVisual
  if (!(visual instanceof RoundedRectangleVisual)) return
  visual.defaultHasBorder = false
  visual.hoveredHasBorder = false
  visual.triggeredHasBorder = false
  const clear = new vec4(0, 0, 0, 0)
  visual.baseDefaultColor = clear
  visual.baseHoveredColor = clear
  visual.baseTriggeredColor = clear
  visual.baseToggledDefaultColor = clear
  visual.baseToggledHoveredColor = clear
  visual.baseToggledTriggeredColor = clear
}
