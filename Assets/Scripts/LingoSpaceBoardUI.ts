/** Spatial board, AI image card, scanner controls, voice coach UI and drop feedback. */
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./compat515/FlexTypes515"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button515 as Button} from "./compat515/Button515"
import {ElementContent515 as ElementContent} from "./compat515/ElementContent515"
import {afterComponentStart} from "./compat515/Timing515"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {CategoryId, LanguageId, LearningMode, ScanSituation} from "./LingoSpaceData"
import {LingoSpaceScanUI} from "./LingoSpaceScanUI"
import {categoryName, languageName, lingoCopy} from "./LingoSpaceLocalization"
import {categoryTone, LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"

type CategoryView = {id: CategoryId, root: SceneObject, button: Button, countText: Text, icon: Texture}
type ActionButtonView = {root: SceneObject, item: FlexItem, button: Button, content: ElementContent}
type ScanSelectorView = {root: SceneObject, item: FlexItem, button: Button}
type TextRole = "Headline1" | "Headline2" | "Subheadline" | "Body" | "Caption"

const VOICE_NEUTRAL = LINGO_COLORS.ink
const VOICE_CORRECT = new vec4(0.08, 0.56, 0.4, 1)
const VOICE_RETRY = new vec4(0.82, 0.34, 0.12, 1)

const IMAGE_MATERIAL: Material = IMAGE_MATERIAL_ASSET
const CAMERA_ICON: Texture = requireAsset("../Icons/photo_camera.png") as Texture
const MIC_ICON: Texture = requireAsset("../Icons/mic.png") as Texture
const VOLUME_ICON: Texture = requireAsset("../Icons/volume_up.png") as Texture
const TAPE_TEXTURE: Texture = requireAsset("../LingoDesign/cinta.png") as Texture
const CARD_FRAME_TEXTURE: Texture = requireAsset("../BoardDesign/card central.png") as Texture
const CLOUD_MESSAGE_TEXTURE: Texture = requireAsset("../BoardDesign/cloud-messages-b.png") as Texture

const CATEGORY_ICONS: Record<CategoryId, Texture> = {
  HOME: requireAsset("../BoardDesign/home.png") as Texture,
  FOOD: requireAsset("../BoardDesign/food.png") as Texture,
  WORK: requireAsset("../BoardDesign/work.png") as Texture,
  TRAVEL: requireAsset("../BoardDesign/travel.png") as Texture,
  PEOPLE: requireAsset("../BoardDesign/people.png") as Texture,
  OUTSIDE: requireAsset("../BoardDesign/outside.png") as Texture,
}

export const CARD_IMAGES: Record<string, Texture> = {
  cup: requireAsset("../AIImagesKawaii/cup.png") as Texture,
  bed: requireAsset("../AIImagesKawaii/bed.png") as Texture,
  train: requireAsset("../AIImagesKawaii/train.png") as Texture,
  coworker: requireAsset("../AIImagesKawaii/coworker.png") as Texture,
  apple: requireAsset("../AIImagesKawaii/apple.png") as Texture,
  tree: requireAsset("../AIImagesKawaii/tree.png") as Texture,
  chair: requireAsset("../AIImagesKawaii/chair.png") as Texture,
  lamp: requireAsset("../AIImagesKawaii/lamp.png") as Texture,
  bread: requireAsset("../AIImagesKawaii/bread.png") as Texture,
  banana: requireAsset("../AIImagesKawaii/banana.png") as Texture,
  bicycle: requireAsset("../AIImagesKawaii/bicycle.png") as Texture,
  suitcase: requireAsset("../AIImagesKawaii/suitcase.png") as Texture,
  laptop: requireAsset("../AIImagesKawaii/laptop.png") as Texture,
  book: requireAsset("../AIImagesKawaii/book.png") as Texture,
  flower: requireAsset("../AIImagesKawaii/flower.png") as Texture,
  dog: requireAsset("../AIImagesKawaii/dog.png") as Texture,
  teacher: requireAsset("../AIImagesKawaii/teacher.png") as Texture,
  doctor: requireAsset("../AIImagesKawaii/doctor.png") as Texture,
}

const TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}

@component
export class LingoSpaceBoardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #A78BFA;">Lingo Specs Board – spatial vocabulary organizer</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Authored root used for the draggable vocabulary card")
  cardRoot!: SceneObject
  @input
  @hint("Authored HOME collection target")
  homeRoot!: SceneObject
  @input
  @hint("Authored FOOD collection target")
  foodRoot!: SceneObject
  @input
  @hint("Authored WORK collection target")
  workRoot!: SceneObject
  @input
  @hint("Authored TRAVEL collection target")
  travelRoot!: SceneObject
  @input
  @hint("Authored PEOPLE collection target")
  peopleRoot!: SceneObject
  @input
  @hint("Authored OUTSIDE collection target")
  outsideRoot!: SceneObject
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Coach sentence shown below the action buttons in image-card mode")
  imageCoachPrompt: string = "Cloudy says: listen, speak, then drag the card to its place."
  @input
  @hint("Coach sentence shown while scanning real objects")
  scanCoachPrompt: string = "Cloudy says: keep several objects visible and scan your space."
  @ui.group_end

  private languageText!: Text
  private hudPlate!: BackPlate
  private hudContentRoot!: SceneObject
  private scanUI!: LingoSpaceScanUI
  private modeText!: Text
  private progressText!: Text
  private xpText!: Text
  private feedbackText!: Text
  private tutorialText!: Text
  private voiceStatusText!: Text
  private internetText!: Text
  private coachBubbleRoot!: SceneObject
  private zoomControlsRoot!: SceneObject
  private cardImage!: Image
  private cardImageMaterial!: Material
  private cardWordText!: Text
  private cardTranslationText!: Text
  private scanButton!: Button
  private scanContent!: ElementContent
  private micContent!: ElementContent
  private menuContent!: ElementContent
  private hudFlex!: FlexLayout
  private actionFlex!: FlexLayout
  private scanAction!: ActionButtonView
  private scanActionRegistered = true
  private scanSelectorRoot!: SceneObject
  private scanSelectorFlex!: FlexLayout
  private scanSelectorItem!: FlexItem
  private scanSelectorRegistered = false
  private scanSelectorViews: ScanSelectorView[] = []
  private categories: CategoryView[] = []
  private counts: Record<CategoryId, number> = {HOME: 0, FOOD: 0, WORK: 0, TRAVEL: 0, PEOPLE: 0, OUTSIDE: 0}
  private collections: Record<CategoryId, string[]> = {HOME: [], FOOD: [], WORK: [], TRAVEL: [], PEOPLE: [], OUTSIDE: []}
  private cardHome = vec3.zero()
  private dragging = false
  private cardReady = false
  private highlighted: CategoryId | null = null
  private learningMode: LearningMode = "IMAGE"
  private nativeLanguage: LanguageId = "English"
  private _onCardDropped = new Event<string>()
  private _onScanRequested = new Event<void>()
  private _onListenRequested = new Event<void>()
  private _onVoiceHoldStart = new Event<void>()
  private _onVoiceHoldEnd = new Event<void>()
  private _onScanCardSelected = new Event<number>()
  private _onScanPhraseSelected = new Event<number>()
  private _onPracticeSavedCards = new Event<void>()
  private _onHuntRequested = new Event<void>()
  private _onLanguagePickRequested = new Event<void>()
  private _onReturnToMenu = new Event<void>()
  private _onZoomRequested = new Event<number>()
  private _onScanPhraseSolved = new Event<number>()

  get onCardDropped(): PublicApi<string> { return this._onCardDropped.publicApi() }
  get onScanRequested(): PublicApi<void> { return this._onScanRequested.publicApi() }
  get onListenRequested(): PublicApi<void> { return this._onListenRequested.publicApi() }
  get onVoiceHoldStart(): PublicApi<void> { return this._onVoiceHoldStart.publicApi() }
  get onVoiceHoldEnd(): PublicApi<void> { return this._onVoiceHoldEnd.publicApi() }
  get onScanCardSelected(): PublicApi<number> { return this._onScanCardSelected.publicApi() }
  get onScanPhraseSelected(): PublicApi<number> { return this._onScanPhraseSelected.publicApi() }
  get onPracticeSavedCards(): PublicApi<void> { return this._onPracticeSavedCards.publicApi() }
  get onHuntRequested(): PublicApi<void> { return this._onHuntRequested.publicApi() }
  get onLanguagePickRequested(): PublicApi<void> { return this._onLanguagePickRequested.publicApi() }
  get onReturnToMenu(): PublicApi<void> { return this._onReturnToMenu.publicApi() }
  get onZoomRequested(): PublicApi<number> { return this._onZoomRequested.publicApi() }
  get onScanPhraseSolved(): PublicApi<number> { return this._onScanPhraseSolved.publicApi() }

  onAwake(): void {
    if (!this.cardRoot || !this.homeRoot || !this.foodRoot || !this.workRoot || !this.travelRoot || !this.peopleRoot || !this.outsideRoot) {
      print("LINGO SPACE BoardUI awaiting authored roots")
      return
    }
    this.cardHome = this.cardRoot.getTransform().getLocalPosition()
    this.buildHud()
    this.buildZoomControls()
    this.scanUI = new LingoSpaceScanUI(this.sceneObject, this)
    this.scanUI.onScanRequested.add(() => this._onScanRequested.invoke())
    this.scanUI.onListenRequested.add(() => this._onListenRequested.invoke())
    this.scanUI.onVoiceHoldStart.add(() => this._onVoiceHoldStart.invoke())
    this.scanUI.onVoiceHoldEnd.add(() => this._onVoiceHoldEnd.invoke())
    this.scanUI.onObjectSelected.add((index) => this._onScanCardSelected.invoke(index))
    this.scanUI.onPhraseSelected.add((index) => this._onScanPhraseSelected.invoke(index))
    this.scanUI.onPracticeSaved.add(() => this._onPracticeSavedCards.invoke())
    this.scanUI.onHuntRequested.add(() => this._onHuntRequested.invoke())
    this.scanUI.onLanguagePickRequested.add(() => this._onLanguagePickRequested.invoke())
    this.scanUI.onReturnToMenu.add(() => this._onReturnToMenu.invoke())
    this.scanUI.onZoomRequested.add((direction) => this._onZoomRequested.invoke(direction))
    this.scanUI.onPhraseSolved.add((index) => this._onScanPhraseSolved.invoke(index))
    this.buildCategory("HOME", this.homeRoot)
    this.buildCategory("FOOD", this.foodRoot)
    this.buildCategory("WORK", this.workRoot)
    this.buildCategory("TRAVEL", this.travelRoot)
    this.buildCategory("PEOPLE", this.peopleRoot)
    this.buildCategory("OUTSIDE", this.outsideRoot)
    this.buildCard()
    this.createEvent("UpdateEvent").bind(() => this.updateDragFeedback())
    this.hide()
  }

  show(): void {
    this.sceneObject.enabled = true
    const imageMode = this.learningMode === "IMAGE"
    this.hudPlate.enabled = imageMode
    this.hudContentRoot.enabled = imageMode
    this.coachBubbleRoot.enabled = imageMode
    this.zoomControlsRoot.enabled = imageMode
    this.cardRoot.enabled = imageMode
    for (let i = 0; i < this.categories.length; i++) this.categories[i].root.enabled = imageMode
    if (!this.scanUI) return
    if (imageMode) this.scanUI.hide()
    else this.scanUI.show()
  }

  hide(): void {
    this.sceneObject.enabled = false
    if (this.cardRoot) this.cardRoot.enabled = false
    for (let i = 0; i < this.categories.length; i++) this.categories[i].root.enabled = false
    if (this.scanUI) this.scanUI.hide()
  }

  startRound(nativeLanguage: LanguageId, targetLanguage: LanguageId, mode: LearningMode): void {
    this.learningMode = mode
    this.nativeLanguage = nativeLanguage
    this.counts = {HOME: 0, FOOD: 0, WORK: 0, TRAVEL: 0, PEOPLE: 0, OUTSIDE: 0}
    this.collections = {HOME: [], FOOD: [], WORK: [], TRAVEL: [], PEOPLE: [], OUTSIDE: []}
    this.languageText.text = `${languageName(nativeLanguage, nativeLanguage)} → ${languageName(targetLanguage, nativeLanguage)}`
    this.modeText.text = mode === "SCAN" ? lingoCopy(nativeLanguage, "scanMode") : lingoCopy(nativeLanguage, "imageMode")
    this.setProgress(0, 6)
    this.feedbackText.text = ""
    this.voiceStatusText.text = lingoCopy(nativeLanguage, "listenPhrase")
    this.tutorialText.text = mode === "SCAN" ? lingoCopy(nativeLanguage, "scanPrompt") : lingoCopy(nativeLanguage, "readyHint")
    this.scanContent.text = lingoCopy(nativeLanguage, "scanAgain")
    this.micContent.text = lingoCopy(nativeLanguage, "holdToTalk")
    this.menuContent.text = lingoCopy(nativeLanguage, "mainMenu")
    this.setScanActionVisible(mode === "SCAN")
    this.clearScanCandidates()
    for (let i = 0; i < this.categories.length; i++) this.refreshCategory(this.categories[i])
    if (mode === "SCAN" && this.scanUI) this.scanUI.startRound(nativeLanguage, targetLanguage)
    this.show()
  }

  setProgress(done: number, total: number): void {
    const dots = "● ".repeat(done) + "○ ".repeat(Math.max(0, total - done))
    this.progressText.text = `${done} / ${total} ${lingoCopy(this.nativeLanguage, "organized")}    ${dots}`
  }

  setXp(audioXp: number, textXp: number, earned: string = ""): void {
    this.xpText.text = `★  ${lingoCopy(this.nativeLanguage, "audioXp")} ${audioXp}   •   ${lingoCopy(this.nativeLanguage, "textXp")} ${textXp}   •   ${lingoCopy(this.nativeLanguage, "totalXp")} ${audioXp + textXp}${earned ? `   ${earned}` : ""}`
    this.xpText.textFill.color = earned ? VOICE_CORRECT : LINGO_COLORS.ink
    if (this.scanUI) this.scanUI.setXp(audioXp, textXp, earned)
  }

  setInternetAvailable(available: boolean): void {
    this.internetText.text = available ? "" : lingoCopy(this.nativeLanguage, "voiceNeedsInternet")
    if (this.scanUI) this.scanUI.setInternetAvailable(available)
  }

  showScanner(cameraTexture: Texture | null): void {
    if (this.learningMode === "SCAN") {
      if (this.scanUI) this.scanUI.showScanner(cameraTexture)
      return
    }
    this.clearScanCandidates()
    this.cardReady = false
    this.resetCardPosition()
    if (cameraTexture) this.setImage(cameraTexture)
    this.cardWordText.text = "POINT AT OBJECTS"
    this.cardTranslationText.text = "Press SCAN to create several cards"
    this.cardRoot.enabled = true
    this.feedbackText.text = "Camera ready"
    this.tutorialText.text = "Keep several distinct objects clearly visible."
  }

  showScanHoldStill(): void {
    if (this.learningMode === "SCAN" && this.scanUI) this.scanUI.showHoldStill()
  }

  showScanning(): void {
    if (this.learningMode === "SCAN") {
      if (this.scanUI) this.scanUI.showScanning()
      return
    }
    this.clearScanCandidates()
    this.cardReady = false
    this.feedbackText.text = "ANALYZING SCENE…"
    this.cardWordText.text = "CREATING CARDS…"
    this.cardTranslationText.text = "OpenAI is identifying visible objects"
  }

  showScanFailure(message: string): void {
    if (this.learningMode === "SCAN") {
      if (this.scanUI) this.scanUI.showFailure(message)
      return
    }
    this.cardReady = false
    this.feedbackText.text = message
    this.cardWordText.text = "TRY ANOTHER ANGLE"
    this.cardTranslationText.text = "Keep visible objects separated and scan again"
  }

  showCard(imageKey: string, targetWord: string, translation: string, overrideTexture?: Texture): void {
    this.resetCardPosition()
    this.setImage(overrideTexture || CARD_IMAGES[imageKey] || CARD_IMAGES.cup)
    this.cardWordText.text = targetWord
    this.cardTranslationText.text = translation
    this.cardRoot.enabled = true
    this.cardReady = true
    this.feedbackText.text = ""
  }

  setScanCandidates(candidates: {word: string}[], selectedIndex: number): void {
    if (candidates.length <= 1) {
      this.clearScanCandidates()
      return
    }
    const visible = Math.min(5, candidates.length)
    if (this.scanSelectorViews.length === visible) {
      for (let i = 0; i < this.scanSelectorViews.length; i++) {
        this.scanSelectorViews[i].button.isOn = i === selectedIndex
        this.scanSelectorViews[i].button.opacity = i === selectedIndex ? 1 : 0.72
      }
      this.setScanSelectorVisible(true)
      return
    }
    this.clearScanCandidates()
    const gap = 0.45
    const width = (43 - gap * (visible - 1)) / visible
    for (let i = 0; i < visible; i++) {
      const root = this.makeObject(this.scanSelectorRoot, `Scan Card ${i + 1}`)
      const button = root.createComponent(Button.getTypeName()) as Button
      button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
      styleLingoButton(button, "neutral")
      button.setIsToggleable(true)
      button.isOn = i === selectedIndex
      button.opacity = i === selectedIndex ? 1 : 0.72
      const content = root.createComponent(ElementContent.getTypeName()) as ElementContent
      const shortWord = candidates[i].word.length > 9 ? `${candidates[i].word.slice(0, 8)}…` : candidates[i].word
      content.text = `${i + 1} · ${shortWord}`
      content.textSize = TYPE_SCALE.Caption.size
      content.contentAlignment = "center"
      const item = this.registerFlexItem(this.scanSelectorRoot, root, width, 3.4, FlexAlignSelf.Center)
      button.onInitialized.add(() => button.size = new vec3(width, 3.4, 1))
      const index = i
      button.onTriggerUp.add(() => this._onScanCardSelected.invoke(index))
      this.scanSelectorViews.push({root, item, button})
    }
    this.setScanSelectorVisible(true)
  }

  clearScanCandidates(): void {
    if (!this.scanSelectorFlex) return
    if (this.scanSelectorViews.length > 0) {
      this.scanSelectorFlex.removeItems(this.scanSelectorViews.map((view) => view.item))
      for (let i = 0; i < this.scanSelectorViews.length; i++) this.scanSelectorViews[i].root.destroy()
      this.scanSelectorViews = []
    }
    this.setScanSelectorVisible(false)
  }

  showSituation(situation: ScanSituation, texture: Texture, savedCount: number, readyCount: number, capturePose: mat4, append: boolean): void {
    if (this.scanUI) this.scanUI.showSituation(situation, texture, savedCount, readyCount, capturePose, append)
  }

  selectScanObject(index: number): void {
    if (this.scanUI) this.scanUI.selectObject(index)
  }

  selectScanPhrase(index: number): void {
    if (this.scanUI) this.scanUI.selectPhrase(index)
  }

  setScanArtworkProgress(savedCount: number, readyCount: number): void {
    if (this.scanUI) this.scanUI.setArtworkProgress(savedCount, readyCount)
  }

  setScanArtwork(index: number, texture: Texture): void {
    if (this.scanUI) this.scanUI.setArtwork(index, texture)
  }

  /** World anchor of a session scan card; null while placement is resolving. */
  scanCardAnchor(index: number): vec3 | null {
    if (!this.scanUI) return null
    return this.scanUI.cardAnchor(index)
  }

  /** Card indices the wearer can actually see and reach right now. */
  scanHuntableIndices(): number[] {
    if (!this.scanUI) return []
    return this.scanUI.huntableIndices()
  }

  /** Calibrated capture ray for a normalized frame point; null before init. */
  projectScanRay(screenPoint: vec2, capturePose: mat4): {start: vec3, end: vec3} | null {
    if (!this.scanUI) return null
    return this.scanUI.projectScanRay(screenPoint, capturePose)
  }

  reanchorScanCard(index: number, bounds: {x: number, y: number, width: number, height: number}, capturePose: mat4, aiDistanceCm: number): void {
    if (!this.scanUI) return
    this.scanUI.reanchorCard(index, bounds, capturePose, aiDistanceCm)
  }

  startScanPhrasePuzzle(index: number): boolean {
    if (!this.scanUI) return false
    return this.scanUI.startPhrasePuzzle(index)
  }

  setScanCaptureAspect(aspect: number): void {
    if (this.scanUI) this.scanUI.setCaptureAspect(aspect)
  }

  showVoiceStatus(message: string): void {
    if (this.learningMode === "SCAN") {
      if (this.scanUI) this.scanUI.showVoiceStatus(message)
      return
    }
    this.voiceStatusText.text = message
    this.voiceStatusText.textFill.color = VOICE_NEUTRAL
  }

  showPronunciationResult(correct: boolean, message: string): void {
    if (this.learningMode === "SCAN") {
      if (this.scanUI) this.scanUI.showPronunciationResult(correct, message)
      return
    }
    this.voiceStatusText.text = message
    this.voiceStatusText.textFill.color = correct ? VOICE_CORRECT : VOICE_RETRY
  }

  acceptDrop(categoryId: string, categoryCount: number, word: string): void {
    const id = categoryId as CategoryId
    this.counts[id] = categoryCount
    if (word && this.collections[id].indexOf(word) < 0) this.collections[id].push(word)
    for (let i = 0; i < this.categories.length; i++) {
      if (this.categories[i].id === id) this.refreshCategory(this.categories[i])
    }
    this.feedbackText.text = `✓ SAVED TO ${id} COLLECTION`
    this.tutorialText.text = ""
    this.cardReady = false
    this.cardRoot.enabled = false
    this.clearScanCandidates()
    this.clearHighlight()
  }

  rejectDrop(): void {
    this.feedbackText.text = "Hmm… would you use this somewhere else?"
    this.resetCardPosition()
    this.clearHighlight()
  }

  private buildHud(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    this.hudPlate = plate
    plate.style = "simple"
    afterComponentStart(this, () => this.styleRoundedPlate(
      this.sceneObject,
      new vec4(1, 0.96, 0.9, 0.92),
      new vec4(0.72, 0.55, 1, 0.95),
      2.2,
    ))
    const content = this.makeObject(this.sceneObject, "Content", new vec3(0, 0, 1.3))
    this.hudContentRoot = content
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.hudFlex = flex
    flex.autoDiscoverItemsOnStart = false
    flex.width = 46
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Start
    flex.rowGap = 0.16
    flex.paddingTop = 1.15
    flex.paddingBottom = 0.55
    flex.paddingLeft = 1.2
    flex.paddingRight = 1.2
    flex.onLayoutComplete.add((result) => plate.size = new vec2(result.containerWidth, result.containerHeight))
    this.languageText = this.addText(content, "SPANISH → GERMAN", 43, 1.25, "Headline2", LINGO_COLORS.ink)
    this.modeText = this.addText(content, "MODE • AI IMAGE CARDS", 43, 1.15, "Subheadline", LINGO_COLORS.purple)
    this.progressText = this.addText(content, "0 / 6 ORGANIZED    ○ ○ ○ ○ ○ ○", 43, 1.25, "Subheadline", LINGO_COLORS.ink)
    this.xpText = this.addText(content, "★  AUDIO 0   •   TEXT 0   •   TOTAL XP 0", 43, 1.3, "Subheadline", LINGO_COLORS.ink)
    this.feedbackText = this.addText(content, "", 43, 1.5, "Subheadline", new vec4(0.08, 0.48, 0.34, 1))
    this.tutorialText = this.addText(content, this.imageCoachPrompt, 43, 1.9, "Caption", LINGO_COLORS.ink)

    const actions = this.makeObject(content, "AI Actions")
    const actionFlex = actions.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.actionFlex = actionFlex
    actionFlex.autoDiscoverItemsOnStart = false
    actionFlex.width = 43
    actionFlex.height = 4.25
    actionFlex.direction = FlexDirection.Row
    actionFlex.alignItems = FlexAlign.Center
    actionFlex.justifyContent = FlexJustify.Center
    actionFlex.columnGap = 0.8
    this.registerFlexItem(content, actions, 43, 4.25)
    const menu = this.addActionButton(actions, "MENU", null, 9.5)
    this.menuContent = menu.content
    menu.button.onTriggerUp.add(() => this._onReturnToMenu.invoke())
    const scan = this.addActionButton(actions, "SCAN", CAMERA_ICON, 12.5)
    this.scanAction = scan
    this.scanActionRegistered = true
    this.scanButton = scan.button
    this.scanContent = scan.content
    this.scanButton.onTriggerUp.add(() => this._onScanRequested.invoke())
    const mic = this.addActionButton(actions, "HOLD TO TALK", MIC_ICON, 18)
    this.micContent = mic.content
    mic.button.onTriggerDown.add(() => this._onVoiceHoldStart.invoke())
    mic.button.onTriggerUp.add(() => this._onVoiceHoldEnd.invoke())

    this.scanSelectorRoot = this.makeObject(content, "Scan Card Selector")
    this.scanSelectorFlex = this.scanSelectorRoot.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.scanSelectorFlex.autoDiscoverItemsOnStart = false
    this.scanSelectorFlex.width = 43
    this.scanSelectorFlex.height = 3.6
    this.scanSelectorFlex.direction = FlexDirection.Row
    this.scanSelectorFlex.alignItems = FlexAlign.Center
    this.scanSelectorFlex.justifyContent = FlexJustify.Center
    this.scanSelectorFlex.columnGap = 0.45
    this.scanSelectorItem = this.scanSelectorRoot.createComponent(FlexItem.getTypeName()) as FlexItem
    this.scanSelectorItem.overrideWidth = 43
    this.scanSelectorItem.overrideHeight = 3.6
    this.scanSelectorItem.flexShrink = 0
    this.scanSelectorItem.alignSelf = FlexAlignSelf.Stretch
    this.scanSelectorRoot.enabled = false

    this.internetText = this.addText(content, "", 43, 0.9, "Caption", LINGO_COLORS.coral)
    this.buildCoachBubble()
  }

  private buildCategory(id: CategoryId, root: SceneObject): void {
    root.createComponent("Component.Canvas")
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    button.opacity = 0.01
    button.onInitialized.add(() => button.size = new vec3(14.5, 7.4, 1.2))
    button.onTriggerUp.add(() => this.showCollection(id))
    this.addTextureImage(root, CATEGORY_ICONS[id], 22.5, 22.5, `${id} Illustrated Category`, new vec3(0, 0, 1.05))
    const countText = this.addOverlayText(root, "0 words", 7.1, 1.55, "Subheadline", this.categoryTextColor(id), new vec3(1.65, -1.25, 1.35))
    this.categories.push({id, root, button, countText, icon: CATEGORY_ICONS[id]})
  }

  private buildZoomControls(): void {
    this.zoomControlsRoot = this.makeObject(this.sceneObject, "Experience Distance Controls", new vec3(0, -7.2, 1.2))
    this.addZoomButton("Zoom Out", "−", new vec3(19.2, 0, 0), -1)
    this.addZoomButton("Zoom In", "+", new vec3(23.1, 0, 0), 1)
  }

  private addZoomButton(name: string, label: string, position: vec3, direction: number): void {
    const root = this.makeObject(this.zoomControlsRoot, name, position)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(button, direction > 0 ? "primary" : "neutral")
    this.addOverlayText(root, label, 2.3, 2.3, "Headline1", direction > 0 ? LINGO_COLORS.white : LINGO_COLORS.ink, new vec3(0, 0, 1.35))
    button.onInitialized.add(() => button.size = new vec3(4.2, 4.2, 1))
    button.onTriggerUp.add(() => this._onZoomRequested.invoke(direction))
  }

  private buildCard(): void {
    this.cardRoot.createComponent("Component.Canvas")
    const button = this.cardRoot.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Primary"})
    button.opacity = 0.01
    button.onInitialized.add(() => button.size = new vec3(19, 23.8, 1.4))

    this.addTextureImage(this.cardRoot, CARD_FRAME_TEXTURE, 19, 23.88, "Illustrated Card Frame", new vec3(0, 0, 1.02))

    const content = this.makeObject(this.cardRoot, "Card Content", new vec3(0, -0.85, 1.5))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = 16.5
    flex.height = 19.2
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.rowGap = 0.25

    const visualRow = this.makeObject(content, "Image and Listen")
    const visualFlex = visualRow.createComponent(FlexLayout.getTypeName()) as FlexLayout
    visualFlex.autoDiscoverItemsOnStart = false
    visualFlex.width = 16
    visualFlex.height = 11.6
    visualFlex.direction = FlexDirection.Row
    visualFlex.alignItems = FlexAlign.Center
    visualFlex.justifyContent = FlexJustify.Center
    this.registerFlexItem(content, visualRow, 16, 11.6, FlexAlignSelf.Center)

    const imageRoot = this.makeObject(visualRow, "Reference Image", new vec3(0, 0, 0.08))
    this.cardImage = imageRoot.createComponent("Component.Image") as Image
    this.cardImageMaterial = IMAGE_MATERIAL.clone()
    this.cardImageMaterial.mainPass.baseTex = CARD_IMAGES.cup
    this.cardImageMaterial.mainPass.baseColor = new vec4(1, 1, 1, 1)
    this.cardImageMaterial.mainPass.depthTest = true
    this.cardImageMaterial.mainPass.depthWrite = false
    this.cardImageMaterial.mainPass.twoSided = true
    this.cardImageMaterial.mainPass.blendMode = BlendMode.Normal
    this.cardImage.clearMaterials()
    this.cardImage.addMaterial(this.cardImageMaterial)
    imageRoot.getTransform().setLocalScale(new vec3(10.8, 10.8, 1))
    this.registerFlexItem(visualRow, imageRoot, 10.8, 10.8, FlexAlignSelf.Center)

    const listenRoot = this.makeObject(this.cardRoot, "Card Listen", new vec3(6.2, 8.7, 1.42))
    const listenButton = listenRoot.createComponent(Button.getTypeName()) as Button
    listenButton.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(listenButton, "primary")
    const listenContent = listenRoot.createComponent(ElementContent.getTypeName()) as ElementContent
    listenContent.leadingIcon = VOLUME_ICON
    listenContent.leadingIconSize = 2.2
    listenContent.contentAlignment = "center"
    listenButton.onInitialized.add(() => listenButton.size = new vec3(4.4, 4.4, 1))
    listenButton.onTriggerUp.add(() => this._onListenRequested.invoke())

    this.cardWordText = this.addText(content, "die Tasse", 16, 2.75, "Headline1", LINGO_COLORS.ink)
    this.cardTranslationText = this.addText(content, "taza", 16, 2.1, "Body", new vec4(0.04, 0.45, 0.42, 1))
    this.addText(content, "●    ○    ○    ○", 16, 1.15, "Caption", LINGO_COLORS.purple)

    const manipulation = this.cardRoot.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setCanRotate(false)
    manipulation.setCanScale(false)
    this.createEvent("OnStartEvent").bind(() => {
      manipulation.onManipulationStart.add(() => {
        if (this.cardReady) this.dragging = true
      })
      manipulation.onManipulationEnd.add(() => {
        this.dragging = false
        if (!this.cardReady) {
          this.resetCardPosition()
          return
        }
        const category = this.closestCategory()
        if (category && this.distanceToCategory(category) <= 15) this._onCardDropped.invoke(category.id)
        else this.resetCardPosition()
      })
    })
  }

  private addActionButton(parent: SceneObject, label: string, icon: Texture | null, width: number): ActionButtonView {
    const root = this.makeObject(parent, `Action-${label}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, label === "SCAN" ? "home" : "primary")
    const content = root.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = label
    content.textSize = TYPE_SCALE.Caption.size
    if (icon) {
      content.leadingIcon = icon
      content.leadingIconSize = 1.7
    }
    content.spacing = 0.45
    content.contentAlignment = "center"
    const item = this.registerFlexItem(parent, root, width, 4.1, FlexAlignSelf.Center)
    button.onInitialized.add(() => button.size = new vec3(width, 4.1, 1))
    return {root, item, button, content}
  }

  private setScanActionVisible(visible: boolean): void {
    if (!this.scanAction || !this.actionFlex) return
    this.scanButton.enabled = visible
    this.scanAction.root.enabled = visible
    if (visible && !this.scanActionRegistered) {
      this.actionFlex.addItems([this.scanAction.item])
      this.scanActionRegistered = true
    } else if (!visible && this.scanActionRegistered) {
      this.actionFlex.removeItems([this.scanAction.item])
      this.scanActionRegistered = false
    }
  }

  private setScanSelectorVisible(visible: boolean): void {
    if (!this.scanSelectorRoot || !this.scanSelectorItem || !this.hudFlex) return
    this.scanSelectorRoot.enabled = visible
    if (visible && !this.scanSelectorRegistered) {
      this.hudFlex.addItems([this.scanSelectorItem])
      this.scanSelectorRegistered = true
    } else if (!visible && this.scanSelectorRegistered) {
      this.hudFlex.removeItems([this.scanSelectorItem])
      this.scanSelectorRegistered = false
    }
  }

  private refreshCategory(category: CategoryView): void {
    const count = this.counts[category.id]
    category.countText.text = `${count} ${lingoCopy(this.nativeLanguage, "words")}`
  }

  private showCollection(id: CategoryId): void {
    const words = this.collections[id]
    this.feedbackText.text = words.length === 0
      ? `${categoryName(id, this.nativeLanguage)} · 0 ${lingoCopy(this.nativeLanguage, "words")}`
      : `${categoryName(id, this.nativeLanguage)} · ${words.slice(0, 3).join("  •  ")}${words.length > 3 ? `  +${words.length - 3}` : ""}`
  }

  private updateDragFeedback(): void {
    if (!this.dragging || !this.cardReady || !this.cardRoot.enabled) return
    const category = this.closestCategory()
    const next = category && this.distanceToCategory(category) <= 18 ? category.id : null
    if (next === this.highlighted) return
    this.clearHighlight()
    if (next) {
      for (let i = 0; i < this.categories.length; i++) {
        if (this.categories[i].id === next) this.categories[i].root.getTransform().setLocalScale(new vec3(1.08, 1.08, 1.08))
      }
      this.highlighted = next
    }
  }

  private closestCategory(): CategoryView | null {
    if (this.categories.length === 0) return null
    let best = this.categories[0]
    let bestDistance = this.distanceToCategory(best)
    for (let i = 1; i < this.categories.length; i++) {
      const distance = this.distanceToCategory(this.categories[i])
      if (distance < bestDistance) {
        best = this.categories[i]
        bestDistance = distance
      }
    }
    return best
  }

  private distanceToCategory(category: CategoryView): number {
    return this.cardRoot.getTransform().getWorldPosition().distance(category.root.getTransform().getWorldPosition())
  }

  private clearHighlight(): void {
    for (let i = 0; i < this.categories.length; i++) this.categories[i].root.getTransform().setLocalScale(vec3.one())
    this.highlighted = null
  }

  private resetCardPosition(): void {
    this.cardRoot.getTransform().setLocalPosition(this.cardHome)
    this.cardRoot.getTransform().setLocalRotation(quat.quatIdentity())
  }

  private setImage(texture: Texture): void {
    this.cardImageMaterial.mainPass.baseTex = texture
    this.cardImageMaterial.mainPass.baseColor = new vec4(1, 1, 1, 1)
    this.cardImageMaterial.mainPass.depthTest = true
    this.cardImageMaterial.mainPass.depthWrite = false
    this.cardImageMaterial.mainPass.twoSided = true
    this.cardImageMaterial.mainPass.blendMode = BlendMode.Normal
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color?: vec4): Text {
    const root = this.makeObject(parent, `Text-${value}`)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = TYPE_SCALE[role].size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color || (role === "Caption" ? new vec4(1, 1, 1, 0.72) : LINGO_COLORS.softWhite)
    this.registerFlexItem(parent, root, width, height, FlexAlignSelf.Stretch)
    return text
  }

  private buildCoachBubble(): void {
    this.coachBubbleRoot = this.makeObject(this.sceneObject, "Cloudy Coach Bubble", new vec3(0, -49.5, 0.75))
    this.addTextureImage(this.coachBubbleRoot, CLOUD_MESSAGE_TEXTURE, 39, 12.37, "Cloudy Message Artwork", new vec3(0, 0, 0.1))
    this.voiceStatusText = this.addOverlayText(
      this.coachBubbleRoot,
      "Listen, then hold the mic to practice.",
      18.5,
      7.3,
      "Body",
      LINGO_COLORS.ink,
      new vec3(8.65, -0.1, 1.2),
      true,
    )
  }

  private addTextureImage(parent: SceneObject, texture: Texture, width: number, height: number, name: string, position: vec3): SceneObject {
    const root = this.makeObject(parent, name, position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.depthTest = true
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    root.getTransform().setLocalScale(new vec3(width, height, 1))
    return root
  }

  private addOverlayText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, position: vec3, wrap: boolean = false): Text {
    const root = this.makeObject(parent, `Overlay-${value}`, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = TYPE_SCALE[role].size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Shrink
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color
    return text
  }

  private categoryTextColor(id: CategoryId): vec4 {
    if (id === "FOOD") return new vec4(0.88, 0.16, 0.19, 1)
    if (id === "WORK") return new vec4(0.08, 0.37, 0.75, 1)
    if (id === "HOME" || id === "OUTSIDE") return new vec4(0.05, 0.43, 0.38, 1)
    return LINGO_COLORS.ink
  }

  private styleRoundedPlate(root: SceneObject, background: vec4, border: vec4, cornerRadius: number): void {
    if (!root || isNull(root)) return
    const rounded = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (!rounded) return
    rounded.gradient = false
    rounded.backgroundColor = background
    rounded.cornerRadius = cornerRadius
    rounded.border = true
    rounded.borderSize = 0.08
    rounded.borderColor = border
  }

  private registerFlexItem(parent: SceneObject, child: SceneObject, width: number, height: number, align: FlexAlignSelf = FlexAlignSelf.Stretch): FlexItem {
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
