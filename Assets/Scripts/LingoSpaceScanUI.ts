/** Environment-first scanner: a compact HUD plus movable cards anchored over real objects. */
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./compat515/FlexTypes515"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {Button515 as Button} from "./compat515/Button515"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {hasDenseScript, LanguageId, ScanSituation, SituationPhrase} from "./LingoSpaceData"
import {languageName, lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"

type TextRole = "Headline" | "Subheadline" | "Body" | "Caption"
type PuzzleChip = {root: SceneObject, label: string, used: boolean}
type PuzzleState = {expected: string[], progress: number, chips: PuzzleChip[], container: SceneObject, title: Text, solved: boolean}
type SpatialCardView = {
  root: SceneObject
  imageMaterials: Material[]
  anchor: vec3 | null
  line: SceneObject | null
  dot: SceneObject | null
  phrase: SituationPhrase | null
  phraseText: Text | null
  captionText: Text | null
  captionOriginal: string
  puzzle: PuzzleState | null
  lineMaterial: Material | null
  dotMaterial: Material | null
  /** Once the wearer grabs a card, late hit-test results may not re-anchor it. */
  userMoved: boolean
}

// Solid 1x1 white pixel for tint-only quads (leader lines); no such asset ships with the project.
const WHITE_PIXEL_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII="

// High-frequency per-interaction logs stay off on device; one-shot diagnostics keep printing.
// True while verifying placement/dedupe on device; false for release builds.
const SCAN_DEBUG_LOGS = true

// Opaque illustrated panel background — the landscape cut of the quiz artwork,
// so scan HUD texts stop fighting the passthrough camera for contrast.
const HUD_BACKGROUND_TEXTURE = requireAsset("../ScreenDesign/background2.png") as Texture
const HUD_BACKGROUND_ORDER = 6

const IMAGE_MATERIAL = IMAGE_MATERIAL_ASSET
const CAMERA_ICON = requireAsset("../Icons/photo_camera.png") as Texture
const MIC_ICON = requireAsset("../Icons/mic.png") as Texture
const VOLUME_ICON = requireAsset("../Icons/volume_up.png") as Texture
const CARD_FRAME_TEXTURE = requireAsset("../BoardDesign/card central.png") as Texture
const MOVE_ICON = requireAsset("../Icons/move.png") as Texture

const TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Headline: {size: 54, weight: 800},
  Subheadline: {size: 46, weight: 800},
  Body: {size: 41, weight: 700},
  Caption: {size: 37, weight: 700},
}

// The spatial cards are only ~15 cm wide; the HUD scale reads oversized there.
const CARD_TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Headline: {size: 40, weight: 800},
  Subheadline: {size: 34, weight: 700},
  Body: {size: 30, weight: 600},
  Caption: {size: 27, weight: 600},
}

// Dark enough to stay legible over the cream card artwork.
const CARD_TRANSLATION_COLOR = new vec4(0.03, 0.4, 0.37, 1)

// Deterministic draw order for world cards: only the plate stays in the back;
// frame < artwork < buttons < icons/labels all render in front of it.
// Head movement can no longer let the background paint over the content.
const CARD_RENDER_ORDER = {plate: 8, frame: 10, artwork: 11, icon: 12, text: 14, buttonMesh: 16, buttonIcon: 17, buttonText: 18}

// Shared safely: setWorldScale copies component values; never mutate this vec3.
const LEADER_DOT_SCALE = new vec3(1.8, 1.8, 1)

/** Places study-card miniatures at the physical rays represented by the AI boxes. */
class SpatialScanCards {
  private root: SceneObject
  private lineContainer: SceneObject
  private whiteTexture: Texture | null = null
  private cards: SpatialCardView[] = []
  private generation = 0
  private session: HitTestSession | null = null
  private worldCamera = WorldCameraFinderProvider.getInstance()
  private fx: LingoFX
  private selectedIndex = -1
  /** Aspect ratio of the frame the AI actually saw; drives the pinhole rays. */
  private captureAspect = 0

  setCaptureAspect(aspect: number): void {
    if (aspect > 0) this.captureAspect = aspect
  }

  private nativeLanguage: LanguageId = "English"

  constructor(
    private host: BaseScriptComponent,
    private onSelect: (index: number) => void,
    private onListen: (index: number) => void,
    private onTalkStart: (index: number) => void,
    private onTalkEnd: (index: number) => void,
    private onPhraseSolved: (index: number) => void,
  ) {
    this.root = global.scene.createSceneObject("LINGO Spatial Object Cards")
    // Created before any card so every leader line renders behind every card.
    this.lineContainer = global.scene.createSceneObject("LINGO Leader Lines")
    this.lineContainer.setParent(this.root)
    Base64.decodeTextureAsync(
      WHITE_PIXEL_B64,
      (texture) => this.whiteTexture = texture,
      () => console.warn("LINGO SPACE leader line texture decode failed"),
    )
    host.createEvent("UpdateEvent").bind(() => {
      this.updateLeaderLines()
      this.updateOcclusion()
    })
    this.fx = new LingoFX(host)
    try {
      const worldQuery = require("LensStudio:WorldQueryModule") as WorldQueryModule
      const options = HitTestSessionOptions.create()
      // A filtered session blends consecutive rays. That is useful for one cursor,
      // but wrong for five unrelated objects because it pulls their hits together.
      options.filter = false
      this.session = worldQuery.createHitTestSessionWithOptions(options)
      this.session.start()
    } catch (error) {
      console.warn(`LINGO SPACE World Query unavailable; using spatial ray placement: ${error}`)
    }
  }

  show(): void {
    this.root.enabled = true
    if (this.session) {
      try { this.session.start() } catch (error) {}
    }
  }

  hide(): void {
    this.root.enabled = false
    if (this.session) {
      try { this.session.stop() } catch (error) {}
    }
  }

  clear(): void {
    this.generation += 1
    for (let i = 0; i < this.cards.length; i++) {
      const view = this.cards[i]
      if (view.line && !isNull(view.line)) view.line.destroy()
      if (view.dot && !isNull(view.dot)) view.dot.destroy()
      deferDestroy(this.host, view.root)
    }
    this.cards = []
    this.selectedIndex = -1
  }

  /** Adds one scan's cards. With append=true earlier scans stay anchored in the
   * rooms where they were captured, so a session can populate the whole home. */
  build(situation: ScanSituation, nativeLanguage: LanguageId, capturePose: mat4, append: boolean): void {
    if (!append) this.clear()
    this.show()
    this.nativeLanguage = nativeLanguage
    const generation = this.generation
    const baseIndex = this.cards.length
    for (let i = 0; i < situation.objects.length; i++) {
      const phrase = this.phraseForObject(situation, i)
      const view = this.createCard(baseIndex + i, situation.objects[i].word, situation.objects[i].translation, situation.objects[i].phonetic, phrase, nativeLanguage)
      this.cards.push(view)
      this.placeCard(view, situation.objects[i].bounds, baseIndex + i, generation, capturePose, situation.objects[i].distanceMeters * 100)
      // Rotation stays owned by the Billboard; the pop-in only breathes scale.
      this.fx.popIn(view.root, {delay: 0.25 + i * 0.14, rotateDegrees: 0})
    }
  }

  /** Re-scanning a known object moves its existing card to the fresh detection
   * instead of ever growing a twin — and heals an anchor that landed badly. */
  reanchorCard(index: number, bounds: {x: number, y: number, width: number, height: number}, capturePose: mat4, aiDistanceCm: number): void {
    const view = this.cards[index]
    if (!view || isNull(view.root) || view.userMoved) return
    view.anchor = null
    this.placeCard(view, bounds, index, this.generation, capturePose, aiDistanceCm)
  }

  count(): number {
    return this.cards.length
  }

  /** World anchor of a placed card; null while its hit-test is still resolving. */
  cardAnchor(index: number): vec3 | null {
    if (index < 0 || index >= this.cards.length) return null
    return this.cards[index].anchor
  }

  /** Cards a wearer can realistically find right now: visible (not hidden by
   * the wall occlusion sweep) and within reach of the current room. */
  huntableIndices(maxDistance: number = 700): number[] {
    const head = this.worldCamera.getWorldPosition()
    const result: number[] = []
    for (let i = 0; i < this.cards.length; i++) {
      const view = this.cards[i]
      if (isNull(view.root) || !view.root.enabled) continue
      if (view.root.getTransform().getWorldPosition().distance(head) > maxDistance) continue
      result.push(i)
    }
    return result
  }

  setArtwork(index: number, texture: Texture): void {
    if (index < 0 || index >= this.cards.length) return
    const materials = this.cards[index].imageMaterials
    for (let i = 0; i < materials.length; i++) {
      materials[i].mainPass.baseTex = texture
      materials[i].mainPass.baseColor = new vec4(1, 1, 1, 1)
    }
  }

  /** Buttons build their visuals a few frames after creation, so the ordering
   * pass runs twice on a delay to catch everything. */
  private scheduleRenderOrderPass(cardRoot: SceneObject): void {
    const delays = [0.3, 1.2]
    for (let i = 0; i < delays.length; i++) {
      const delayed = this.host.createEvent("DelayedCallbackEvent")
      delayed.bind(() => {
        if (isNull(cardRoot)) return
        this.applyRenderOrders(cardRoot, cardRoot, false)
      })
      delayed.reset(delays[i])
    }
  }

  /** Only the back plate stays behind; every visual inside a button subtree draws on top. */
  private applyRenderOrders(object: SceneObject, cardRoot: SceneObject, insideButton: boolean): void {
    const isButton = insideButton || !!object.getComponent(Button.getTypeName())
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      if (object === cardRoot) {
        visual.setRenderOrder(CARD_RENDER_ORDER.plate)
        continue
      }
      if (!isButton) continue
      const typeName = visual.getTypeName()
      if (typeName === "Component.Text") visual.setRenderOrder(CARD_RENDER_ORDER.buttonText)
      else if (typeName === "Component.Image") visual.setRenderOrder(CARD_RENDER_ORDER.buttonIcon)
      else visual.setRenderOrder(CARD_RENDER_ORDER.buttonMesh)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) {
      this.applyRenderOrders(object.getChild(i), cardRoot, isButton)
    }
  }

  private safeSelect(index: number): void {
    try {
      this.onSelect(index)
    } catch (error) {
      console.warn(`LINGO SPACE card selection failed: ${error}`)
    }
  }

  private phraseForObject(situation: ScanSituation, objectIndex: number): SituationPhrase {
    for (let i = 0; i < situation.phrases.length; i++) {
      if (situation.phrases[i].objectIndex === objectIndex) return situation.phrases[i]
    }
    return situation.phrases[Math.min(objectIndex, situation.phrases.length - 1)] || {
      objectIndex,
      intent: "Practice",
      target: situation.objects[objectIndex].word,
      translation: situation.objects[objectIndex].translation,
      pronunciationHint: "",
      usageTip: "",
    }
  }

  private createCard(index: number, word: string, translation: string, phonetic: string, phrase: SituationPhrase, nativeLanguage: LanguageId): SpatialCardView {
    // Longer copy widens the card instead of overflowing the frame.
    const longest = Math.max(word.length, translation.length, phrase.target.length, phrase.translation.length)
    const widthFactor = Math.max(1, Math.min(1.35, 1 + (longest - 16) * 0.022))
    const W = (value: number): number => value * widthFactor
    const root = global.scene.createSceneObject(`Spatial Card ${index + 1} · ${word}`)
    root.setParent(this.root)
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(W(15), 18.8)

    const billboard = root.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.18, 0.18, 1)
    billboard.axisBufferDegrees = new vec3(3, 3, 0)

    // Reuse the same illustrated card shell as Study / AI Image Cards.
    this.addImage(root, CARD_FRAME_TEXTURE, new vec2(W(15), 18.8), new vec3(0, 0, 0.65))

    const content = this.makeObject(root, "Adaptive Card Content", new vec3(0, -0.45, 1.85))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = W(13.2)
    flex.height = 16.5
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Center
    flex.rowGap = 0.24

    const top = this.makeObject(content, "Object Identity")
    const topFlex = top.createComponent(FlexLayout.getTypeName()) as FlexLayout
    topFlex.autoDiscoverItemsOnStart = false
    topFlex.width = W(13)
    topFlex.height = 4.2
    topFlex.direction = FlexDirection.Row
    topFlex.alignItems = FlexAlign.Center
    topFlex.justifyContent = FlexJustify.Center
    topFlex.columnGap = 0.35
    this.registerFlexItem(content, top, W(13), 4.2, FlexAlignSelf.Center)

    const imageRoot = this.makeObject(top, "Generated Object Art")
    const image = imageRoot.createComponent("Component.Image") as Image
    image.stretchMode = StretchMode.Fit
    const imageMaterial = IMAGE_MATERIAL.clone()
    imageMaterial.mainPass.baseTex = CAMERA_ICON
    imageMaterial.mainPass.baseColor = new vec4(1, 1, 1, 0.92)
    // World cards billboard at every angle: content must never depth-lose
    // against the plate, so it draws purely by explicit render order, always on top.
    imageMaterial.mainPass.depthTest = false
    imageMaterial.mainPass.depthWrite = false
    imageMaterial.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(imageMaterial)
    image.setRenderOrder(CARD_RENDER_ORDER.artwork)
    imageRoot.getTransform().setLocalScale(new vec3(4.1, 4.1, 1))
    this.registerFlexItem(top, imageRoot, 4.1, 4.1, FlexAlignSelf.Center)

    const terms = this.makeObject(top, "Responsive Word Labels")
    const termsFlex = terms.createComponent(FlexLayout.getTypeName()) as FlexLayout
    termsFlex.autoDiscoverItemsOnStart = false
    termsFlex.width = W(8.55)
    termsFlex.height = 4.1
    termsFlex.direction = FlexDirection.Column
    termsFlex.alignItems = FlexAlign.Stretch
    termsFlex.justifyContent = FlexJustify.Center
    termsFlex.rowGap = 0.12
    this.registerFlexItem(top, terms, W(8.55), 4.1, FlexAlignSelf.Center)
    // CJK words and phrases render at a larger size so the glyph shapes stay
    // legible on a 15cm card; vertical Shrink keeps them inside their boxes.
    const wordText = this.addFlexText(terms, word, W(8.3), 2.25, "Headline", LINGO_COLORS.ink)
    if (hasDenseScript(word)) wordText.size = Math.round(wordText.size * 1.35)
    this.addFlexText(terms, translation, W(8.3), 1.55, "Body", CARD_TRANSLATION_COLOR)

    const phraseText = this.addFlexText(content, phrase.target, W(12.8), 2.65, "Subheadline", LINGO_COLORS.ink)
    if (hasDenseScript(phrase.target)) phraseText.size = Math.round(phraseText.size * 1.35)
    this.addFlexText(content, phrase.translation, W(12.8), 2.15, "Body", CARD_TRANSLATION_COLOR)
    // Phonetics first: syllables teach more per square centimeter than a usage tip.
    const captionValue = phonetic ? phonetic : this.compactText(phrase.pronunciationHint || phrase.usageTip, 92)
    const captionText = this.addFlexText(content, captionValue, W(12.8), 2.45, "Caption", new vec4(0.31, 0.24, 0.51, 1))

    const actions = this.makeObject(content, "Practice Actions")
    const actionFlex = actions.createComponent(FlexLayout.getTypeName()) as FlexLayout
    actionFlex.autoDiscoverItemsOnStart = false
    actionFlex.width = W(12.8)
    actionFlex.height = 4.2
    actionFlex.direction = FlexDirection.Row
    actionFlex.alignItems = FlexAlign.Center
    actionFlex.justifyContent = FlexJustify.Center
    actionFlex.columnGap = 0.4
    this.registerFlexItem(content, actions, W(12.8), 4.2, FlexAlignSelf.Center)
    const listen = this.addFlexButton(actions, lingoCopy(nativeLanguage, "listen"), VOLUME_ICON, W(6.2), "primary")
    const talk = this.addFlexButton(actions, lingoCopy(nativeLanguage, "holdToTalk"), MIC_ICON, W(6.2), "home")

    // The tape area works as a dedicated grab handle without covering learning content:
    // a compact round button with a large 4-arrow move glyph.
    const moveRoot = this.makeObject(root, "Move Handle", new vec3(W(5.35), 7.85, 2.2))
    const move = moveRoot.createComponent(Button.getTypeName()) as Button
    move.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(move, "neutral")
    move.size = new vec3(3.4, 3.4, 1)
    move.onInitialized.add(() => move.size = new vec3(3.4, 3.4, 1))
    this.addImage(moveRoot, MOVE_ICON, new vec2(2.2, 2.2), new vec3(0, 0, 1.3))

    // Selection runs guarded and AFTER the voice action: an exception in the
    // status/XP path must never eat the listen/talk behavior (device bug 2026-09-08).
    listen.onTriggerUp.add(() => {
      if (SCAN_DEBUG_LOGS) print(`[LINGO CARD] listen tapped ${index + 1}`)
      this.safeSelect(index)
      this.onListen(index)
    })
    talk.onTriggerDown.add(() => {
      if (SCAN_DEBUG_LOGS) print(`[LINGO CARD] talk down ${index + 1}`)
      this.safeSelect(index)
      this.onTalkStart(index)
    })
    talk.onTriggerUp.add(() => this.onTalkEnd(index))

    // The card's upper body is a tap target: selecting a card (and picking one
    // in Word Hunt) must not require aiming at a small button. It deliberately
    // STOPS above the LISTEN/TALK row so it can never steal or cancel their
    // presses — a stolen release was one way the mic could look dead.
    const tapZone = this.makeObject(root, "Card Tap Zone", new vec3(0, 3.4, 0.4))
    const zoneCollider = tapZone.createComponent("Physics.ColliderComponent") as ColliderComponent
    const zoneShape = Shape.createBoxShape()
    zoneShape.size = new vec3(W(15), 11.6, 0.6)
    zoneCollider.shape = zoneShape
    const zoneInteractable = tapZone.createComponent(Interactable.getTypeName()) as Interactable
    zoneInteractable.onTriggerEnd.add(() => this.safeSelect(index))

    const view: SpatialCardView = {root, imageMaterials: [imageMaterial], anchor: null, line: null, dot: null, phrase, phraseText, captionText, captionOriginal: captionValue, puzzle: null, lineMaterial: null, dotMaterial: null, userMoved: false}

    const manipulation = move.sceneObject.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setManipulateRoot(root.getTransform())
    manipulation.setCanTranslate(true)
    manipulation.setCanRotate(false)
    manipulation.setCanScale(true)
    manipulation.minimumScaleFactor = 0.7
    manipulation.maximumScaleFactor = 1.45
    manipulation.onManipulationStart.add(() => {
      billboard.enabled = false
      view.userMoved = true
    })
    manipulation.onManipulationEnd.add(() => {
      billboard.enabled = true
      billboard.resetToLookAtCamera()
    })
    billboard.resetToLookAtCamera()
    this.scheduleRenderOrderPass(root)
    return view
  }

  /** Shows the pronunciation verdict ON the practiced card, then restores its caption. */
  showFeedback(index: number, correct: boolean, message: string): void {
    const view = this.cards[index]
    if (!view || !view.captionText || isNull(view.captionText.getSceneObject())) return
    view.captionText.text = this.compactText(message.replace(/\n/g, "  ·  "), 96)
    view.captionText.textFill.color = correct ? new vec4(0.08, 0.56, 0.4, 1) : new vec4(0.82, 0.34, 0.12, 1)
    const generation = this.generation
    const delayed = this.host.createEvent("DelayedCallbackEvent")
    delayed.bind(() => {
      if (generation !== this.generation || !view.captionText || isNull(view.captionText.getSceneObject())) return
      view.captionText.text = view.captionOriginal
      view.captionText.textFill.color = new vec4(0.31, 0.24, 0.51, 1)
    })
    delayed.reset(5)
  }

  /** Turns the card's example phrase into a tap-to-order puzzle under the card. */
  startPhrasePuzzle(index: number): boolean {
    const view = this.cards[index]
    if (!view || !view.phrase || !view.phraseText || view.puzzle) {
      if (SCAN_DEBUG_LOGS) print(`[LINGO PUZZLE] skip card=${index} reason=${!view ? "no-card" : !view.phrase ? "no-phrase" : view.puzzle ? "already-built" : "no-phrase-text"}`)
      return false
    }
    const tokens = view.phrase.target.split(/\s+/).filter((token) => token.length > 0)
    if (tokens.length < 3 || tokens.length > 9) {
      print(`[LINGO PUZZLE] skip card=${index} reason=length tokens=${tokens.length}`)
      return false
    }

    const container = this.makeObject(view.root, "Phrase Puzzle", new vec3(0, -12.6, 1.6))
    const title = this.addText(container, lingoCopy(this.nativeLanguage, "orderPhrase"), 12, 1.8, "Caption", new vec4(0.61, 0.42, 1, 1), new vec3(0, 2.2, 0.4))
    const shuffled = this.shuffleTokens(tokens, index)
    const chips: PuzzleChip[] = []
    // CJK glyphs are ~double the width of a Latin letter per character.
    const charWidth = hasDenseScript(view.phrase.target) ? 1.1 : 0.52
    const chipWidth = Math.min(6.4, Math.max(3, Math.max(...tokens.map((token) => token.length)) * charWidth + 1.7))
    const perRow = Math.max(2, Math.min(3, Math.ceil(shuffled.length / 2)))
    for (let i = 0; i < shuffled.length; i++) {
      const row = Math.floor(i / perRow)
      const column = i % perRow
      const rowCount = Math.min(perRow, shuffled.length - row * perRow)
      const x = (column - (rowCount - 1) / 2) * (chipWidth + 0.5)
      const chipRoot = this.makeObject(container, `Chip ${shuffled[i]}`, new vec3(x, -row * 3.4, 0.4))
      const button = chipRoot.createComponent(Button.getTypeName()) as Button
      button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
      styleLingoButton(button, "card")
      button.size = new vec3(chipWidth, 2.9, 1)
      button.onInitialized.add(() => button.size = new vec3(chipWidth, 2.9, 1))
      const label = this.addText(chipRoot, shuffled[i], chipWidth - 0.9, 2.2, "Caption", LINGO_COLORS.ink, new vec3(0, 0, 1.3))
      if (hasDenseScript(shuffled[i])) label.size = Math.round(label.size * 1.35)
      label.horizontalOverflow = HorizontalOverflow.Shrink
      const chip: PuzzleChip = {root: chipRoot, label: shuffled[i], used: false}
      chips.push(chip)
      button.onTriggerUp.add(() => this.resolvePuzzleTap(view, chip))
    }
    // Symbol scripts also show how the whole phrase SOUNDS, right under the chips.
    if (hasDenseScript(view.phrase.target) && view.phrase.pronunciationHint) {
      const rows = Math.ceil(shuffled.length / perRow)
      this.addText(
        container,
        this.compactText(view.phrase.pronunciationHint, 80),
        12.5, 1.7, "Caption",
        new vec4(0.31, 0.24, 0.51, 1),
        new vec3(0, -(rows - 1) * 3.4 - 2.6, 0.4),
      )
    }
    view.puzzle = {expected: tokens, progress: 0, chips, container, title, solved: false}
    view.phraseText.text = "· · ·"
    this.fx.popIn(container, {rotateDegrees: 0})
    this.scheduleRenderOrderPass(container)
    return true
  }

  private resolvePuzzleTap(view: SpatialCardView, chip: PuzzleChip): void {
    const puzzle = view.puzzle
    if (!puzzle || puzzle.solved || chip.used || !view.phraseText) return
    if (chip.label !== puzzle.expected[puzzle.progress]) {
      // A gentle bounce marks the miss; no penalty, keep trying.
      this.fx.popIn(chip.root, {rotateDegrees: 0, duration: 0.3})
      return
    }
    chip.used = true
    chip.root.enabled = false
    puzzle.progress += 1
    const built = puzzle.expected.slice(0, puzzle.progress).join(" ")
    view.phraseText.text = puzzle.progress < puzzle.expected.length ? `${built} ▁` : built
    if (puzzle.progress < puzzle.expected.length) return
    puzzle.solved = true
    view.phraseText.textFill.color = new vec4(0.08, 0.56, 0.4, 1)
    puzzle.title.text = lingoCopy(this.nativeLanguage, "phraseSolved")
    const index = this.cards.indexOf(view)
    this.fx.popOut(puzzle.container, () => {
      if (view.puzzle === puzzle) view.puzzle.container.enabled = false
    }, {duration: 0.5})
    if (index >= 0) this.onPhraseSolved(index)
  }

  private shuffleTokens(tokens: string[], seed: number): string[] {
    const result = tokens.slice()
    let state = (seed * 9301 + 49297) % 233280
    for (let i = result.length - 1; i > 0; i--) {
      state = (state * 9301 + 49297) % 233280
      const j = Math.floor((state / 233280) * (i + 1))
      const swap = result[i]
      result[i] = result[j]
      result[j] = swap
    }
    // A shuffle that lands in original order teaches nothing; rotate it once.
    if (result.join(" ") === tokens.join(" ")) result.push(result.shift()!)
    return result
  }

  private placeCard(
    view: SpatialCardView,
    bounds: {x: number, y: number, width: number, height: number},
    index: number,
    generation: number,
    capturePose: mat4,
    aiDistanceCm: number,
  ): void {
    const root = view.root
    const x = Math.max(0.06, Math.min(0.94, bounds.x + bounds.width * 0.5))
    const centerY = Math.max(0.08, Math.min(0.9, bounds.y + bounds.height * 0.5))
    const ray = this.captureRay(new vec2(x, centerY), capturePose)
    const area = Math.max(0.01, bounds.width * bounds.height)
    // The AI's monocular distance estimate is the depth referee: it breaks the
    // tie between "surface in front of the object" and "wall behind it", which
    // pure ray geometry cannot. Bbox-area heuristic only when it is missing.
    const aiKnowsDepth = aiDistanceCm >= 30
    const fallbackDepth = aiKnowsDepth
      ? Math.max(50, Math.min(700, aiDistanceCm))
      : Math.max(85, Math.min(175, 70 + (1 - Math.sqrt(area)) * 105))
    const fallbackDirection = ray.end.sub(ray.start).normalize()
    const fallbackAnchor = ray.start.add(fallbackDirection.uniformScale(fallbackDepth))
    const captureOrigin = capturePose.multiplyPoint(vec3.zero())
    this.anchorCard(view, index, fallbackAnchor, null, captureOrigin)
    if (!this.session) return
    // Nine samples inside the box (3x3 grid). Hits whose distances agree
    // (<25cm apart) form a cluster on the object's own surface: their average
    // wins. Stray rays onto the back wall or a foreground edge are voted out.
    const hits: {position: vec3, normal: vec3, distance: number}[] = []
    const firedAt = getTime()
    const clampU = (value: number): number => Math.max(0.06, Math.min(0.94, value))
    const clampV = (value: number): number => Math.max(0.08, Math.min(0.9, value))
    const offsetsU = [-bounds.width * 0.15, 0, bounds.width * 0.15]
    const offsetsV = [-bounds.height * 0.18, 0, bounds.height * 0.18]
    const samples: vec2[] = []
    for (let u = 0; u < offsetsU.length; u++) {
      for (let v = 0; v < offsetsV.length; v++) {
        samples.push(new vec2(clampU(x + offsetsU[u]), clampV(centerY + offsetsV[v])))
      }
    }
    for (let s = 0; s < samples.length; s++) {
      const sampleRay = this.captureRay(samples[s], capturePose)
      this.session.hitTest(sampleRay.start, sampleRay.end, (hit) => {
        if (generation !== this.generation || !root || isNull(root) || !hit) return
        // Late results (world mesh refining while the wearer walks) may not
        // yank an already settled card around: 2.5s settling window.
        if (getTime() - firedAt > 2.5) return
        hits.push({position: hit.position, normal: hit.normal, distance: hit.position.distance(sampleRay.start)})
        if (SCAN_DEBUG_LOGS) print(`[LINGO HITS] card ${index + 1}: ${hits.length} hits at ${hits.map((entry) => entry.distance.toFixed(0)).join(",")}cm (expect ${fallbackDepth.toFixed(0)})`)
        const chosen = this.chooseAnchorHit(hits, fallbackDepth, aiKnowsDepth)
        // Final veto: the world mesh may only REFINE the AI's depth estimate,
        // never overrule it. A winning cluster on the sofa behind a glass (or
        // the wall behind a TV) lands outside this window and is discarded in
        // favor of the pure ray anchor at the AI distance — the card then sits
        // on the line of sight THROUGH the object, so it can never drift off
        // to a different piece of furniture.
        const chosenDistance = chosen.position.distance(ray.start)
        const depthWindow = aiKnowsDepth ? Math.max(55, fallbackDepth * 0.4) : Number.MAX_VALUE
        if (Math.abs(chosenDistance - fallbackDepth) > depthWindow || chosenDistance > 750) {
          if (SCAN_DEBUG_LOGS) print(`[LINGO ANCHOR] card ${index + 1}: mesh ${chosenDistance.toFixed(0)}cm outside AI window ${fallbackDepth.toFixed(0)}±${depthWindow.toFixed(0)} — ray anchor wins`)
          this.anchorCard(view, index, fallbackAnchor, null, captureOrigin)
          return
        }
        this.anchorCard(view, index, chosen.position, chosen.normal, captureOrigin)
      })
    }
  }

  /** Consensus pick: the NEAREST agreeing distance-cluster (>=2 members)
   * averaged — the object always sits in front of its background, so a back
   * wall loses even when it catches more rays than the object's own surface.
   * Nearest single hit as a conservative fallback when no two rays agree. */
  private chooseAnchorHit(hits: {position: vec3, normal: vec3, distance: number}[], expectedDepth: number, trustExpected: boolean): {position: vec3, normal: vec3} {
    if (hits.length === 1) return hits[0]
    const meanOf = (list: typeof hits): number => list.reduce((sum, hit) => sum + hit.distance, 0) / list.length
    let best: {position: vec3, normal: vec3, distance: number}[] = []
    if (trustExpected) {
      // The AI told us roughly how far the object is: among agreeing clusters
      // (and, penalized, lone hits) pick whatever depth matches that estimate.
      // On-device this is what separates the TV on the wall (2.8m) from the
      // sofa edge in front of it (2.2m) — geometry alone cannot.
      let bestScore = Number.MAX_VALUE
      for (let i = 0; i < hits.length; i++) {
        const members = hits.filter((hit) => Math.abs(hit.distance - hits[i].distance) < 25)
        const score = Math.abs(meanOf(members) - expectedDepth) + (members.length < 2 ? 50 : 0)
        if (score < bestScore) {
          bestScore = score
          best = members
        }
      }
      if (best.length === 1) return best[0]
    } else {
      // No estimate: prefer the NEAREST agreeing cluster (the object sits in
      // front of its background), lone-hit override when the cluster sits far
      // beyond what the bbox size suggests.
      for (let i = 0; i < hits.length; i++) {
        const members = hits.filter((hit) => Math.abs(hit.distance - hits[i].distance) < 25)
        if (members.length < 2) continue
        if (best.length === 0 || meanOf(members) < meanOf(best)) best = members
      }
      if (best.length >= 2 && meanOf(best) > expectedDepth * 1.35) {
        let plausible: {position: vec3, normal: vec3, distance: number} | null = null
        for (let i = 0; i < hits.length; i++) {
          if (hits[i].distance < 60 || hits[i].distance > expectedDepth * 1.25) continue
          if (!plausible || hits[i].distance < plausible.distance) plausible = hits[i]
        }
        if (plausible) return plausible
      }
    }
    if (best.length < 2) {
      let nearest = hits[0]
      for (let i = 1; i < hits.length; i++) if (hits[i].distance < nearest.distance) nearest = hits[i]
      return nearest
    }
    let position = vec3.zero()
    for (let i = 0; i < best.length; i++) position = position.add(best[i].position)
    position = position.uniformScale(1 / best.length)
    let closest = best[0]
    for (let i = 1; i < best.length; i++) if (best[i].distance < closest.distance) closest = best[i]
    return {position, normal: closest.normal}
  }

  /** Floats the card above its real-world anchor and ties them with a leader line. */
  private anchorCard(view: SpatialCardView, index: number, anchor: vec3, surfaceNormal: vec3 | null, captureOrigin: vec3): void {
    if (view.userMoved) return
    // Deadband: late refinements within 12cm keep the card still instead of
    // visibly sliding it around while rays trickle in.
    if (view.anchor && view.anchor.distance(anchor) < 12) {
      view.anchor = anchor
      return
    }
    view.anchor = anchor
    // Pull toward where the wearer STOOD when scanning, not where they wander later.
    const towardUser = captureOrigin.sub(anchor)
    const flat = new vec3(towardUser.x, 0, towardUser.z)
    const pullBack = flat.length > 1 ? flat.normalize().uniformScale(2) : vec3.zero()
    // The card sits ON the object like a pinned label: cards draw with
    // depthTest off, so centering on the anchor overlays the real thing.
    const lift = new vec3(0, 2, 0)
    let position = anchor.add(lift).add(pullBack)
    if (surfaceNormal && Math.abs(surfaceNormal.y) < 0.5) {
      // Wall anchors also push the card off the wall so it never clips into it.
      position = position.add(surfaceNormal.uniformScale(4))
    }
    view.root.getTransform().setWorldPosition(position)
    if (SCAN_DEBUG_LOGS) print(`[LINGO ANCHOR] card ${index + 1} at (${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)}, ${anchor.z.toFixed(0)})`)
    this.resolveOverlaps()
    if (!view.line) this.createLeader(view)
  }

  /** Deterministic pair-wise pass: card centers keep >=20cm, fanned apart sideways.
   * Runs after every (async) anchor update so late hits cannot re-stack cards. */
  private resolveOverlaps(): void {
    // 16cm keeps cards readable without shoving them off their own objects.
    const MINIMUM = 16
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.cards.length; i++) {
        for (let j = i + 1; j < this.cards.length; j++) {
          const a = this.cards[i]
          const b = this.cards[j]
          if (!a.anchor || !b.anchor || isNull(a.root) || isNull(b.root)) continue
          const positionA = a.root.getTransform().getWorldPosition()
          const positionB = b.root.getTransform().getWorldPosition()
          const distance = positionA.distance(positionB)
          if (distance >= MINIMUM) continue
          const flatDelta = new vec3(positionB.x - positionA.x, 0, positionB.z - positionA.z)
          const direction = flatDelta.length > 0.5 ? flatDelta.normalize() : this.worldCamera.right()
          const push = (MINIMUM - distance) * 0.5 + 1
          a.root.getTransform().setWorldPosition(positionA.add(direction.uniformScale(-push)))
          b.root.getTransform().setWorldPosition(positionB.add(direction.uniformScale(push)))
        }
      }
    }
  }

  private createLeader(view: SpatialCardView): void {
    // NEVER fall back to the card-frame texture: when the white pixel decoded
    // late, that fallback painted a giant violet card (paw hands included) in
    // the middle of the room. No texture yet -> no leader; updateLeaderLines
    // retries every frame and builds it as soon as the pixel is ready.
    if (!this.whiteTexture) return
    const line = global.scene.createSceneObject("Leader Line")
    line.setParent(this.lineContainer)
    const lineImage = line.createComponent("Component.Image") as Image
    const lineMaterial = IMAGE_MATERIAL.clone()
    lineMaterial.mainPass.baseTex = this.whiteTexture
    lineMaterial.mainPass.baseColor = new vec4(0.68, 0.55, 1, 0.9)
    lineMaterial.mainPass.depthTest = true
    lineMaterial.mainPass.depthWrite = false
    lineMaterial.mainPass.twoSided = true
    lineImage.clearMaterials()
    lineImage.addMaterial(lineMaterial)

    // No anchor dot anymore: cards sit ON their objects now, so the dot only
    // ever showed as a stray violet square floating in the room (a textured
    // 1px quad has no round silhouette). The tether line alone marks the
    // anchor when a card is carried away by hand.
    view.line = line
    view.lineMaterial = lineMaterial
  }

  /** Lights up the selected card's anchor: bright line, golden dot, gentle pop. */
  setSelected(index: number): void {
    if (index === this.selectedIndex) return
    this.selectedIndex = index
    const view = this.cards[index]
    if (view && !isNull(view.root)) this.fx.popIn(view.root, {rotateDegrees: 0, duration: 0.35})
  }

  private lastOcclusionSweep = 0

  /** Room-aware visibility: a WorldQuery ray from the wearer's head to each
   * card that reports a real surface well IN FRONT of the card (a wall, a
   * closed door) hides it, so other rooms' cards stop shining through walls.
   * Software occlusion is mandatory here — card materials render with
   * depthTest off, so a depth-writing occluder mesh could never hide them. */
  private updateOcclusion(): void {
    if (!this.session || !this.root.enabled) return
    const now = getTime()
    if (now - this.lastOcclusionSweep < 0.5) return
    this.lastOcclusionSweep = now
    const head = this.worldCamera.getWorldPosition()
    const generation = this.generation
    for (let i = 0; i < this.cards.length; i++) {
      const view = this.cards[i]
      if (isNull(view.root)) continue
      const cardPosition = view.root.getTransform().getWorldPosition()
      const cardDistance = cardPosition.distance(head)
      // Too close for a wall to fit in between: always visible.
      if (cardDistance < 120) {
        this.setCardOccluded(view, false)
        continue
      }
      this.session.hitTest(head, cardPosition, (hit) => {
        if (generation !== this.generation || isNull(view.root)) return
        // The card's own object sits at nearly the card's distance, so only a
        // hit at least 60cm in front of the card counts as a blocking wall.
        const occluded = !!hit && hit.position.distance(head) < cardDistance - 60
        this.setCardOccluded(view, occluded)
      })
    }
  }

  private setCardOccluded(view: SpatialCardView, occluded: boolean): void {
    if (view.root.enabled === !occluded) return
    view.root.enabled = !occluded
    if (view.line && !isNull(view.line)) view.line.enabled = !occluded
    if (view.dot && !isNull(view.dot)) view.dot.enabled = !occluded
  }

  private updateLeaderLines(): void {
    if (!this.root.enabled) return
    const cameraPosition = this.worldCamera.getWorldPosition()
    for (let i = 0; i < this.cards.length; i++) {
      const view = this.cards[i]
      // The leader may not exist yet (white-pixel texture decodes async):
      // build it here the moment the texture is ready.
      if (!view.line && view.anchor && this.whiteTexture) this.createLeader(view)
      if (!view.anchor || !view.line || isNull(view.line) || isNull(view.root) || !view.root.enabled) continue
      const selected = i === this.selectedIndex
      const cardPosition = view.root.getTransform().getWorldPosition()
      const delta = cardPosition.sub(view.anchor)
      const length = delta.length
      // Degenerate geometry guard: a corrupt/far anchor once inflated this
      // quad into a giant violet square mid-scene. Anything non-finite or
      // longer than a real card-to-object tether hides the whole connector.
      const healthy = isFinite(length) && isFinite(delta.x) && isFinite(delta.y) && isFinite(delta.z) && length <= 250
      if (!healthy || length < 3) {
        view.line.enabled = false
        if (view.dot && !isNull(view.dot)) view.dot.enabled = healthy
        continue
      }
      view.line.enabled = true
      const direction = delta.normalize()
      const midpoint = view.anchor.add(delta.uniformScale(0.5))
      const toCamera = cameraPosition.sub(midpoint).normalize()
      let side = direction.cross(toCamera)
      if (side.length < 0.001) side = new vec3(1, 0, 0)
      const facing = side.normalize().cross(direction).normalize()
      const lineTransform = view.line.getTransform()
      lineTransform.setWorldPosition(midpoint)
      lineTransform.setWorldRotation(quat.lookAt(facing, direction))
      // LOCAL scale on the identity line container: setWorldScale must invert
      // the fresh rotation and its lossy non-uniform decomposition is exactly
      // what blew the thin line up into a square.
      lineTransform.setLocalScale(new vec3(0.45, length, 1))
      // Runaway sentinel: whatever corrupts a transform (lossy world-scale
      // decomposition, engine hiccup), a connector may never render bigger
      // than its intended size — hide it the same frame instead.
      const lineWorld = lineTransform.getWorldScale()
      if (!isFinite(lineWorld.x) || Math.abs(lineWorld.x) > 5 || Math.abs(lineWorld.y) > 260) {
        view.line.enabled = false
        if (SCAN_DEBUG_LOGS) print(`[LINGO LEADER] runaway line scale ${lineWorld.x.toFixed(1)}x${lineWorld.y.toFixed(1)} — hidden`)
      }
      if (view.dot && !isNull(view.dot)) {
        const dotTransform = view.dot.getTransform()
        dotTransform.setWorldPosition(view.anchor)
        dotTransform.setWorldRotation(quat.lookAt(cameraPosition.sub(view.anchor).normalize(), vec3.up()))
        dotTransform.setLocalScale(LEADER_DOT_SCALE)
        const dotWorld = dotTransform.getWorldScale()
        if (!isFinite(dotWorld.x) || Math.abs(dotWorld.x) > 6 || Math.abs(dotWorld.y) > 6) {
          view.dot.enabled = false
          if (SCAN_DEBUG_LOGS) print(`[LINGO LEADER] runaway dot scale ${dotWorld.x.toFixed(1)}x${dotWorld.y.toFixed(1)} — hidden`)
        }
      }
    }
  }

  private rayModeLogged = false

  /** The calibrated capture ray, exposed for geometric dedupe: does a fresh
   * detection point at an object we already carded? */
  projectCaptureRay(screenPoint: vec2, capturePose: mat4): {start: vec3, end: vec3} {
    return this.captureRay(screenPoint, capturePose)
  }

  private captureRay(screenPoint: vec2, capturePose: mat4): {start: vec3, end: vec3} {
    try {
      const camera = global.deviceInfoSystem.getTrackingCameraForId(CameraModule.CameraId.Default_Color)
      // The AI sees the delivered FRAME, which can be a center-crop of the full
      // sensor the calibration models. Remap frame coords -> sensor coords so
      // bounding boxes land on the true pixels.
      let u = screenPoint.x
      let v = screenPoint.y
      const sensorAspect = camera.resolution.y > 0 ? camera.resolution.x / camera.resolution.y : 0
      if (this.captureAspect > 0 && sensorAspect > 0) {
        const ratio = this.captureAspect / sensorAspect
        if (ratio < 0.995) u = 0.5 + (u - 0.5) * ratio
        else if (ratio > 1.005) v = 0.5 + (v - 0.5) / ratio
      }
      const mapped = new vec2(u, v)
      const ray = {
        start: capturePose.multiplyPoint(camera.unproject(mapped, 2)),
        end: capturePose.multiplyPoint(camera.unproject(mapped, 450)),
      }
      if (!this.rayModeLogged) {
        this.rayModeLogged = true
        print(`[LINGO RAY] calibrated projection; sensor ${camera.resolution.x}x${camera.resolution.y}, frame aspect ${this.captureAspect.toFixed(3)}`)
      }
      return ray
    } catch (error) {
      // NEVER fall back to the current head pose: while the AI thinks the wearer
      // walks around, and current-pose rays would scatter every card. Approximate
      // a pinhole projection anchored to the CAPTURE pose instead.
      if (!this.rayModeLogged) {
        this.rayModeLogged = true
        print(`[LINGO RAY] tracking camera unavailable (${error}); pinhole fallback on capture pose`)
      }
      const origin = capturePose.multiplyPoint(vec3.zero())
      const forward = capturePose.multiplyDirection(new vec3(0, 0, -1)).normalize()
      const right = capturePose.multiplyDirection(new vec3(1, 0, 0)).normalize()
      const up = capturePose.multiplyDirection(new vec3(0, 1, 0)).normalize()
      // In Preview the captured frame IS the render camera's view, so its real
      // FOV/aspect makes the pinhole exact there; on device it stays a close fit.
      const renderCamera = this.worldCamera.getComponent()
      const tanHalfV = Math.tan(renderCamera.fov / 2)
      // Horizontal extent follows the CAPTURED frame's aspect (what the AI saw),
      // not the display's — mismatched aspects were skewing x placement.
      const tanHalfH = tanHalfV * (this.captureAspect > 0 ? this.captureAspect : renderCamera.aspect)
      const direction = forward
        .add(right.uniformScale((screenPoint.x - 0.5) * 2 * tanHalfH))
        .add(up.uniformScale((0.5 - screenPoint.y) * 2 * tanHalfV))
        .normalize()
      return {
        start: origin.add(direction.uniformScale(2)),
        end: origin.add(direction.uniformScale(450)),
      }
    }
  }

  private compactText(value: string, maxLength: number): string {
    const clean = String(value || "").replace(/\s+/g, " ").trim()
    return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean
  }

  private addFlexButton(parent: SceneObject, label: string, icon: Texture, width: number, tone: "primary" | "home"): Button {
    const root = this.makeObject(parent, label)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, tone)
    button.size = new vec3(width, 4, 1)
    button.onInitialized.add(() => button.size = new vec3(width, 4, 1))
    this.addImage(root, icon, new vec2(1.2, 1.2), new vec3(-width * 0.5 + 1.05, 0, 1.2))
    // The label rect starts to the RIGHT of the icon so long localized labels
    // ("MANTÉN PARA HABLAR") shrink into their own space and never cover the mic.
    const labelText = this.addText(root, label, width - 2.8, 2.6, "Caption", LINGO_COLORS.white, new vec3(0.75, 0, 1.35))
    labelText.horizontalOverflow = HorizontalOverflow.Shrink
    this.registerFlexItem(parent, root, width, 4, FlexAlignSelf.Center)
    return button
  }

  private addButton(parent: SceneObject, label: string, icon: Texture | null, position: vec3, width: number, tone: "primary" | "home" | "neutral"): Button {
    const root = this.makeObject(parent, label, position)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, tone)
    button.size = new vec3(width, 4.2, 1)
    button.onInitialized.add(() => button.size = new vec3(width, 4.2, 1))
    if (icon) this.addImage(root, icon, new vec2(1.15, 1.15), new vec3(-width * 0.5 + 1.2, 0, 1.2))
    this.addText(root, label, width - (icon ? 2.5 : 0.5), 3.1, "Caption", LINGO_COLORS.white, new vec3(icon ? 0.6 : 0, 0, 1.4))
    return button
  }

  private addImage(parent: SceneObject, texture: Texture, size: vec2, position: vec3): Material {
    const root = this.makeObject(parent, "Icon", position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(size.x > 8 ? CARD_RENDER_ORDER.frame : CARD_RENDER_ORDER.icon)
    root.getTransform().setLocalScale(new vec3(size.x, size.y, 1))
    return material
  }

  private addFlexText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4): Text {
    const text = this.addText(parent, value, width, height, role, color, vec3.zero())
    this.registerFlexItem(parent, text.getSceneObject(), width, height, FlexAlignSelf.Stretch)
    return text
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, position: vec3): Text {
    const root = this.makeObject(parent, `Text ${value}`, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    // World cards: explicit render order paints text over everything at any head angle.
    text.depthTest = false
    text.setRenderOrder(CARD_RENDER_ORDER.text)
    text.size = CARD_TYPE_SCALE[role].size
    ;(text as Text & {weight?: number}).weight = CARD_TYPE_SCALE[role].weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color
    return text
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }

  private registerFlexItem(parent: SceneObject, child: SceneObject, width: number, height: number, align: FlexAlignSelf): FlexItem {
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.flexShrink = 0
    item.alignSelf = align
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    return item
  }
}

export class LingoSpaceScanUI {
  private root: SceneObject
  private backgroundRoot!: SceneObject
  private languageText!: Text
  private situationText!: Text
  private summaryText!: Text
  private savedText!: Text
  private xpText!: Text
  private statusText!: Text
  private internetText!: Text
  private scanActionContent!: Text
  private menuActionContent!: Text
  private practiceActionContent!: Text
  private huntActionContent!: Text
  private scanningAnimActive = false
  private scanningAnimStep = 0
  private scanningAnimEvent: DelayedCallbackEvent | null = null
  private hasScanned = false
  private situation: ScanSituation | null = null
  private selectedObject = 0
  private selectedPhrase = 0
  private nativeLanguage: LanguageId = "English"
  private targetLanguage: LanguageId = "Spanish"
  private spatialCards: SpatialScanCards
  private fx!: LingoFX
  private scanButtonObject: SceneObject | null = null
  private scanPulseStop: (() => void) | null = null

  private _onScanRequested = new Event<void>()
  private _onListenRequested = new Event<void>()
  private _onVoiceHoldStart = new Event<void>()
  private _onVoiceHoldEnd = new Event<void>()
  private _onObjectSelected = new Event<number>()
  private _onPhraseSelected = new Event<number>()
  private _onPracticeSaved = new Event<void>()
  private _onHuntRequested = new Event<void>()
  private _onLanguagePickRequested = new Event<void>()
  private _onReturnToMenu = new Event<void>()
  private _onZoomRequested = new Event<number>()
  private _onPhraseSolved = new Event<number>()

  get onScanRequested(): PublicApi<void> { return this._onScanRequested.publicApi() }
  get onListenRequested(): PublicApi<void> { return this._onListenRequested.publicApi() }
  get onVoiceHoldStart(): PublicApi<void> { return this._onVoiceHoldStart.publicApi() }
  get onVoiceHoldEnd(): PublicApi<void> { return this._onVoiceHoldEnd.publicApi() }
  get onObjectSelected(): PublicApi<number> { return this._onObjectSelected.publicApi() }
  get onPhraseSelected(): PublicApi<number> { return this._onPhraseSelected.publicApi() }
  get onPracticeSaved(): PublicApi<void> { return this._onPracticeSaved.publicApi() }
  get onHuntRequested(): PublicApi<void> { return this._onHuntRequested.publicApi() }
  get onLanguagePickRequested(): PublicApi<void> { return this._onLanguagePickRequested.publicApi() }
  get onReturnToMenu(): PublicApi<void> { return this._onReturnToMenu.publicApi() }
  get onZoomRequested(): PublicApi<number> { return this._onZoomRequested.publicApi() }
  get onPhraseSolved(): PublicApi<number> { return this._onPhraseSolved.publicApi() }

  constructor(owner: SceneObject, private host: BaseScriptComponent) {
    this.fx = new LingoFX(host)
    // The owner (Board HUD) sits at +27 in the spatial panel. The HUD must end up
    // around +14 so it clears the MOVE/FOLLOW handles at +33 and stays inside the
    // Spectacles vertical FOV (~±40 at panel distance).
    this.root = this.makeObject(owner, "Spatial Scan HUD", new vec3(0, -13, 2))
    this.backgroundRoot = this.buildBackdrop()

    const content = this.makeObject(this.root, "Spatial Scan HUD Content", new vec3(0, 0, 1.3))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = 50
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Center
    // Rows need head-room for wrapped lines: text can wrap beyond its rect,
    // and tight rows made neighboring rows overlap visually.
    flex.rowGap = 0.4
    flex.paddingTop = 0.8
    flex.paddingBottom = 0.8
    flex.paddingLeft = 0.8
    flex.paddingRight = 0.8
    flex.onLayoutComplete.add((result) => {
      // Wrap the illustrated frame around the content with breathing room for
      // its rounded corners and bottom cloud band.
      this.backgroundRoot.getTransform().setLocalScale(new vec3(result.containerWidth + 5.5, result.containerHeight + 5, 1))
    })

    // Full-width, LEFT-aligned rows: centered ragged lines floated oddly in the
    // wide plate and wrapped early; left alignment uses the box edge to edge.
    this.languageText = this.addText(content, "SPANISH → FRENCH", 48, 1.5, "Caption", LINGO_COLORS.ink)
    // The language pair label doubles as the switcher: tap it to change target.
    this.addLanguageTapZone(this.languageText, 26)
    this.situationText = this.addText(content, "SCAN YOUR ENVIRONMENT", 48, 2.8, "Headline", LINGO_COLORS.purple)
    this.summaryText = this.addText(content, "Walk naturally and scan the objects around you.", 48, 2.6, "Body", LINGO_COLORS.ink)
    this.savedText = this.addText(content, "0 OBJECT CARDS SAVED", 48, 1.9, "Body", new vec4(0.05, 0.48, 0.43, 1))
    this.buildActions(content)
    this.statusText = this.addText(content, "Scan a place to begin.", 48, 3, "Body", LINGO_COLORS.ink)
    this.xpText = this.addText(content, "★ AUDIO 0  •  TEXT 0  •  TOTAL XP 0", 48, 2.6, "Body", new vec4(0.05, 0.48, 0.43, 1))
    this.internetText = this.addText(content, "", 48, 1.5, "Caption", new vec4(0.82, 0.34, 0.12, 1))

    this.spatialCards = new SpatialScanCards(
      host,
      (index) => this.chooseSpatialCard(index),
      () => this._onListenRequested.invoke(),
      () => this._onVoiceHoldStart.invoke(),
      () => this._onVoiceHoldEnd.invoke(),
      (index) => this._onPhraseSolved.invoke(index),
    )
    this.hide()
  }

  show(): void {
    this.root.enabled = true
    this.spatialCards.show()
  }

  private buildBackdrop(): SceneObject {
    const root = this.makeObject(this.root, "Scan HUD Background", new vec3(0, 0, 0.2))
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = HUD_BACKGROUND_TEXTURE
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(HUD_BACKGROUND_ORDER)
    root.getTransform().setLocalScale(new vec3(52, 42, 1))
    this.scheduleHudRenderOrderPass()
    return root
  }

  /** Same discipline as the quiz: background lowest, texts and button internals on top. */
  private scheduleHudRenderOrderPass(): void {
    const delays = [0.3, 1.2]
    for (let i = 0; i < delays.length; i++) {
      const delayed = this.host.createEvent("DelayedCallbackEvent")
      delayed.bind(() => {
        if (isNull(this.root)) return
        this.applyHudRenderOrders(this.root, false)
      })
      delayed.reset(delays[i])
    }
  }

  private applyHudRenderOrders(object: SceneObject, insideButton: boolean): void {
    const isButton = insideButton || !!object.getComponent(Button.getTypeName())
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      const typeName = visual.getTypeName()
      if (isButton) {
        if (typeName === "Component.Text") visual.setRenderOrder(CARD_RENDER_ORDER.buttonText)
        else if (typeName === "Component.Image") visual.setRenderOrder(CARD_RENDER_ORDER.buttonIcon)
        else visual.setRenderOrder(CARD_RENDER_ORDER.buttonMesh)
        continue
      }
      if (object === this.backgroundRoot) visual.setRenderOrder(HUD_BACKGROUND_ORDER)
      else if (typeName === "Component.Text") visual.setRenderOrder(CARD_RENDER_ORDER.text)
      else if (typeName === "Component.Image") visual.setRenderOrder(CARD_RENDER_ORDER.icon)
      else visual.setRenderOrder(CARD_RENDER_ORDER.plate)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) {
      this.applyHudRenderOrders(object.getChild(i), isButton)
    }
  }

  hide(): void {
    this.root.enabled = false
    this.stopScanningAnimation()
    if (this.scanPulseStop) {
      this.scanPulseStop()
      this.scanPulseStop = null
    }
    if (this.spatialCards) this.spatialCards.hide()
  }

  startRound(nativeLanguage: LanguageId, targetLanguage: LanguageId): void {
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.languageText.text = `${languageName(nativeLanguage, nativeLanguage)} → ${languageName(targetLanguage, nativeLanguage)}`
    this.situation = null
    this.selectedObject = 0
    this.selectedPhrase = 0
    this.situationText.text = lingoCopy(nativeLanguage, "guideTitle")
    this.summaryText.text = lingoCopy(nativeLanguage, "scanPrompt")
    this.statusText.text = lingoCopy(nativeLanguage, "scanPulseHint")
    // First contact says just "SCAN"; it becomes "SCAN AGAIN" once a scan happened.
    this.hasScanned = false
    this.scanActionContent.text = lingoCopy(nativeLanguage, "scan")
    // The pulsing scan button is the invitation to the first action of the mode.
    if (this.scanPulseStop) this.scanPulseStop()
    this.scanPulseStop = this.scanButtonObject ? this.fx.pulse(this.scanButtonObject, {amplitude: 0.08, hz: 1.3}) : null
    this.fx.popIn(this.root, {rotateDegrees: -6})
    this.stopScanningAnimation()
    this.menuActionContent.text = lingoCopy(nativeLanguage, "back")
    this.practiceActionContent.text = lingoCopy(nativeLanguage, "practiceSaved")
    this.huntActionContent.text = lingoCopy(nativeLanguage, "huntStart")
    this.setArtworkProgress(0, 0)
    this.spatialCards.clear()
    this.show()
  }

  setInternetAvailable(available: boolean): void {
    this.internetText.text = available ? "" : lingoCopy(this.nativeLanguage, "voiceNeedsInternet")
  }

  setXp(audioXp: number, textXp: number, earned: string = ""): void {
    this.xpText.text = `★ ${lingoCopy(this.nativeLanguage, "audioXp")} ${audioXp}  •  ${lingoCopy(this.nativeLanguage, "textXp")} ${textXp}  •  ${lingoCopy(this.nativeLanguage, "totalXp")} ${audioXp + textXp}${earned ? `  ${earned}` : ""}`
    this.xpText.textFill.color = earned ? new vec4(0.04, 0.5, 0.28, 1) : new vec4(0.05, 0.48, 0.43, 1)
  }

  showScanner(_texture: Texture | null): void {
    // The camera-ready refresh must not overwrite the first-time "SCAN" invitation.
    this.scanActionContent.text = lingoCopy(this.nativeLanguage, this.hasScanned ? "scanAgain" : "scan")
    // A late camera warm-up must not wipe cards the wearer already scanned,
    // nor the situation title/summary those cards belong to.
    if (this.spatialCards.count() === 0) {
      this.situationText.text = lingoCopy(this.nativeLanguage, "guideTitle")
      this.summaryText.text = lingoCopy(this.nativeLanguage, "scanPrompt")
      this.spatialCards.clear()
    }
    this.statusText.text = lingoCopy(this.nativeLanguage, this.hasScanned ? "spatialScanHint" : "scanPulseHint")
  }

  /** Pre-capture beat: ask the wearer to hold still so the photo comes out sharp. */
  showHoldStill(): void {
    if (this.scanPulseStop) {
      this.scanPulseStop()
      this.scanPulseStop = null
    }
    this.stopScanningAnimation()
    this.statusText.text = lingoCopy(this.nativeLanguage, "holdStill")
    this.statusText.textFill.color = new vec4(0.61, 0.42, 1, 1)
    this.summaryText.text = lingoCopy(this.nativeLanguage, "holdStill")
  }

  showScanning(): void {
    this.hasScanned = true
    if (this.scanPulseStop) {
      this.scanPulseStop()
      this.scanPulseStop = null
    }
    this.scanActionContent.text = lingoCopy(this.nativeLanguage, "scanning")
    this.situationText.text = lingoCopy(this.nativeLanguage, "scanning")
    this.summaryText.text = lingoCopy(this.nativeLanguage, "scanning")
    this.statusText.textFill.color = LINGO_COLORS.ink
    this.startScanningAnimation()
  }

  showFailure(message: string): void {
    this.stopScanningAnimation()
    this.scanActionContent.text = lingoCopy(this.nativeLanguage, "scanAgain")
    this.situationText.text = lingoCopy(this.nativeLanguage, "scanFailed")
    this.summaryText.text = message
    this.statusText.text = lingoCopy(this.nativeLanguage, "scanPrompt")
  }

  /** Rotating reassurance lines with animated dots while the AI analyzes the room. */
  private startScanningAnimation(): void {
    this.scanningAnimActive = true
    this.scanningAnimStep = 0
    this.stepScanningAnimation()
  }

  private stopScanningAnimation(): void {
    this.scanningAnimActive = false
    if (this.scanningAnimEvent) this.scanningAnimEvent.cancel()
  }

  private stepScanningAnimation(): void {
    if (!this.scanningAnimActive || !this.root.enabled) {
      this.scanningAnimActive = false
      return
    }
    const messages = [
      lingoCopy(this.nativeLanguage, "scanningBase"),
      lingoCopy(this.nativeLanguage, "scanningWait"),
      lingoCopy(this.nativeLanguage, "scanningLook"),
    ]
    const message = messages[Math.floor(this.scanningAnimStep / 4) % messages.length]
    const dots = ".".repeat(this.scanningAnimStep % 4)
    this.statusText.text = `${message}${dots}`
    this.scanningAnimStep += 1
    if (!this.scanningAnimEvent) {
      this.scanningAnimEvent = this.host.createEvent("DelayedCallbackEvent")
      this.scanningAnimEvent.bind(() => this.stepScanningAnimation())
    }
    this.scanningAnimEvent.reset(0.45)
  }

  showSituation(situation: ScanSituation, _texture: Texture, savedCount: number, readyCount: number, capturePose: mat4, append: boolean): void {
    this.stopScanningAnimation()
    this.scanActionContent.text = lingoCopy(this.nativeLanguage, "scanAgain")
    this.situation = situation
    this.situationText.text = situation.situationTranslation.toUpperCase()
    this.summaryText.text = situation.summary
    this.spatialCards.build(situation, this.nativeLanguage, capturePose, append)
    // Focus lands on the first card of THIS scan; earlier rooms stay anchored.
    // A fully-deduped scan adds no cards, so the previous selection stays put.
    if (situation.objects.length > 0) {
      const firstNew = this.spatialCards.count() - situation.objects.length
      this.selectObject(Math.max(0, firstNew))
    }
    this.setArtworkProgress(savedCount, readyCount)
    this.statusText.text = `${this.spatialCards.count()} · ${lingoCopy(this.nativeLanguage, "spatialCardsReady")}`
  }

  selectObject(index: number): void {
    const total = this.spatialCards.count()
    if (total === 0) return
    this.selectedObject = Math.max(0, Math.min(index, total - 1))
    // Light up the chosen card's anchor so the wearer sees WHICH object is active.
    this.spatialCards.setSelected(this.selectedObject)
    // Cards and phrases stay index-aligned across accumulated scans.
    this.selectPhrase(this.selectedObject)
  }

  selectPhrase(index: number): void {
    const total = this.spatialCards.count()
    if (total === 0) return
    this.selectedPhrase = Math.max(0, Math.min(index, total - 1))
  }

  setArtworkProgress(savedCount: number, readyCount: number): void {
    this.savedText.text = `✓ ${savedCount} ${lingoCopy(this.nativeLanguage, "savedCards")}  •  ${readyCount} ${lingoCopy(this.nativeLanguage, "illustrationsReady")}`
  }

  setArtwork(index: number, texture: Texture): void { this.spatialCards.setArtwork(index, texture) }

  cardAnchor(index: number): vec3 | null { return this.spatialCards.cardAnchor(index) }

  huntableIndices(): number[] { return this.spatialCards.huntableIndices() }

  projectScanRay(screenPoint: vec2, capturePose: mat4): {start: vec3, end: vec3} {
    return this.spatialCards.projectCaptureRay(screenPoint, capturePose)
  }

  reanchorCard(index: number, bounds: {x: number, y: number, width: number, height: number}, capturePose: mat4, aiDistanceCm: number): void {
    this.spatialCards.reanchorCard(index, bounds, capturePose, aiDistanceCm)
  }

  startPhrasePuzzle(index: number): boolean { return this.spatialCards.startPhrasePuzzle(index) }

  setCaptureAspect(aspect: number): void { this.spatialCards.setCaptureAspect(aspect) }

  showVoiceStatus(message: string): void {
    this.statusText.text = message
    this.statusText.textFill.color = LINGO_COLORS.ink
  }

  showPronunciationResult(correct: boolean, message: string): void {
    this.statusText.text = message
    // Dark verdict tones stay readable on the cream plate (light mint was invisible).
    this.statusText.textFill.color = correct ? new vec4(0.08, 0.56, 0.4, 1) : new vec4(0.82, 0.34, 0.12, 1)
    // The learner is looking at the card, not the HUD: mirror the verdict there.
    this.spatialCards.showFeedback(this.selectedObject, correct, message)
  }

  private chooseSpatialCard(index: number): void {
    this.selectObject(index)
    this._onObjectSelected.invoke(index)
    this._onPhraseSelected.invoke(this.selectedPhrase)
  }

  private buildActions(parent: SceneObject): void {
    // Listen/talk live on the spatial cards themselves; the HUD keeps the two
    // navigation actions plus the review row (saved practice + word hunt).
    const utilityRow = this.makeActionRow(parent, "Spatial Navigation Actions", 4.4)
    // Primary purple for the hero action, neutral ink for MENU — the same pair
    // the quiz and the MOVE/FOLLOW handles use.
    this.addActionButton(utilityRow, "SCAN AGAIN", CAMERA_ICON, 20.5, "primary", () => this._onScanRequested.invoke())
    this.addActionButton(utilityRow, "MENU", null, 20.9, "neutral", () => this._onReturnToMenu.invoke())
    const reviewRow = this.makeActionRow(parent, "Saved Review Actions", 4.4)
    this.addActionButton(reviewRow, "PRACTICE SAVED", null, 20.5, "home", () => this._onPracticeSaved.invoke())
    this.addActionButton(reviewRow, "WORD HUNT", null, 20.9, "home", () => this._onHuntRequested.invoke())
  }

  /** Full pill corners: the marshmallow look shared by every other screen. */
  private marshmallow(button: Button): void {
    button.onInitialized.add(() => {
      const visual = button.visual as RoundedRectangleVisual
      if (visual instanceof RoundedRectangleVisual) visual.cornerRadius = 2.05
    })
  }

  /** An invisible touch box over the language label: no layout change, one tap. */
  private addLanguageTapZone(text: Text, width: number): void {
    const zone = text.getSceneObject()
    const collider = zone.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(width, 2.8, 0.6)
    collider.shape = shape
    const interactable = zone.createComponent(Interactable.getTypeName()) as Interactable
    interactable.onTriggerEnd.add(() => this._onLanguagePickRequested.invoke())
  }

  private makeActionRow(parent: SceneObject, name: string, height: number): SceneObject {
    const row = this.makeObject(parent, name)
    const flex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = 48
    flex.height = height
    flex.direction = FlexDirection.Row
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.columnGap = 0.6
    this.registerFlexItem(parent, row, 48, height, FlexAlignSelf.Center)
    return row
  }

  private addActionButton(parent: SceneObject, label: string, icon: Texture | null, width: number, tone: "home" | "primary" | "neutral", onClick?: () => void): Button {
    const root = this.makeObject(parent, label)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, tone)
    this.marshmallow(button)
    button.size = new vec3(width, 4.1, 1)
    button.onInitialized.add(() => button.size = new vec3(width, 4.1, 1))
    if (icon) this.addTextureImage(root, icon, 1.35, `${label} Icon`, new vec3(-width * 0.5 + 1.35, 0, 1.35))
    const labelText = this.addOverlayText(root, label, width - (icon ? 3.4 : 1.2), 2.7, "Caption", LINGO_COLORS.white, new vec3(icon ? 0.65 : 0, 0, 1.35))
    if (label === "SCAN AGAIN") {
      this.scanActionContent = labelText
      this.scanButtonObject = root
    }
    if (label === "MENU") this.menuActionContent = labelText
    if (label === "PRACTICE SAVED") this.practiceActionContent = labelText
    if (label === "WORD HUNT") this.huntActionContent = labelText
    this.registerFlexItem(parent, root, width, 4.1, FlexAlignSelf.Center)
    if (onClick) button.onTriggerUp.add(onClick)
    return button
  }

  private addTextureImage(parent: SceneObject, texture: Texture, size: number, name: string, position: vec3): void {
    const root = this.makeObject(parent, name, position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    root.getTransform().setLocalScale(new vec3(size, size, 1))
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
    const root = this.makeObject(parent, `Text ${role}`)
    const text = this.addOverlayText(root, value, width, height, role, color, vec3.zero(), alignment)
    this.registerFlexItem(parent, root, width, height, FlexAlignSelf.Stretch)
    return text
  }

  private addOverlayText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, position: vec3, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
    const root = position.equal(vec3.zero()) ? parent : this.makeObject(parent, `Overlay ${value}`, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = false
    text.size = TYPE_SCALE[role].size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
    text.horizontalAlignment = alignment
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color
    return text
  }

  private registerFlexItem(parent: SceneObject, child: SceneObject, width: number, height: number, align: FlexAlignSelf): FlexItem {
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.flexShrink = 0
    item.alignSelf = align
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    return item
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
