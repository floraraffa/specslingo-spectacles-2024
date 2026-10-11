/** Three-step setup: native language, learning language, and learning mode. */
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./compat515/FlexTypes515"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button515 as Button} from "./compat515/Button515"
import {ElementContent515 as ElementContent} from "./compat515/ElementContent515"
import {afterComponentStart} from "./compat515/Timing515"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {LanguageId, LearningMode, SUPPORTED_LANGUAGES} from "./LingoSpaceData"
import {languageName, lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, LingoTone, styleLingoButton} from "./LingoSpaceTheme"
import {ART, ART_FLOW, artButton, artIcon, artImage, artLabel, ArtPiece, kitText, stripArrow} from "./LingoSpaceArtKit"
import {LINGO_WEB_URL} from "./LingoSpaceWeb"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"

const PLAY_ICON: Texture = requireAsset("../Icons/play_arrow.png") as Texture
const BACK_ICON: Texture = requireAsset("../Icons/arrow_back.png") as Texture
const CHECK_ICON: Texture = requireAsset("../Icons/check_circle.png") as Texture
const CATCHER_DECOR: Texture[] = [
  requireAsset("../AIImagesKawaii/apple.png") as Texture,
  requireAsset("../AIImagesKawaii/cup.png") as Texture,
  requireAsset("../AIImagesKawaii/book.png") as Texture,
]
const LIVE_SPEAK_TEXTURE: Texture = requireAsset("../ScreenDesign/live-speak.png") as Texture
const LIVE_SPEAK_OVER_TEXTURE: Texture = requireAsset("../ScreenDesign/live-speak-over.png") as Texture
const LIVE_TALK_TEXTURE: Texture = requireAsset("../ScreenDesign/live-talk.png") as Texture
const LIVE_TALK_OVER_TEXTURE: Texture = requireAsset("../ScreenDesign/live-talk-over.png") as Texture
const LIVE_AI_TEXTURE: Texture = requireAsset("../ScreenDesign/live-ai.png") as Texture
const LIVE_AI_OVER_TEXTURE: Texture = requireAsset("../ScreenDesign/live-ai-over.png") as Texture
const IMAGE_MATERIAL: Material = IMAGE_MATERIAL_ASSET
const LOGO_TEXTURE: Texture = requireAsset("../LingoDesign/LOGO.png") as Texture
const STAR_TEXTURE: Texture = requireAsset("../LingoDesign/stars.png") as Texture
const BACKGROUND_TEXTURE: Texture = requireAsset("../ScreenDesign/background.png") as Texture
const IMAGE_CARDS_TEXTURE: Texture = requireAsset("../ScreenDesign/image-cards.png") as Texture
const IMAGE_CARDS_SELECTED_TEXTURE: Texture = requireAsset("../ScreenDesign/image-cards-selected.png") as Texture
const SCAN_WORLD_TEXTURE: Texture = requireAsset("../ScreenDesign/scan-my-world.png") as Texture
const SCAN_WORLD_SELECTED_TEXTURE: Texture = requireAsset("../ScreenDesign/scan-my-world-selected.png") as Texture
const MODE_BACK_TEXTURE: Texture = requireAsset("../ScreenDesign/botonback.png") as Texture
const MODE_CLOUD_TOP_TEXTURE: Texture = requireAsset("../ScreenDesign/nube-arriba.png") as Texture
const LANGUAGE_FLAGS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../Flags/spanish_256x256.png") as Texture,
  English: requireAsset("../Flags/english_256x256.png") as Texture,
  German: requireAsset("../Flags/german_256x256.png") as Texture,
  French: requireAsset("../Flags/french_256x256.png") as Texture,
  Italian: requireAsset("../Flags/italian_256x256.png") as Texture,
  Japanese: requireAsset("../Flags/japanese_256x256.png") as Texture,
}
const LANGUAGE_CLOUDS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../LingoDesign/nube-es.png") as Texture,
  English: requireAsset("../LingoDesign/nube-en.png") as Texture,
  German: requireAsset("../LingoDesign/nube-gr.png") as Texture,
  French: requireAsset("../LingoDesign/nube-fr.png") as Texture,
  Italian: requireAsset("../LingoDesign/nube-it.png") as Texture,
  Japanese: requireAsset("../LingoDesign/nube-jp.png") as Texture,
}
const PANEL_WIDTH = 48
const CONTENT_WIDTH = 43.6
const SETUP_LOGO_WIDTH = 40.5
const MODE_LOGO_WIDTH = 36.5
const LOGO_VISIBLE_HEIGHT_RATIO = 427 / 626
const CONTENT_VERTICAL_OFFSET = 1.8
const BACKGROUND_WIDTH = 55
const BACKGROUND_HEIGHT = BACKGROUND_WIDTH * 798 / 638
const MODE_CARD_WIDTH = 41.8
const MODE_CARD_HEIGHT = MODE_CARD_WIDTH * 465 / 1557
const MODE_CARD_ASPECT = 465 / 1557
/** Mode step: three cards + the game row must fit the panel frame, so the logo
 * and cards are a bit smaller there and the cards' transparent margins overlap. */
const MODE_STEP_LOGO_WIDTH = 30.5
const MODE_STEP_CARD_WIDTH = 39.5
const MODE_STEP_CARD_FLOW = 0.92
// Mode step bottom row: BACK · LIVE TALK · language cloud (sums to CONTENT_WIDTH).
const LIVE_TALK_BACK_WIDTH = 18.6
const LIVE_TALK_BUTTON_WIDTH = 18.4
const LIVE_TALK_CLOUD_SIZE = 9
// The cloud art is drawn larger than its slot and lifted: it may overlap the
// buttons around it, like a sticker on the panel.
const LIVE_TALK_CLOUD_ART = 14.5
/** Share of an art button's height that takes room in the layout (the rest is transparent margin). */
const ART_BUTTON_FLOW_RATIO = 0.78
/** Drawn after the panel's buttons, so a floating cloud always sits in front of them. */
const FRONT_RENDER_ORDER = 25
type ModeTextureSet = {
  image: Texture
  imageSelected: Texture
  scan: Texture
  scanSelected: Texture
}
type TextRole = "Title1" | "Headline1" | "Subheadline" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Title1: {size: 105, weight: 700},
  Headline1: {size: 54, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}

@component
export class LingoSpaceMenuUI extends BaseScriptComponent {
  @ui.label('<span style="color: #A78BFA;">Lingo Specs Menu – kawaii setup flow</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Brand title shown above the setup flow")
  menuTitle: string = "LINGO SPECS"
  @input
  @hint("Short promise shown under the brand title")
  menuSubtitle: string = "Build a language world around your life."
  @input
  @hint("Helper line displayed on the final setup step")
  readyHint: string = "Listen, speak, scan and organize your world."
  @ui.group_end

  @ui.label('<span style="color: #A78BFA;">Mode artwork by native language</span>')
  @ui.separator
  @ui.group_start("Spanish artwork")
  @input @allowUndefined @hint("AI Image Cards in Spanish. Empty uses the original image-cards.png artwork.") spanishImageCards?: Texture
  @input @allowUndefined @hint("Selected AI Image Cards in Spanish. Empty uses image-cards-selected.png.") spanishImageCardsSelected?: Texture
  @input @allowUndefined @hint("Scan My World in Spanish. Empty uses the original scan-my-world.png artwork.") spanishScanWorld?: Texture
  @input @allowUndefined @hint("Selected Scan My World in Spanish. Empty uses scan-my-world-selected.png.") spanishScanWorldSelected?: Texture
  @ui.group_end

  @ui.group_start("English artwork")
  @input @allowUndefined @hint("AI Image Cards in English. Empty uses the original image-cards.png artwork.") englishImageCards?: Texture
  @input @allowUndefined @hint("Selected AI Image Cards in English. Empty uses image-cards-selected.png.") englishImageCardsSelected?: Texture
  @input @allowUndefined @hint("Scan My World in English. Empty uses the original scan-my-world.png artwork.") englishScanWorld?: Texture
  @input @allowUndefined @hint("Selected Scan My World in English. Empty uses scan-my-world-selected.png.") englishScanWorldSelected?: Texture
  @ui.group_end

  @ui.group_start("German artwork")
  @input @allowUndefined @hint("AI Image Cards in German. Empty uses the original image-cards.png artwork.") germanImageCards?: Texture
  @input @allowUndefined @hint("Selected AI Image Cards in German. Empty uses image-cards-selected.png.") germanImageCardsSelected?: Texture
  @input @allowUndefined @hint("Scan My World in German. Empty uses the original scan-my-world.png artwork.") germanScanWorld?: Texture
  @input @allowUndefined @hint("Selected Scan My World in German. Empty uses scan-my-world-selected.png.") germanScanWorldSelected?: Texture
  @ui.group_end

  @ui.group_start("French artwork")
  @input @allowUndefined @hint("AI Image Cards in French. Empty uses the original image-cards.png artwork.") frenchImageCards?: Texture
  @input @allowUndefined @hint("Selected AI Image Cards in French. Empty uses image-cards-selected.png.") frenchImageCardsSelected?: Texture
  @input @allowUndefined @hint("Scan My World in French. Empty uses the original scan-my-world.png artwork.") frenchScanWorld?: Texture
  @input @allowUndefined @hint("Selected Scan My World in French. Empty uses scan-my-world-selected.png.") frenchScanWorldSelected?: Texture
  @ui.group_end

  @ui.group_start("Italian artwork")
  @input @allowUndefined @hint("AI Image Cards in Italian. Empty uses the original image-cards.png artwork.") italianImageCards?: Texture
  @input @allowUndefined @hint("Selected AI Image Cards in Italian. Empty uses image-cards-selected.png.") italianImageCardsSelected?: Texture
  @input @allowUndefined @hint("Scan My World in Italian. Empty uses the original scan-my-world.png artwork.") italianScanWorld?: Texture
  @input @allowUndefined @hint("Selected Scan My World in Italian. Empty uses scan-my-world-selected.png.") italianScanWorldSelected?: Texture
  @ui.group_end

  @ui.group_start("Japanese artwork")
  @input @allowUndefined @hint("AI Image Cards in Japanese. Empty uses the original image-cards.png artwork.") japaneseImageCards?: Texture
  @input @allowUndefined @hint("Selected AI Image Cards in Japanese. Empty uses image-cards-selected.png.") japaneseImageCardsSelected?: Texture
  @input @allowUndefined @hint("Scan My World in Japanese. Empty uses the original scan-my-world.png artwork.") japaneseScanWorld?: Texture
  @input @allowUndefined @hint("Selected Scan My World in Japanese. Empty uses scan-my-world-selected.png.") japaneseScanWorldSelected?: Texture
  @ui.group_end

  private outerFlex!: FlexLayout
  private pageRoot: SceneObject | null = null
  private pageItem: FlexItem | null = null
  private nativeLanguage: LanguageId | null = null
  private targetLanguage: LanguageId | null = null
  private learningMode: LearningMode | null = null
  private navigationLocked = false
  private navigationUnlockEvent: any
  /** Mode-step cards (incl. LIVE TALK): exactly one shows its highlighted art at a time. */
  private modeVisuals: {mode: LearningMode | "LIVE", material: Material, selected: Texture, unselected: Texture}[] = []
  private languageVisuals: {language: LanguageId, button: Button, label: Text, check: SceneObject}[] = []
  private logoItem!: FlexItem
  private logoImageRoot!: SceneObject
  private userName = "Learner"
  private languageCloudMaterial: Material | null = null
  private mascotWelcomeText: Text | null = null
  private languagePromptText: Text | null = null
  private mascotLanguage: LanguageId = "Spanish"
  private cloudFollowsLanguagePreview = false
  private _onNativeLanguageSelected = new Event<string>()
  private _onTargetLanguageSelected = new Event<string>()
  private _onModeSelected = new Event<string>()
  private _onStart = new Event<void>()
  private _onLiveTalkSelected = new Event<string>()
  private liveTalkCloudRoot: SceneObject | null = null
  /** Word bubbles drifting around the CLOUD CATCHER entry. */
  private catcherDecor: {object: SceneObject, base: vec3, phase: number}[] = []
  private catcherTime = 0
  private liveTalkIntroCloud: {object: SceneObject, base: vec3} | null = null
  private catcherBadge: {object: SceneObject, base: vec3} | null = null
  private liveTalkTime = 0
  private liveTalkHovered = false

  get onNativeLanguageSelected(): PublicApi<string> { return this._onNativeLanguageSelected.publicApi() }
  get onTargetLanguageSelected(): PublicApi<string> { return this._onTargetLanguageSelected.publicApi() }
  get onModeSelected(): PublicApi<string> { return this._onModeSelected.publicApi() }
  get onStart(): PublicApi<void> { return this._onStart.publicApi() }
  /** "AI" or "HUMAN": the Live Talk partner chosen from the cloud's page. */
  get onLiveTalkSelected(): PublicApi<string> { return this._onLiveTalkSelected.publicApi() }

  private fx!: LingoFX

  onAwake(): void {
    this.fx = new LingoFX(this)
    this.navigationUnlockEvent = this.createEvent("DelayedCallbackEvent")
    this.navigationUnlockEvent.bind(() => this.navigationLocked = false)
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
    afterComponentStart(this, () => this.styleRoundedPlate(
      this.sceneObject,
      new vec4(1, 1, 1, 0),
      new vec4(1, 1, 1, 0),
      0,
    ))
    this.addImage(this.sceneObject, BACKGROUND_TEXTURE, BACKGROUND_WIDTH, BACKGROUND_HEIGHT, "Kawaii Screen Background")
    const content = this.makeObject(this.sceneObject, "Content", new vec3(0, CONTENT_VERTICAL_OFFSET, 0.6))
    this.outerFlex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.outerFlex.autoDiscoverItemsOnStart = false
    this.outerFlex.width = PANEL_WIDTH
    this.outerFlex.height = -1
    this.outerFlex.direction = FlexDirection.Column
    this.outerFlex.alignItems = FlexAlign.Stretch
    this.outerFlex.justifyContent = FlexJustify.Start
    this.outerFlex.rowGap = 0.55
    this.outerFlex.paddingTop = 1.35
    this.outerFlex.paddingBottom = 0.5
    this.outerFlex.paddingLeft = 2.2
    this.outerFlex.paddingRight = 2.2
    this.addProportionalLogo(content, SETUP_LOGO_WIDTH, FlexAlignSelf.Start)
    this.createEvent("UpdateEvent").bind(() => {
      this.animateLiveTalkCloud()
      this.animateCatcherDecor()
    })
    this.showNativeStep()
  }

  show(): void { this.sceneObject.enabled = true }
  hide(): void { this.sceneObject.enabled = false }

  setUserName(value: string): void {
    const normalized = value.trim()
    this.userName = normalized || "Learner"
    this.refreshMascotWelcome()
  }

  restoreSelection(nativeLanguage: LanguageId | null, targetLanguage: LanguageId | null): void {
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.learningMode = null
    this.showNativeStep()
  }

  resetFlow(): void {
    this.navigationLocked = false
    this.targetLanguage = null
    this.learningMode = null
    this.showNativeStep()
  }

  /** BACK from a section lands here: mode choice with languages kept — the
   * flow's own back buttons still reach the language steps when wanted. */
  private webCode = ""
  /** Code lines on the page showing now: filled the moment the code arrives. */
  private webCodeTexts: Text[] = []
  private webCodeOnlyTexts: Text[] = []

  /** The web link code (from Snap Cloud), shown on the mode and ready steps. */
  setWebCode(code: string): void {
    this.webCode = code
    this.webCodeTexts = this.webCodeTexts.filter((text) => !isNull(text))
    for (let i = 0; i < this.webCodeTexts.length; i++) this.webCodeTexts[i].text = this.webCodeLine()
    this.webCodeOnlyTexts = this.webCodeOnlyTexts.filter((text) => !isNull(text))
    for (let i = 0; i < this.webCodeOnlyTexts.length; i++) this.webCodeOnlyTexts[i].text = code
  }

  private webCodeLine(): string {
    return `${lingoCopy(this.nativeLanguage, "webCode")} ${LINGO_WEB_URL}  ·  ${this.webCode || "NUBE-····-····"}`
  }



  /** Straight to the Live Talk choice page (from the right-wrist cloud). */
  jumpToLiveTalkStep(): void {
    this.navigationLocked = false
    if (!this.nativeLanguage || !this.targetLanguage) {
      this.resetFlow()
      return
    }
    this.showLiveTalkStep()
  }

  jumpToModeStep(): void {
    this.navigationLocked = false
    if (!this.nativeLanguage || !this.targetLanguage) {
      this.resetFlow()
      return
    }
    this.showModeStep()
  }

  getNativeLanguage(): LanguageId | null { return this.nativeLanguage }
  getTargetLanguage(): LanguageId | null { return this.targetLanguage }
  getLearningMode(): LearningMode | null { return this.learningMode }

  private showNativeStep(): void {
    this.setLogoAlignment(FlexAlignSelf.Start, SETUP_LOGO_WIDTH)
    const page = this.newPage("NativeLanguage")
    this.languageVisuals = []
    this.cloudFollowsLanguagePreview = true
    // Before any choice the app speaks English; hovering a language previews it live.
    const displayLanguage: LanguageId = "English"
    this.languagePromptText = this.addSpeechBubble(page, lingoCopy(displayLanguage, "nativePrompt"))

    const body = this.addFlexContainer(page, "NativeLanguageBody", CONTENT_WIDTH, 30.2, FlexDirection.Row, 1.1)
    const mascotColumn = this.addFlexContainer(body, "MascotColumn", 17.5, 30.2, FlexDirection.Column, 0.15)
    const mascotFlex = mascotColumn.getComponent(FlexLayout.getTypeName()) as FlexLayout
    mascotFlex.alignItems = FlexAlign.Center
    mascotFlex.justifyContent = FlexJustify.Center
    this.addImage(mascotColumn, STAR_TEXTURE, 3.4, 3.4, "Welcome Star")
    this.addLanguageCloud(mascotColumn, "English", "Native Language Cloud")
    this.addMascotWelcome(mascotColumn, "English")

    const languageList = this.addFlexContainer(body, "LanguageList", 25, 30.2, FlexDirection.Column, 0.55)
    const listFlex = languageList.getComponent(FlexLayout.getTypeName()) as FlexLayout
    listFlex.alignItems = FlexAlign.Stretch
    listFlex.justifyContent = FlexJustify.Center
    for (let i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      const language = SUPPORTED_LANGUAGES[i]
      this.addLanguageButton(languageList, language, this.nativeLanguage === language, () => {
        this.nativeLanguage = language
        this.targetLanguage = null
        this.learningMode = null
        this._onNativeLanguageSelected.invoke(language)
        this.showTargetStep()
      }, () => this.nativeLanguage, true)
    }
  }

  private showTargetStep(): void {
    this.setLogoAlignment(FlexAlignSelf.Start, SETUP_LOGO_WIDTH)
    const page = this.newPage("TargetLanguage")
    this.languageVisuals = []
    this.cloudFollowsLanguagePreview = false
    this.addSpeechBubble(page, lingoCopy(this.nativeLanguage, "targetPrompt"))

    const body = this.addFlexContainer(page, "TargetLanguageBody", CONTENT_WIDTH, 30.2, FlexDirection.Row, 1.1)
    const mascotColumn = this.addFlexContainer(body, "TargetMascotColumn", 17.5, 30.2, FlexDirection.Column, 0.15)
    const mascotFlex = mascotColumn.getComponent(FlexLayout.getTypeName()) as FlexLayout
    mascotFlex.alignItems = FlexAlign.Center
    mascotFlex.justifyContent = FlexJustify.Center
    this.addImage(mascotColumn, STAR_TEXTURE, 3.4, 3.4, "Adventure Star")
    this.addLanguageCloud(mascotColumn, this.nativeLanguage || "English", "Target Language Cloud")
    this.addMascotWelcome(mascotColumn, this.nativeLanguage || "English")

    const languageList = this.addFlexContainer(body, "TargetLanguageList", 25, 30.2, FlexDirection.Column, 0.55)
    const listFlex = languageList.getComponent(FlexLayout.getTypeName()) as FlexLayout
    listFlex.alignItems = FlexAlign.Stretch
    listFlex.justifyContent = FlexJustify.Center
    for (let i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      const language = SUPPORTED_LANGUAGES[i]
      if (language === this.nativeLanguage) continue
      this.addLanguageButton(languageList, language, this.targetLanguage === language, () => {
        this.targetLanguage = language
        this._onTargetLanguageSelected.invoke(language)
        this.showModeStep()
      }, () => this.targetLanguage)
    }
    this.addKitButton(languageList, ART.back, 25, lingoCopy(this.nativeLanguage, "back"), 42, () => this.showNativeStep())
  }

  private showModeStep(): void {
    this.setLogoAlignment(FlexAlignSelf.Center, MODE_STEP_LOGO_WIDTH)
    const page = this.newPage("LearningMode")
    this.modeVisuals = []
    const modeTextures = this.modeTexturesFor(this.nativeLanguage)
    // The three ways to learn, straight under the logo: quiz, scan, live talk.
    this.addModeTextureButton(page, "IMAGE", modeTextures.imageSelected, modeTextures.image, this.learningMode === "IMAGE", () => {
      this.learningMode = "IMAGE"
      this._onModeSelected.invoke("IMAGE")
      this.showReadyStep()
    })
    this.addModeTextureButton(page, "SCAN", modeTextures.scanSelected, modeTextures.scan, this.learningMode === "SCAN", () => {
      this.learningMode = "SCAN"
      this._onModeSelected.invoke("SCAN")
      this.showReadyStep()
    })
    const liveMaterial = this.addArtButton(page, "Mode-LIVE", LIVE_TALK_TEXTURE, LIVE_TALK_OVER_TEXTURE, () => this.showLiveTalkStep(), MODE_STEP_CARD_FLOW, MODE_STEP_CARD_WIDTH, () => this.setModeVisualSelection("LIVE"))
    this.modeVisuals.push({mode: "LIVE", material: liveMaterial, selected: LIVE_TALK_OVER_TEXTURE, unselected: LIVE_TALK_TEXTURE})
    // Bottom row: BACK and the CLOUD CATCHER game (also inside Live Talk).
    const backRow = this.addFlexContainer(page, "ModeBackRow", CONTENT_WIDTH, 6.4, FlexDirection.Row, 0.8)
    const backFlex = backRow.getComponent(FlexLayout.getTypeName()) as FlexLayout
    backFlex.alignItems = FlexAlign.Center
    backFlex.justifyContent = FlexJustify.SpaceBetween
    this.addKitButton(backRow, ART.back, LIVE_TALK_BACK_WIDTH, lingoCopy(this.nativeLanguage, "back"), 40, () => this.showTargetStep(), 4.4)
    this.addCatcherEntry(backRow)
  }

  /** Live Talk partner choice: role-play with the AI, or help talking to a real person. */
  private showLiveTalkStep(): void {
    this.setLogoAlignment(FlexAlignSelf.Start, MODE_LOGO_WIDTH)
    const page = this.newPage("LiveTalk")
    const target = this.targetLanguage || "English"
    const intro = this.addFlexContainer(page, "LiveTalkIntro", CONTENT_WIDTH, 9, FlexDirection.Row, 0.8)
    const introFlex = intro.getComponent(FlexLayout.getTypeName()) as FlexLayout
    introFlex.alignItems = FlexAlign.Center
    introFlex.justifyContent = FlexJustify.Center
    // The studied language's cloud: big, floating, spilling over the panel like a sticker.
    this.liveTalkIntroCloud = this.addOverflowCloud(intro, LANGUAGE_CLOUDS[target], 9, 19, new vec3(-0.5, -0.6, 2.2), "Live Talk Cloud")
    this.bringToFront(this.liveTalkIntroCloud.object)
    this.addSpeechBubble(intro, lingoCopy(this.nativeLanguage, "liveTalkPrompt"), 32, 6.2)
    this.addSpacer(page, CONTENT_WIDTH, 1.2)
    // With help first, then free conversation: the learning order.
    this.addArtButton(page, "LiveTalk-SPEAK", LIVE_SPEAK_TEXTURE, LIVE_SPEAK_OVER_TEXTURE, () => this._onLiveTalkSelected.invoke("SPEAK"))
    this.addArtButton(page, "LiveTalk-AI", LIVE_AI_TEXTURE, LIVE_AI_OVER_TEXTURE, () => this._onLiveTalkSelected.invoke("AI"))
    // A little air below the AI PRACTICE art so the two layers never overlap.
    this.addSpacer(page, CONTENT_WIDTH, 1.1)
    const bottom = this.addFlexContainer(page, "LiveTalkBottomRow", CONTENT_WIDTH, 6.4, FlexDirection.Row, 0.8)
    const bottomFlex = bottom.getComponent(FlexLayout.getTypeName()) as FlexLayout
    bottomFlex.alignItems = FlexAlign.Center
    bottomFlex.justifyContent = FlexJustify.SpaceBetween
    this.addKitButton(bottom, ART.back, LIVE_TALK_BACK_WIDTH, lingoCopy(this.nativeLanguage, "back"), 40, () => this.showModeStep(), 4.4)
    this.addCatcherEntry(bottom)
  }

  /** Illustrated button the same size as the mode cards; hovering swaps to its OVER art. */
  private addArtButton(parent: SceneObject, name: string, normal: Texture, over: Texture, action: () => void, flowRatio: number = ART_BUTTON_FLOW_RATIO, width: number = MODE_CARD_WIDTH, select?: () => void): Material {
    const height = width * MODE_CARD_ASPECT
    const root = this.makeObject(parent, name)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Ghost"})
    const material = this.addButtonTextureVisual(root, normal, width, height, `${name} Artwork`)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    // The art has a transparent margin above and below the pill: let the flow
    // overlap it so stacked art buttons sit close together.
    item.overrideHeight = height * flowRatio
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => {
      button.size = new vec3(width, height * flowRatio, 1)
      button.opacity = 0
      this.clearGhostVisual(button)
    })
    if (select) {
      // Part of a group: highlighting this card clears the others.
      button.onHoverEnter.add(select)
      button.onTriggerDown.add(select)
    } else {
      button.onHoverEnter.add(() => material.mainPass.baseTex = over)
      button.onHoverExit.add(() => material.mainPass.baseTex = normal)
      button.onTriggerDown.add(() => material.mainPass.baseTex = over)
    }
    button.onTriggerUp.add(() => this.runNavigation(action))
    return material
  }

  /** Same gradient capsule family as the other primary buttons. */
  private addLiveTalkButton(parent: SceneObject): void {
    const width = LIVE_TALK_BUTTON_WIDTH
    const height = 4.8
    const root = this.makeObject(parent, "Live Talk Entry")
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, "primary")
    const label = this.addAbsoluteText(root, lingoCopy(this.nativeLanguage, "liveTalk"), width - 2.4, height - 1, "Body", LINGO_COLORS.white, new vec3(0, 0, 1.35))
    label.horizontalOverflow = HorizontalOverflow.Shrink
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => button.size = new vec3(width, height, 1))
    button.onHoverEnter.add(() => this.liveTalkHovered = true)
    button.onHoverExit.add(() => this.liveTalkHovered = false)
    button.onTriggerUp.add(() => this.runNavigation(() => this.showLiveTalkStep()))
  }

  /** The studied language's cloud bobs beside the button; tapping it opens Live Talk too. */
  private addLiveTalkCloud(parent: SceneObject): void {
    const size = LIVE_TALK_CLOUD_SIZE
    const slot = this.makeObject(parent, "Live Talk Cloud Slot")
    const item = slot.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = size
    item.overrideHeight = size
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    // Flex owns the slot's transform; the bobbing happens on a child.
    this.liveTalkCloudRoot = this.makeObject(slot, "Live Talk Cloud Art")
    this.addAbsoluteImage(this.liveTalkCloudRoot, LANGUAGE_CLOUDS[this.targetLanguage || "English"], LIVE_TALK_CLOUD_ART, LIVE_TALK_CLOUD_ART, new vec3(-1.2, 2.2, 2.2), "Live Talk Cloud Image")
    const button = slot.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Ghost"})
    button.onInitialized.add(() => {
      button.size = new vec3(LIVE_TALK_CLOUD_ART * 0.8, LIVE_TALK_CLOUD_ART * 0.8, 1)
      button.opacity = 0
      this.clearGhostVisual(button)
    })
    button.onHoverEnter.add(() => this.liveTalkHovered = true)
    button.onHoverExit.add(() => this.liveTalkHovered = false)
    button.onTriggerUp.add(() => this.runNavigation(() => this.showLiveTalkStep()))
    this.liveTalkTime = 0
    this.liveTalkHovered = false
  }

  /** A flex slot whose artwork is bigger than the slot itself, offset so it can overlap neighbors. */
  private addOverflowCloud(parent: SceneObject, texture: Texture, slotSize: number, artSize: number, offset: vec3, name: string): {object: SceneObject, base: vec3} {
    const slot = this.makeObject(parent, name)
    const item = slot.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = slotSize
    item.overrideHeight = slotSize
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    const object = this.addAbsoluteImage(slot, texture, artSize, artSize, offset, `${name} Art`)
    return {object, base: offset}
  }

  /** Skip depth and draw late: the image always shows over the panel's buttons. */
  private bringToFront(object: SceneObject): void {
    const image = object.getComponent("Component.Image") as Image | null
    if (!image) return
    image.mainMaterial.mainPass.depthTest = false
    image.setRenderOrder(FRONT_RENDER_ORDER)
  }

  private clearGhostVisual(button: Button): void {
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

  /** CLOUD CATCHER entry: it must read as a GAME at a glance — warm game colors,
   * a tilted "GAME!" sticker, a play arrow, a heartbeat pulse and word bubbles around it. */
  private addCatcherEntry(parent: SceneObject): void {
    const width = 24
    const height = 5.6
    const root = this.makeObject(parent, "Cloud Catcher Entry")
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, "game")
    const title = this.addAbsoluteText(root, "▶  CLOUD CATCHER", width - 6, 2.6, "Headline1", LINGO_COLORS.white, new vec3(1, 0.85, 1.35))
    title.horizontalOverflow = HorizontalOverflow.Shrink
    const hint = this.addAbsoluteText(root, lingoCopy(this.nativeLanguage, "catcherEntry"), width - 6, 1.9, "Caption", LINGO_COLORS.white, new vec3(1, -1.3, 1.35))
    hint.horizontalOverflow = HorizontalOverflow.Shrink
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => button.size = new vec3(width, height, 1))
    button.onTriggerUp.add(() => this.runNavigation(() => this._onLiveTalkSelected.invoke("CATCH")))

    // Tilted "GAME!" sticker on the top-left corner.
    const badge = this.makeObject(root, "Cloud Catcher Badge", new vec3(-width / 2 + 3.2, height / 2 + 0.4, 2))
    badge.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, 12 * MathUtils.DegToRad))
    const plate = badge.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(8.4, 2.6)
    afterComponentStart(this, () => this.styleRoundedPlate(badge, new vec4(1, 0.93, 0.35, 1), new vec4(1, 1, 1, 1), 1.3))
    const badgeText = this.addAbsoluteText(badge, lingoCopy(this.nativeLanguage, "catcherBadge"), 7.6, 2.1, "Caption", LINGO_COLORS.ink, new vec3(0, 0, 0.6))
    badgeText.horizontalOverflow = HorizontalOverflow.Shrink
    this.catcherBadge = {object: badge, base: badge.getTransform().getLocalPosition()}

    // A soft heartbeat on the whole button: it is alive, it is a game.
    this.fx.pulse(root, {amplitude: 0.035, hz: 1.1})

    // Word bubbles orbit the capsule: a preview of the game.
    const decor = [
      {texture: CATCHER_DECOR[0], base: new vec3(-width / 2 - 0.6, -height / 2 + 0.4, 2)},
      {texture: CATCHER_DECOR[1], base: new vec3(width / 2 - 2.2, height / 2 + 1.6, 2)},
      {texture: CATCHER_DECOR[2], base: new vec3(width / 2 + 0.8, -height / 2 + 0.2, 2)},
    ]
    for (let i = 0; i < decor.length; i++) {
      const object = this.addAbsoluteImage(root, decor[i].texture, 3.6, 3.6, decor[i].base, `Catcher Decor ${i}`)
      this.catcherDecor.push({object, base: decor[i].base, phase: i * 2.1})
    }
  }

  private animateCatcherDecor(): void {
    if (this.catcherDecor.length === 0 && !this.liveTalkIntroCloud) return
    this.catcherTime += getDeltaTime()
    const badge = this.catcherBadge
    if (badge && !isNull(badge.object)) {
      // The sticker wobbles like it wants to be tapped.
      const t = this.catcherTime
      badge.object.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, (12 + Math.sin(t * 3.2) * 6) * MathUtils.DegToRad))
    }
    const cloud = this.liveTalkIntroCloud
    if (cloud && !isNull(cloud.object)) {
      // Gentle float: bob, sway and a slight tilt.
      const t = this.catcherTime
      const transform = cloud.object.getTransform()
      transform.setLocalPosition(cloud.base.add(new vec3(Math.sin(t * 0.9) * 0.4, Math.sin(t * 1.6) * 0.9, 0)))
      transform.setLocalRotation(quat.fromEulerAngles(0, 0, Math.sin(t * 1.1) * 5 * MathUtils.DegToRad))
    }
    for (let i = 0; i < this.catcherDecor.length; i++) {
      const decor = this.catcherDecor[i]
      if (isNull(decor.object)) continue
      const t = this.catcherTime * 1.5 + decor.phase
      decor.object.getTransform().setLocalPosition(decor.base.add(new vec3(Math.cos(t) * 0.5, Math.sin(t) * 0.8, 0)))
    }
  }

  private animateLiveTalkCloud(): void {
    if (!this.liveTalkCloudRoot || isNull(this.liveTalkCloudRoot) || !this.liveTalkCloudRoot.isEnabledInHierarchy) return
    this.liveTalkTime += getDeltaTime()
    const t = this.liveTalkTime
    const transform = this.liveTalkCloudRoot.getTransform()
    transform.setLocalPosition(new vec3(0, Math.sin(t * 1.7) * 0.55, 0))
    transform.setLocalRotation(quat.fromEulerAngles(0, 0, Math.sin(t * 1.1) * 5 * MathUtils.DegToRad))
    const target = this.liveTalkHovered ? 1.12 : 1
    const scale = transform.getLocalScale().x
    const next = scale + (target - scale) * Math.min(1, getDeltaTime() * 10)
    transform.setLocalScale(new vec3(next, next, next))
  }

  private showReadyStep(): void {
    this.setLogoAlignment(FlexAlignSelf.Center, 32.5)
    const page = this.newPage("Ready")
    const pageFlex = page.getComponent(FlexLayout.getTypeName()) as FlexLayout
    pageFlex.rowGap = 1
    const native = this.nativeLanguage!
    const target = this.targetLanguage!
    const modeLabel = this.learningMode === "SCAN" ? lingoCopy(native, "scanMode") : lingoCopy(native, "imageMode")
    this.addSpacer(page, CONTENT_WIDTH, 0.4)

    // Cream bubble: READY title on top, the language pair (flag · name → flag · name) in its white pill.
    const bubbleWidth = 37
    const bubbleHeight = bubbleWidth * ART.readyBubble.aspect
    const bubble = this.makeObject(page, "Ready Bubble")
    this.addFlowSlot(page, bubble, bubbleWidth, bubbleHeight)
    artImage(bubble, ART.readyBubble, bubbleWidth, new vec3(0, 0, 0.4), "Ready Bubble Art")
    kitText(bubble, lingoCopy(native, "ready"), bubbleWidth * 0.76, 2.6, new vec3(1, bubbleHeight * 0.29, 1.2), 40, LINGO_COLORS.purple)
    const pillY = -bubbleHeight * 0.17
    artIcon(bubble, LANGUAGE_FLAGS[native], bubbleWidth, 0.17, 2.7).getTransform().setLocalPosition(new vec3(-bubbleWidth * 0.33, pillY, 1.2))
    kitText(bubble, languageName(native, native), 9.6, 2.6, new vec3(-bubbleWidth * 0.33 + 6.6, pillY, 1.2), 40, LINGO_COLORS.ink, true, HorizontalAlignment.Left)
    kitText(bubble, "→", 2.4, 2.6, new vec3(0.6, pillY, 1.2), 40, LINGO_COLORS.purple)
    artIcon(bubble, LANGUAGE_FLAGS[target], bubbleWidth, 0.5, 2.7).getTransform().setLocalPosition(new vec3(4, pillY, 1.2))
    kitText(bubble, languageName(target, native), 9.6, 2.6, new vec3(10.6, pillY, 1.2), 40, LINGO_COLORS.ink, true, HorizontalAlignment.Left)

    // The chosen mode and its hint on the lilac cloud pill.
    const pillWidth = 35
    const pillHeight = pillWidth * ART.modePill.aspect
    const pill = this.makeObject(page, "Ready Mode Pill")
    this.addFlowSlot(page, pill, pillWidth, pillHeight)
    artImage(pill, ART.modePill, pillWidth, new vec3(0, 0, 0.4), "Ready Mode Pill Art")
    kitText(pill, modeLabel, pillWidth * 0.84, 2.4, new vec3(0, pillHeight * 0.17, 1.2), 42, LINGO_COLORS.purple)
    kitText(pill, lingoCopy(native, "readyHint"), pillWidth * 0.86, 2.2, new vec3(0, -pillHeight * 0.2, 1.2), 32, LINGO_COLORS.ink, false)

    this.addKitButton(page, ART.startLong, 31, lingoCopy(native, "start"), 50, () => {
      if (this.nativeLanguage && this.targetLanguage && this.learningMode) this._onStart.invoke()
    })
    this.addKitButton(page, ART.back, 25, lingoCopy(native, "back"), 42, () => this.showModeStep())
    // The web link code: type it once on the website to see your progress there.
    {
      const codeWidth = 34
      const codeHeight = codeWidth * ART.cloudPill.aspect
      const codePill = this.makeObject(page, "Ready Web Code")
      this.addFlowSlot(page, codePill, codeWidth, codeHeight)
      artImage(codePill, ART.cloudPill, codeWidth, new vec3(0, 0, 0.4), "Ready Web Code Art")
      kitText(codePill, `${lingoCopy(native, "webCode")}  ${LINGO_WEB_URL}`, codeWidth * 0.86, 1.9, new vec3(0, codeHeight * 0.17, 1.2), 30, LINGO_COLORS.ink, false)
      const codeText = kitText(codePill, this.webCode || "NUBE-····-····", codeWidth * 0.8, 2.4, new vec3(0, -codeHeight * 0.2, 1.2), 44, LINGO_COLORS.purple)
      this.webCodeOnlyTexts.push(codeText)
    }
  }

  /** Registers an absolutely-drawn piece in a flex column. */
  private addFlowSlot(parent: SceneObject, child: SceneObject, width: number, height: number): void {
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
  }

  /** Shared-kit art button with its label, navigating like the other menu buttons. */
  private addKitButton(parent: SceneObject, art: ArtPiece, width: number, label: string, size: number, action: () => void, height: number = 0): void {
    const made = artButton(parent, art, width, `Kit-${label}`, vec3.zero(), height)
    this.addFlowSlot(parent, made.root, width, made.height * ART_FLOW)
    artLabel(made.root, art, width, stripArrow(label), size)
    made.button.onTriggerUp.add(() => this.runNavigation(action))
  }

  private addReadyLanguagePill(parent: SceneObject, value: string): void {
    const width = 29
    const height = 4.6
    const root = this.makeObject(parent, "Ready Language Pill")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(width, height)
    afterComponentStart(this, () => this.styleRoundedPlate(
      root,
      new vec4(1, 0.97, 0.91, 0.99),
      new vec4(0.84, 0.72, 1, 1),
      2.1,
    ))
    const textRoot = this.makeObject(root, "Ready Language", new vec3(0, 0, 1.2))
    const text = textRoot.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = TYPE_SCALE.Headline1.size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE.Headline1.weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Shrink
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2 + 1.1, width / 2 - 1.1, -height / 2 + 0.5, height / 2 - 0.5)
    text.textFill.color = LINGO_COLORS.ink
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
  }

  private addReadyChoiceButton(parent: SceneObject, label: string, icon: Texture, action: () => void, width: number, height: number, tone: LingoTone): void {
    const root = this.makeObject(parent, `Choice-${label}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, tone)
    this.addAbsoluteImage(root, icon, 2.35, 2.35, new vec3(-width * 0.5 + 2.35, 0, 1.35), `${label} Icon`)
    const textRoot = this.makeObject(root, `${label} Label`, new vec3(0.6, 0, 1.35))
    const text = textRoot.createComponent("Component.Text") as Text
    text.text = label
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = TYPE_SCALE.Headline1.size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE.Headline1.weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Shrink
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-(width - 6) / 2, (width - 6) / 2, -height / 2 + 0.45, height / 2 - 0.45)
    text.textFill.color = LINGO_COLORS.white
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => button.size = new vec3(width, height, 1))
    button.onTriggerUp.add(() => this.runNavigation(action))
  }

  private newPage(name: string): SceneObject {
    // Detach the old item before destroying its SceneObject. FlexLayout defers
    // layout until LateUpdate, so leaving a destroyed item in its managed list
    // can make it call applyLayout on a null object during fast page changes.
    if (this.pageItem) {
      this.outerFlex.removeItems([this.pageItem])
      this.pageItem = null
    }
    if (this.pageRoot) {
      deferDestroy(this, this.pageRoot)
      this.pageRoot = null
    }
    this.languageCloudMaterial = null
    this.liveTalkCloudRoot = null
    this.catcherDecor = []
    this.liveTalkIntroCloud = null
    this.catcherBadge = null
    this.mascotWelcomeText = null
    this.languagePromptText = null
    const page = this.makeObject(this.outerFlex.sceneObject, name)
    const pageFlex = page.createComponent(FlexLayout.getTypeName()) as FlexLayout
    pageFlex.autoDiscoverItemsOnStart = false
    pageFlex.width = CONTENT_WIDTH
    pageFlex.height = -1
    pageFlex.direction = FlexDirection.Column
    pageFlex.alignItems = FlexAlign.Stretch
    pageFlex.justifyContent = FlexJustify.Start
    pageFlex.rowGap = 0.85
    const item = page.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = CONTENT_WIDTH
    item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Stretch
    this.outerFlex.addItems([item])
    this.pageItem = item
    this.pageRoot = page
    // Each setup step lands with a kawaii pop instead of an instant swap.
    this.fx.popIn(page, {rotateDegrees: -7, duration: 0.38})
    return page
  }

  private addChoiceButton(parent: SceneObject, label: string, icon: Texture, action: () => void, height: number = 4.5, centered: boolean = false, tone: LingoTone = "neutral", width: number = CONTENT_WIDTH): void {
    const root = this.makeObject(parent, `Choice-${label}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: label === "BACK" ? "Secondary" : "Primary"})
    styleLingoButton(button, tone)
    const content = root.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = label
    content.textSize = TYPE_SCALE.Body.size
    content.leadingIcon = icon
    content.leadingIconSize = 1.9
    content.spacing = 0.8
    content.contentAlignment = centered ? "center" : "left"
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Stretch
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => button.size = new vec3(width, height, 1))
    button.onTriggerUp.add(() => this.runNavigation(action))
  }

  private addLanguageButton(parent: SceneObject, language: LanguageId, selected: boolean, action: () => void, committed: () => LanguageId | null, endonym: boolean = false): void {
    const width = 25
    const height = 4.35
    const root = this.makeObject(parent, `Language-${language}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: selected ? "Primary" : "Secondary"})
    styleLingoButton(button, selected ? "primary" : "card")

    const contentRow = this.addFlexContainer(root, `${language} Content`, 21.8, height, FlexDirection.Row, 0.65, false, new vec3(0, 0, 1.2))
    const rowFlex = contentRow.getComponent(FlexLayout.getTypeName()) as FlexLayout
    rowFlex.alignItems = FlexAlign.Center
    rowFlex.justifyContent = FlexJustify.Start
    this.addImage(contentRow, LANGUAGE_FLAGS[language], 2.55, 2.55, `${language} Flag`)
    // The native-language picker names every language in ITSELF (endonym) — the
    // one label its speaker is guaranteed to read before any choice exists.
    const label = this.addText(contentRow, languageName(language, endonym ? language : this.nativeLanguage), 14.5, 3.4, "Body", selected ? LINGO_COLORS.softWhite : LINGO_COLORS.ink, HorizontalAlignment.Left)
    const checkItem = this.addImage(contentRow, CHECK_ICON, 2, 2, "Selected Language")
    checkItem.sceneObject.enabled = selected

    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Stretch
    const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (parentFlex) parentFlex.addItems([item])
    this.languageVisuals.push({language, button, label, check: checkItem.sceneObject})
    button.onInitialized.add(() => button.size = new vec3(width, height, 1))
    button.onHoverEnter.add(() => this.setLanguageVisualSelection(language))
    button.onHoverExit.add(() => {
      const committedLanguage = committed()
      if (committedLanguage) this.setLanguageVisualSelection(committedLanguage)
      else this.clearLanguageVisualSelection()
    })
    button.onTriggerDown.add(() => this.setLanguageVisualSelection(language))
    button.onTriggerUp.add(() => this.runNavigation(action))
  }

  private addModeTextureButton(
    parent: SceneObject,
    mode: LearningMode,
    selectedTexture: Texture,
    unselectedTexture: Texture,
    initialSelected: boolean,
    action: () => void,
  ): void {
    const root = this.makeObject(parent, `Mode-${mode}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Ghost"})
    const material = this.addButtonTextureVisual(
      root,
      initialSelected ? selectedTexture : unselectedTexture,
      MODE_STEP_CARD_WIDTH,
      MODE_STEP_CARD_WIDTH * MODE_CARD_ASPECT,
      `${mode} Mode Artwork`,
    )
    this.modeVisuals.push({mode, material, selected: selectedTexture, unselected: unselectedTexture})
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = MODE_STEP_CARD_WIDTH
    item.overrideHeight = MODE_STEP_CARD_WIDTH * MODE_CARD_ASPECT * MODE_STEP_CARD_FLOW
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => {
      button.size = new vec3(MODE_STEP_CARD_WIDTH, MODE_STEP_CARD_WIDTH * MODE_CARD_ASPECT * MODE_STEP_CARD_FLOW, 1)
      button.opacity = 0
      // The artwork IS the button: the ghost visual must never draw its dark
      // outline or fill in any state (hover/selected included).
      const visual = button.visual as RoundedRectangleVisual
      if (visual instanceof RoundedRectangleVisual) {
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
    })
    button.onHoverEnter.add(() => this.setModeVisualSelection(mode))
    button.onTriggerDown.add(() => this.setModeVisualSelection(mode))
    button.onTriggerUp.add(() => this.runNavigation(action))
  }

  private modeTexturesFor(language: LanguageId | null): ModeTextureSet {
    const fallback: ModeTextureSet = {
      image: IMAGE_CARDS_TEXTURE,
      imageSelected: IMAGE_CARDS_SELECTED_TEXTURE,
      scan: SCAN_WORLD_TEXTURE,
      scanSelected: SCAN_WORLD_SELECTED_TEXTURE,
    }
    switch (language) {
      case "Spanish":
        return {
          image: this.spanishImageCards || fallback.image,
          imageSelected: this.spanishImageCardsSelected || fallback.imageSelected,
          scan: this.spanishScanWorld || fallback.scan,
          scanSelected: this.spanishScanWorldSelected || fallback.scanSelected,
        }
      case "English":
        return {
          image: this.englishImageCards || fallback.image,
          imageSelected: this.englishImageCardsSelected || fallback.imageSelected,
          scan: this.englishScanWorld || fallback.scan,
          scanSelected: this.englishScanWorldSelected || fallback.scanSelected,
        }
      case "German":
        return {
          image: this.germanImageCards || fallback.image,
          imageSelected: this.germanImageCardsSelected || fallback.imageSelected,
          scan: this.germanScanWorld || fallback.scan,
          scanSelected: this.germanScanWorldSelected || fallback.scanSelected,
        }
      case "French":
        return {
          image: this.frenchImageCards || fallback.image,
          imageSelected: this.frenchImageCardsSelected || fallback.imageSelected,
          scan: this.frenchScanWorld || fallback.scan,
          scanSelected: this.frenchScanWorldSelected || fallback.scanSelected,
        }
      case "Italian":
        return {
          image: this.italianImageCards || fallback.image,
          imageSelected: this.italianImageCardsSelected || fallback.imageSelected,
          scan: this.italianScanWorld || fallback.scan,
          scanSelected: this.italianScanWorldSelected || fallback.scanSelected,
        }
      case "Japanese":
        return {
          image: this.japaneseImageCards || fallback.image,
          imageSelected: this.japaneseImageCardsSelected || fallback.imageSelected,
          scan: this.japaneseScanWorld || fallback.scan,
          scanSelected: this.japaneseScanWorldSelected || fallback.scanSelected,
        }
      default:
        return fallback
    }
  }

  private addTextureButton(parent: SceneObject, name: string, texture: Texture, width: number, height: number, action: () => void): void {
    const root = this.makeObject(parent, name)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Ghost"})
    this.addButtonTextureVisual(root, texture, width, height, `${name} Artwork`)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    button.onInitialized.add(() => {
      button.size = new vec3(width, height, 1)
      button.opacity = 0
    })
    button.onTriggerUp.add(() => this.runNavigation(action))
  }

  private addButtonTextureVisual(parent: SceneObject, texture: Texture, width: number, height: number, name: string): Material {
    const root = this.makeObject(parent, name, new vec3(0, 0, 0.6))
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
    return material
  }

  private setModeVisualSelection(mode: LearningMode | "LIVE"): void {
    for (let i = 0; i < this.modeVisuals.length; i++) {
      const visual = this.modeVisuals[i]
      const selected = visual.mode === mode
      visual.material.mainPass.baseTex = selected ? visual.selected : visual.unselected
    }
  }

  private setLanguageVisualSelection(language: LanguageId): void {
    for (let i = 0; i < this.languageVisuals.length; i++) {
      const visual = this.languageVisuals[i]
      const selected = visual.language === language
      visual.button.isOn = selected
      styleLingoButton(visual.button, selected ? "primary" : "card")
      visual.label.textFill.color = selected ? LINGO_COLORS.softWhite : LINGO_COLORS.ink
      visual.check.enabled = selected
    }
    if (this.cloudFollowsLanguagePreview) {
      this.setLanguageCloud(language)
      this.mascotLanguage = language
      this.refreshMascotWelcome()
      if (this.languagePromptText) this.languagePromptText.text = lingoCopy(language, "nativePrompt")
    }
  }

  private clearLanguageVisualSelection(): void {
    for (let i = 0; i < this.languageVisuals.length; i++) {
      const visual = this.languageVisuals[i]
      visual.button.isOn = false
      styleLingoButton(visual.button, "card")
      visual.label.textFill.color = LINGO_COLORS.ink
      visual.check.enabled = false
    }
    if (this.cloudFollowsLanguagePreview) {
      this.setLanguageCloud("English")
      this.mascotLanguage = "English"
      this.refreshMascotWelcome()
      if (this.languagePromptText) this.languagePromptText.text = lingoCopy("English", "nativePrompt")
    }
  }

  private addLanguageCloud(parent: SceneObject, language: LanguageId, name: string): void {
    const width = 16.6
    const height = 16.6
    const root = this.makeObject(parent, name, new vec3(0, 0, 0.08))
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = LANGUAGE_CLOUDS[language]
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.depthTest = true
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    root.getTransform().setLocalScale(new vec3(width, height, 1))
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Center
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    this.languageCloudMaterial = material
    this.mascotLanguage = language
  }

  private addMascotWelcome(parent: SceneObject, language: LanguageId): void {
    const text = this.addText(parent, this.welcomeMessage(language), 16.8, 4.1, "Caption", LINGO_COLORS.purple)
    text.horizontalOverflow = HorizontalOverflow.Shrink
    text.verticalOverflow = VerticalOverflow.Shrink
    this.mascotWelcomeText = text
    this.mascotLanguage = language
  }

  private setLanguageCloud(language: LanguageId): void {
    if (this.languageCloudMaterial) this.languageCloudMaterial.mainPass.baseTex = LANGUAGE_CLOUDS[language]
  }

  private refreshMascotWelcome(): void {
    if (this.mascotWelcomeText) this.mascotWelcomeText.text = this.welcomeMessage(this.mascotLanguage)
  }

  private welcomeMessage(language: LanguageId): string {
    switch (language) {
      case "Spanish": return `¡Hola, ${this.userName}!\nQué bueno verte de nuevo.`
      case "English": return `Hi, ${this.userName}!\nWelcome back.`
      case "German": return `Hallo, ${this.userName}!\nWillkommen zurück.`
      case "French": return `Bonjour, ${this.userName} !\nBon retour.`
      case "Italian": return `Ciao, ${this.userName}!\nChe bello rivederti.`
      case "Japanese": return `${this.userName}さん、こんにちは！\nおかえりなさい。`
    }
  }

  private addSpeechBubble(parent: SceneObject, value: string, width: number = 27.2, height: number = 5.5): Text {
    const root = this.makeObject(parent, "Native Language Prompt")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(width, height)
    afterComponentStart(this, () => this.styleRoundedPlate(
      root,
      new vec4(1, 0.98, 0.93, 0.99),
      new vec4(0.92, 0.83, 1, 0.96),
      1.8,
    ))
    const textRoot = this.makeObject(root, "Prompt Text", new vec3(0, 0, 1.2))
    const text = textRoot.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = TYPE_SCALE.Subheadline.size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE.Subheadline.weight
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2 + 0.8, width / 2 - 0.8, -height / 2 + 0.4, height / 2 - 0.4)
    text.textFill.color = LINGO_COLORS.ink

    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.End
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    return text
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color?: vec4, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
    const root = this.makeObject(parent, `Text-${value}`)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
    text.size = TYPE_SCALE[role].size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
    text.horizontalAlignment = alignment
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color || (role === "Caption" ? new vec4(1, 1, 1, 0.72) : LINGO_COLORS.softWhite)
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Stretch
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    return text
  }

  private addImage(parent: SceneObject, texture: Texture, width: number, height: number, name: string = "Artwork", alignment: FlexAlignSelf = FlexAlignSelf.Center): FlexItem {
    const root = this.makeObject(parent, name, new vec3(0, 0, 0.08))
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
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.alignSelf = alignment
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
    return item
  }

  private addAbsoluteImage(parent: SceneObject, texture: Texture, width: number, height: number, position: vec3, name: string): SceneObject {
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

  private addProportionalLogo(parent: SceneObject, width: number, alignment: FlexAlignSelf): void {
    const slot = this.makeObject(parent, "Lingo Specs Logo Slot")
    const item = slot.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = width * LOGO_VISIBLE_HEIGHT_RATIO
    item.alignSelf = alignment
    item.flexShrink = 0
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])

    this.logoItem = item
    this.logoImageRoot = this.addAbsoluteImage(
      slot,
      LOGO_TEXTURE,
      width,
      width,
      new vec3(0, 0, 0.08),
      "Lingo Specs Logo",
    )
  }

  private addAbsoluteText(
    parent: SceneObject,
    value: string,
    width: number,
    height: number,
    role: TextRole,
    color: vec4,
    position: vec3,
    alignment: HorizontalAlignment = HorizontalAlignment.Center,
  ): Text {
    const root = this.makeObject(parent, `Overlay-${value}`, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = true
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

  private setLogoAlignment(alignment: FlexAlignSelf, size: number = 25): void {
    if (!this.logoItem || !this.logoImageRoot) return
    this.logoItem.alignSelf = alignment
    this.logoItem.overrideWidth = size
    this.logoItem.overrideHeight = size * LOGO_VISIBLE_HEIGHT_RATIO
    this.logoImageRoot.getTransform().setLocalScale(new vec3(size, size, 1))
    if (this.outerFlex) this.outerFlex.markDirty()
  }

  private addFlexContainer(
    parent: SceneObject,
    name: string,
    width: number,
    height: number,
    direction: FlexDirection,
    gap: number,
    registerWithParent: boolean = true,
    position?: vec3,
  ): SceneObject {
    const root = this.makeObject(parent, name, position)
    const flex = root.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = width
    flex.height = height
    flex.direction = direction
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Start
    flex.rowGap = gap
    flex.columnGap = gap
    if (registerWithParent) {
      const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideWidth = width
      item.overrideHeight = height
      item.flexShrink = 0
      item.alignSelf = FlexAlignSelf.Stretch
      const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
      if (parentFlex) parentFlex.addItems([item])
    }
    return root
  }

  private addSpacer(parent: SceneObject, width: number, height: number): void {
    const root = this.makeObject(parent, "Spacer")
    const item = root.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    item.flexShrink = 0
    const flex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (flex) flex.addItems([item])
  }

  private styleRoundedPlate(root: SceneObject, background: vec4, border: vec4, cornerRadius: number): void {
    if (!root || isNull(root)) return
    const rounded = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (!rounded) return
    rounded.gradient = false
    rounded.backgroundColor = background
    rounded.cornerRadius = cornerRadius
    rounded.border = border.w > 0
    rounded.borderSize = 0.07
    rounded.borderColor = border
  }

  private runNavigation(action: () => void): void {
    if (this.navigationLocked) return
    this.navigationLocked = true
    action()
    this.navigationUnlockEvent.reset(0.35)
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
