/** Live Talk panel: scene picker, the role-play conversation with per-turn
 * coaching, and the end-of-scene summary. Built like the quiz HUD. */
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./compat515/FlexTypes515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button515 as Button} from "./compat515/Button515"
import {afterComponentStart} from "./compat515/Timing515"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {hasDenseScript, LanguageId, SpeakingLevel} from "./LingoSpaceData"
import {languageName, lingoCopy, LingoCopyKey} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT_BOLD, LINGO_FONT_SEMIBOLD, LingoTone, styleLingoButton} from "./LingoSpaceTheme"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {DrillItem, DrillPlan, PlacementStep, TalkCorrection, TalkLine, TalkScene, TalkSummary} from "./LingoSpaceTalkService"
import {LANDMARKS, OBJECT_ICONS, ObjectIconKey, SCENE_ART, TALK_ICONS} from "./LingoSpaceTalkArt"
import {ART, ART_FLOW, ArtButton, artButton, artImage, artLabel, artPiece, ArtPiece, clearButtonVisual, fitRow, hitButton, SKIP_WIDTH, skipButton, stripArrow} from "./LingoSpaceArtKit"

type TextRole = "Headline" | "Subheadline" | "Body" | "Caption"

const IMAGE_MATERIAL = IMAGE_MATERIAL_ASSET
const MIC_ICON = requireAsset("../Icons/mic.png") as Texture
const VOLUME_ICON = requireAsset("../Icons/volume_up.png") as Texture
const BACK_ICON = requireAsset("../Icons/arrow_back.png") as Texture
const BACKGROUND_TEXTURE = requireAsset("../ScreenDesign/background.png") as Texture
const STAR_TEXTURE = requireAsset("../LingoDesign/stars.png") as Texture
const FLAME_ICON = requireAsset("../Icons/flame.png") as Texture
const BOLT_ICON = requireAsset("../Icons/bolt.png") as Texture
const CHECK_ICON = requireAsset("../Icons/check_circle.png") as Texture
const BOOK_ICON = requireAsset("../AIImagesKawaii/book.png") as Texture
const REFRESH_ICON = requireAsset("../Icons/refresh.png") as Texture
const SCENE_ICONS: Record<TalkScene, Texture> = {
  CAFE: requireAsset("../Icons/restaurant.png") as Texture,
  AIRPORT: requireAsset("../Icons/flight.png") as Texture,
  FRIEND: requireAsset("../Icons/group.png") as Texture,
  ROOM: requireAsset("../Icons/home.png") as Texture,
  CUSTOM: MIC_ICON,
}
/** Designed scene capsules (icon circle, illustration and chevron baked in). */
const SCENE_BUTTON_ART: Record<TalkScene, ArtPiece> = {
  CAFE: artPiece(requireAsset("../ScreenDesign/talk/scene-btn-cafe.png") as Texture, 786, 164),
  AIRPORT: artPiece(requireAsset("../ScreenDesign/talk/scene-btn-airport.png") as Texture, 786, 164),
  FRIEND: artPiece(requireAsset("../ScreenDesign/talk/scene-btn-friend.png") as Texture, 786, 164),
  ROOM: artPiece(requireAsset("../ScreenDesign/talk/scene-btn-room.png") as Texture, 786, 164),
  CUSTOM: artPiece(requireAsset("../ScreenDesign/talk/scene-btn-place.png") as Texture, 786, 164),
}
const LEVEL_BAR_ART = artPiece(requireAsset("../ScreenDesign/talk/level-bar.png") as Texture, 670, 110)
const SCENE_ORDER: TalkScene[] = ["CAFE", "AIRPORT", "FRIEND", "ROOM"]
const LANGUAGE_CLOUDS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../LingoDesign/nube-es.png") as Texture,
  English: requireAsset("../LingoDesign/nube-en.png") as Texture,
  German: requireAsset("../LingoDesign/nube-gr.png") as Texture,
  French: requireAsset("../LingoDesign/nube-fr.png") as Texture,
  Italian: requireAsset("../LingoDesign/nube-it.png") as Texture,
  Japanese: requireAsset("../LingoDesign/nube-jp.png") as Texture,
}

// Same explicit draw order as the quiz: background, plates, images, texts, buttons.
const RENDER_ORDER = {background: 6, plate: 8, image: 11, text: 14, buttonMesh: 16, buttonIcon: 17, buttonText: 18}
const TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Headline: {size: 54, weight: 800},
  Subheadline: {size: 46, weight: 800},
  Body: {size: 41, weight: 700},
  Caption: {size: 37, weight: 700},
}
/** Fredoka Bold for titles, SemiBold for everything else (like the mockups). */
const ROLE_FONT: Record<TextRole, Font> = {
  Headline: LINGO_FONT_BOLD,
  Subheadline: LINGO_FONT_BOLD,
  Body: LINGO_FONT_SEMIBOLD,
  Caption: LINGO_FONT_SEMIBOLD,
}
const OK_COLOR = new vec4(0.08, 0.56, 0.4, 1)
const FIX_COLOR = new vec4(0.82, 0.34, 0.12, 1)
const TRANSLATION_COLOR = new vec4(0.05, 0.48, 0.43, 1)
const CREAM = new vec4(1, 0.97, 0.91, 0.99)
const LILAC_BORDER = new vec4(0.84, 0.72, 1, 1)
const MINT_PLATE = new vec4(0.9, 0.98, 0.94, 0.99)
const PEACH_PLATE = new vec4(1, 0.93, 0.86, 0.99)
const LILAC_PLATE = new vec4(0.95, 0.91, 1, 0.99)
const GOLD_EDGE = new vec4(1, 0.8, 0.45, 1)
/** Bubbly titles: deep violet with a thick white outline and a soft lilac shadow. */
const TITLE_PURPLE = new vec4(0.36, 0.16, 0.9, 1)
const SOFT_INK = new vec4(0.42, 0.38, 0.6, 1)
const DOT_PURPLE = new vec4(0.43, 0.24, 0.93, 1)
const WHITE_GLASS = new vec4(1, 1, 1, 0.28)
/** Lesson-loading bar: eases toward this share while the AI writes. */
const LOADING_CAP = 0.92
const CONTENT_WIDTH = 42
/** Height of the panel's top edge in the head-locked root: the MOVE / FOLLOW
 * handles (centered at y 33.1) straddle it like on the menu screens. */
const PANEL_TOP_EDGE = 32.2
const SCENE_BUTTON_HEIGHT = 6.4
/** Spoken tries per drill sentence before moving on. */
const DRILL_ATTEMPTS = 3

/** Which page is showing: the mic hold means something different on each. */
export type TalkPage = "PICKER" | "CHAT" | "SUMMARY" | "DRILL" | "LEVEL"
/** SPEAK = guided speaking practice (build and say sentences); AI = free conversation. */
export type TalkMode = "SPEAK" | "AI"
/** End-of-game scoreboard (CLOUD CATCHER). */
export type GameResults = {title: string, note: string, stars: number, scorePercent: number, bestStreak: number, xp: number, correct: number, toPractice: TalkLine[]}
/** SAY: hear the sentence and repeat it whole. FINAL: answer the cues from memory. */
type DrillPhase = "SAY" | "FINAL"

export class LingoSpaceTalkUI {
  private root: SceneObject
  private contentFlex!: FlexLayout
  private backgroundRoot!: SceneObject
  private pageRoot: SceneObject | null = null
  private pageItem: FlexItem | null = null
  private fx: LingoFX
  private nativeLanguage: LanguageId = "English"
  private targetLanguage: LanguageId = "Spanish"
  private talkHeld = false
  private page: TalkPage = "PICKER"
  private mode: TalkMode = "AI"
  private level: SpeakingLevel | null = null
  private subtitlesOn = true
  private subtitleLabel: Text | null = null
  private partnerLine: TalkLine | null = null
  // Guided speaking (drill) state.
  private drillScene: TalkScene = "CAFE"
  private drillTitle = ""
  private drillRole = ""
  private drillItems: DrillItem[] = []
  private drillIndex = 0
  private drillPhase: DrillPhase = "SAY"
  private drillAttempts = 0
  private drillCorrect = 0
  private drillXp = 0
  /** The sentence is done: the next one starts once the coach stops talking. */
  private drillAwaitingNext = false
  private hintPlate: SceneObject | null = null
  private hintText: Text | null = null
  private sentenceText: Text | null = null
  private busy = false
  private finished = false
  private generation = 0

  // Conversation page views (rebuilt per scene, updated per turn).
  private roleText: Text | null = null
  private goalTexts: Text[] = []
  private goals: string[] = []
  private partnerText: Text | null = null
  private partnerTranslation: Text | null = null
  private learnerText: Text | null = null
  private statusText: Text | null = null
  private endLabel: Text | null = null
  private goalRows: {circle: SceneObject, check: Text, label: Text, iconSlot: SceneObject}[] = []
  private goalProgress: Text | null = null
  private goalDots: SceneObject[] = []
  /** Lesson-loading bar (animated while the AI writes). */
  private loadingFill: SceneObject | null = null
  private loadingStar: SceneObject | null = null
  private loadingTime = 0

  private _onSceneChosen = new Event<string>()
  private _onBackRequested = new Event<void>()
  private _onVoiceHoldStart = new Event<string>()
  private _onVoiceHoldEnd = new Event<void>()
  private _onListenRequested = new Event<void>()
  private _onDrillSpeak = new Event<{text: string, kind: "model" | "cue"}>()
  private _onDrillFinished = new Event<{correct: number, total: number, xp: number, items: DrillItem[]}>()
  private _onHintRequested = new Event<void>()
  private _onPlacementSelfReport = new Event<SpeakingLevel>()
  private _onPlacementSkip = new Event<void>()
  private _onPlacementListen = new Event<void>()
  private _onEndRequested = new Event<void>()

  get onSceneChosen(): PublicApi<string> { return this._onSceneChosen.publicApi() }
  get onBackRequested(): PublicApi<void> { return this._onBackRequested.publicApi() }
  /** Purpose of the hold: "TURN" (role-play) or "PLACE" (dictating a custom scene). */
  get onVoiceHoldStart(): PublicApi<string> { return this._onVoiceHoldStart.publicApi() }
  get onVoiceHoldEnd(): PublicApi<void> { return this._onVoiceHoldEnd.publicApi() }
  get onListenRequested(): PublicApi<void> { return this._onListenRequested.publicApi() }
  /** The drill wants a line spoken: the learner's model sentence (slow) or the other person's cue. */
  get onDrillSpeak(): PublicApi<{text: string, kind: "model" | "cue"}> { return this._onDrillSpeak.publicApi() }
  get onDrillFinished(): PublicApi<{correct: number, total: number, xp: number, items: DrillItem[]}> { return this._onDrillFinished.publicApi() }
  /** AI PRACTICE help: "what do I say?". */
  get onHintRequested(): PublicApi<void> { return this._onHintRequested.publicApi() }
  /** Placement test: the learner's own estimate starts it; skip = "I don't know"; listen = hear the question again. */
  get onPlacementSelfReport(): PublicApi<SpeakingLevel> { return this._onPlacementSelfReport.publicApi() }
  get onPlacementSkip(): PublicApi<void> { return this._onPlacementSkip.publicApi() }
  get onPlacementListen(): PublicApi<void> { return this._onPlacementListen.publicApi() }
  get onEndRequested(): PublicApi<void> { return this._onEndRequested.publicApi() }

  constructor(owner: SceneObject, private host: BaseScriptComponent, private audio: LingoSpaceAudioController) {
    // Same placement as the quiz HUD: centered in the FOV, clear of MOVE/FOLLOW.
    this.root = this.makeObject(owner, "Live Talk HUD", new vec3(0, 8, 2))
    this.fx = new LingoFX(host)
    this.backgroundRoot = this.addTextureImage(this.root, BACKGROUND_TEXTURE, 50, 62, "Live Talk Background", new vec3(0, 0, 0.2))
    const content = this.makeObject(this.root, "Live Talk Content", new vec3(0, 0, 1.3))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.contentFlex = flex
    flex.autoDiscoverItemsOnStart = false
    flex.width = 44
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Center
    flex.rowGap = 0.3
    flex.paddingTop = 1.6
    flex.paddingBottom = 1.6
    flex.paddingLeft = 0.8
    flex.paddingRight = 0.8
    flex.onLayoutComplete.add((result) => {
      const panelHeight = result.containerHeight + 5
      this.backgroundRoot.getTransform().setLocalScale(new vec3(result.containerWidth + 5.5, panelHeight, 1))
      // Pages differ in height: pin the panel's TOP edge (not its center) so the
      // MOVE / FOLLOW handles always sit on the border, as on every other screen.
      const position = this.root.getTransform().getLocalPosition()
      this.root.getTransform().setLocalPosition(new vec3(position.x, PANEL_TOP_EDGE - panelHeight / 2, position.z))
    })
    this.root.enabled = false
    host.createEvent("UpdateEvent").bind(() => this.tickLoading())
  }

  isOpen(): boolean { return this.root.enabled }
  currentPage(): TalkPage { return this.page }
  currentMode(): TalkMode { return this.mode }

  hide(): void {
    this.releaseHeldTalk()
    this.root.enabled = false
    this.generation += 1
    this.busy = false
  }

  /** Entry point: the placement test the first time for this language, then the scene picker. */
  open(nativeLanguage: LanguageId, targetLanguage: LanguageId, mode: TalkMode, level: SpeakingLevel | null): void {
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.mode = mode
    this.level = level
    // Advanced learners start without subtitles; they can always turn them on.
    this.subtitlesOn = !level || level === "A0" || level === "A1" || level === "A2"
    this.root.enabled = true
    if (level) this.showScenePicker()
    else this.showPlacementIntro()
    this.fx.popIn(this.root, {rotateDegrees: -8})
  }

  showScenePicker(): void {
    this.generation += 1
    this.busy = false
    const page = this.newPage("Live Talk Scenes")
    this.page = "PICKER"
    const intro = this.makeRow(page, "Scenes Intro", 10.5, 0.6)
    this.addOverflowArt(intro, LANGUAGE_CLOUDS[this.targetLanguage], 10, 10.5, 13.5, new vec3(0, 0.4, 0.6), "Scenes Cloud")
    // The bubble doubles as the status line while the wearer dictates a place.
    const bubbleWidth = 30
    const bubble = this.makeObject(intro, "Scenes Bubble")
    this.registerFlexItem(intro, bubble, bubbleWidth, 9.5, FlexAlignSelf.Center)
    artImage(bubble, ART.bubbleCream, bubbleWidth, new vec3(0, 0, 0.4), "Scenes Bubble Art")
    // The tail takes the left edge: text sits a touch right of center.
    this.statusText = this.addOverlayText(bubble, this.copy("talkPickScene"), bubbleWidth - 6, 6.4, "Headline", TITLE_PURPLE, new vec3(1, 0, 1.2))
    this.statusText.size = 52
    if (this.level) this.addLevelBar(page, this.level)
    for (let i = 0; i < SCENE_ORDER.length; i++) this.addSceneButton(page, SCENE_ORDER[i])
    this.addSceneButton(page, "CUSTOM")
    const back = this.makeRow(page, "Scenes Back Row", 5, 0.6)
    this.addBackButton(back, 22, () => {
      if (this.busy) return
      this._onBackRequested.invoke()
    })
    this.scheduleRenderOrderPass()
  }

  /** Conversation page shell while the opening line is being written. */
  beginScene(scene: TalkScene, customPlace: string = ""): void {
    this.generation += 1
    this.busy = true
    this.finished = false
    const page = this.newPage("Live Talk Conversation")
    this.page = "CHAT"

    // Header: cloud · scene title + role · mission progress, scene art behind.
    const header = this.makeRow(page, "Talk Header", 9, 0.4)
    this.addOverflowArt(header, LANGUAGE_CLOUDS[this.targetLanguage], 9, 9, 12.5, new vec3(0, 0.6, 0.6), "Talk Cloud")
    const titles = this.makeColumn(header, "Talk Titles", 19, 9)
    const title = scene === "CUSTOM" && customPlace ? customPlace.toUpperCase() : this.sceneTitle(scene)
    this.bubbly(this.addText(titles, title, 19, 3.6, "Headline", TITLE_PURPLE, HorizontalAlignment.Left), 54)
    this.roleText = this.addText(titles, "", 19, 2.6, "Subheadline", LINGO_COLORS.lavender, HorizontalAlignment.Left)
    const side = this.makeColumn(header, "Talk Progress", 13, 9)
    const dotsRow = this.makeRowW(side, "Talk Dots", 13, 3, 0)
    this.goalDots = []
    for (let i = 0; i < 3; i++) {
      if (i > 0) this.addShape(dotsRow, "Dot Line", 1.2, 0.28, LINGO_COLORS.lavender, LINGO_COLORS.lavender, 0.14)
      this.goalDots.push(this.addCircle(dotsRow, i === 0 ? 2.2 : 1.9, LINGO_COLORS.white, DOT_PURPLE, ""))
    }
    this.goalProgress = this.addText(dotsRow, "0 / 3", 4.4, 2.4, "Caption", LINGO_COLORS.ink)
    this.addSceneArt(side, scene, 13, 5.6)

    // The partner's line in a speech bubble, with a speaker to hear it again.
    const partner = this.addPlate(page, "Partner Bubble", CONTENT_WIDTH - 2, 8.6, CREAM, LILAC_BORDER)
    this.addSpeakerButton(partner, new vec3(-(CONTENT_WIDTH - 2) / 2 + 3.8, 0.4, 1.3), 5, () => this._onListenRequested.invoke())
    this.partnerText = this.addOverlayText(partner, this.copy("talkThinking"), CONTENT_WIDTH - 11, 4.4, "Subheadline", LINGO_COLORS.ink, new vec3(3, 1.3, 1.2), HorizontalAlignment.Left)
    this.partnerTranslation = this.addOverlayText(partner, "", CONTENT_WIDTH - 11, 2.6, "Caption", TRANSLATION_COLOR, new vec3(3, -2.6, 1.2), HorizontalAlignment.Left)

    // Mission goals as pills: a circle that fills with a check, and an object picture.
    this.goalRows = []
    for (let i = 0; i < 3; i++) {
      const pill = this.addPlate(page, `Goal ${i}`, CONTENT_WIDTH - 6, 3.6, i === 0 ? CREAM : LILAC_PLATE, LILAC_BORDER)
      const circle = this.makeObject(pill, `Goal Circle ${i}`, new vec3(-(CONTENT_WIDTH - 6) / 2 + 2.4, 0, 1.1))
      this.circlePlate(circle, 2.3, LINGO_COLORS.white, DOT_PURPLE)
      const check = this.addOverlayText(circle, "", 2, 2, "Caption", LINGO_COLORS.white, new vec3(0, 0, 0.3))
      const label = this.addOverlayText(pill, "", CONTENT_WIDTH - 17, 2.6, "Body", TITLE_PURPLE, new vec3(-1.5, 0, 1.2), HorizontalAlignment.Left)
      const iconSlot = this.makeObject(pill, `Goal Icon ${i}`, new vec3((CONTENT_WIDTH - 6) / 2 - 3, 0, 1.2))
      this.goalRows.push({circle, check, label, iconSlot})
    }

    // No written corrections here: the coach speaks them. The learner's line
    // just turns green (✓) or orange (↻) as a glanceable cue.
    this.learnerText = this.addText(page, "", CONTENT_WIDTH, 2.4, "Caption", LINGO_COLORS.purple)

    // "What do I say?" help: hidden until asked for.
    this.hintPlate = this.addPlate(page, "Hint Card", CONTENT_WIDTH - 2, 7.4, CREAM, LILAC_BORDER)
    this.hintText = this.addOverlayText(this.hintPlate, "", CONTENT_WIDTH - 4, 6.6, "Caption", LINGO_COLORS.ink, new vec3(0, 0, 1.2))
    this.hintPlate.enabled = false

    this.statusText = this.addHintPill(page, this.copy("talkThinking"), TALK_ICONS.bulb || null, 30)

    const talkRow = this.makeRow(page, "Talk Actions", 5.6, 0.8)
    const talk = this.addHeroButton(talkRow, lingoCopy(this.nativeLanguage, "holdToTalk"), MIC_ICON, 20, "home")
    talk.onTriggerDown.add(() => {
      if (this.busy || this.finished) {
        this.audio.playSoftReturn()
        return
      }
      this.talkHeld = true
      this._onVoiceHoldStart.invoke("TURN")
    })
    talk.onTriggerUp.add(() => {
      // Always release so the mic never stays open across a page change.
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    })
    this.addHeroButton(talkRow, lingoCopy(this.nativeLanguage, "listen"), VOLUME_ICON, 20, "primary", () => this._onListenRequested.invoke())

    const helpRow = this.makeRow(page, "Talk Help Actions", 4.6, 0.6)
    this.addActionButton(helpRow, this.copy("talkHint"), TALK_ICONS.chat || null, 13.6, "primary", () => {
      if (this.busy || this.finished) return
      this._onHintRequested.invoke()
    })
    const subtitles = this.addActionButton(helpRow, "", TALK_ICONS.cc || null, 13.6, "primary", () => {
      this.subtitlesOn = !this.subtitlesOn
      this.refreshSubtitles()
    })
    this.subtitleLabel = this.findLabel(subtitles)
    this.refreshSubtitles()
    const end = this.addActionButton(helpRow, this.copy("talkEnd"), TALK_ICONS.flag || null, 13.6, "neutral", () => {
      if (this.busy && !this.finished) return
      this._onEndRequested.invoke()
    })
    this.endLabel = this.findLabel(end)
    this.scheduleRenderOrderPass()
  }

  showOpening(role: string, goals: string[], goalIcons: (ObjectIconKey | null)[], line: TalkLine): void {
    this.busy = false
    this.goals = goals.slice()
    if (this.roleText && role) this.roleText.text = role
    for (let i = 0; i < this.goalRows.length; i++) {
      const icon = goalIcons[i] ? OBJECT_ICONS[goalIcons[i] as ObjectIconKey] : undefined
      if (icon) this.addTextureImage(this.goalRows[i].iconSlot, icon, 3.2, 3.2, "Goal Icon Art", vec3.zero())
    }
    this.setGoals([])
    this.showPartnerLine(line)
    this.setStatus(this.copy("talkHoldOrListen"))
    this.scheduleRenderOrderPass()
  }

  /** Written help: three replies, simplest first (the cloud also says the first). */
  showSuggestions(options: TalkLine[]): void {
    this.busy = false
    if (!this.hintPlate || !this.hintText || options.length === 0) return
    const lines = options.map((option) => {
      const sound = option.phonetic ? ` (${option.phonetic})` : ""
      return `• ${option.text}${sound} — ${option.translation}`
    })
    this.hintText.text = `${this.copy("talkSuggestTitle")}\n${lines.join("\n")}`
    this.boostDense(this.hintText, 1.15)
    this.hintPlate.enabled = true
    // The card was created hidden, so its cream style never ran: apply it now
    // (and once more after the plate's first frame) or it shows the dark default.
    const plate = this.hintPlate
    this.styleRoundedPlate(plate, CREAM, LILAC_BORDER, 2)
    afterComponentStart(this.host, () => this.styleRoundedPlate(plate, CREAM, LILAC_BORDER, 2))
    this.hintText.textFill.color = LINGO_COLORS.ink
    this.fx.popIn(this.hintPlate, {duration: 0.32, rotateDegrees: -3})
    this.setStatus(this.copy("talkHoldOrListen"))
    this.scheduleRenderOrderPass()
  }

  showLearnerLine(text: string): void {
    if (this.hintPlate) this.hintPlate.enabled = false
    if (this.learnerText) {
      this.learnerText.text = `${this.copy("talkYou")}: “${text}”`
      this.learnerText.textFill.color = LINGO_COLORS.purple
    }
    this.busy = true
    this.setStatus(this.copy("talkThinking"))
  }

  showReply(correction: TalkCorrection, goalsMet: number[], finished: boolean, line: TalkLine): void {
    this.busy = false
    if (this.learnerText) {
      this.learnerText.text = `${correction.ok ? "✓" : "↻"} ${this.learnerText.text}`
      this.learnerText.textFill.color = correction.ok ? OK_COLOR : FIX_COLOR
    }
    if (correction.ok) this.audio.playSaved()
    this.setGoals(goalsMet)
    this.showPartnerLine(line)
    if (finished) this.markFinished()
    else this.setStatus(this.copy("talkHoldOrListen"))
  }

  /** Busy wait for an AI call started outside a turn (hints, summary). */
  setBusy(message: string): void {
    this.busy = true
    this.setStatus(message)
  }

  /** Voice status line (listening partials, errors). A failed turn unlocks the page. */
  setStatus(message: string, unlock: boolean = false): void {
    if (unlock) this.busy = false
    if (this.statusText) this.statusText.text = message
  }

  /** Celebration card: bubbly title, glossy stars, praise (+XP), tip, and every
   * useful phrase with a speaker and its picture. */
  showSummary(summary: TalkSummary, onAnotherScene: () => void, onBack: () => void, onHearPhrase: (text: string) => void): void {
    this.generation += 1
    this.busy = false
    const page = this.newPage("Live Talk Summary")
    this.page = "SUMMARY"
    const top = this.makeRow(page, "Summary Header", 12, 0.2)
    this.addOverflowArt(top, LANGUAGE_CLOUDS[this.targetLanguage], 9.5, 12, 13, new vec3(0, 0.6, 0.6), "Summary Cloud")
    const titles = this.makeColumn(top, "Summary Titles", 22, 12)
    this.bubbly(this.addText(titles, this.copy("talkDone"), 22, 6.2, "Headline", TITLE_PURPLE), 60)
    const stars = this.makeRowW(titles, "Summary Stars", 22, 5.4, 0.2)
    for (let i = 0; i < 3; i++) this.addStar(stars, i < summary.stars, i, 6.6)
    this.addLandmark(top, 9.5, 12)

    const praiseHeight = summary.xp !== undefined ? 6 : 4.6
    const praise = this.addPlate(page, "Summary Praise", CONTENT_WIDTH - 6, praiseHeight, MINT_PLATE, new vec4(0.6, 0.92, 0.85, 1))
    this.addTextureImage(praise, STAR_TEXTURE, 6, 6, "Praise Star", new vec3(-(CONTENT_WIDTH - 6) / 2 + 3, 0, 1.2))
    const praiseY = summary.xp !== undefined ? 1.2 : 0
    this.addOverlayText(praise, summary.praise, CONTENT_WIDTH - 14, 2.8, "Body", OK_COLOR, new vec3(1.5, praiseY, 1.2))
    if (summary.xp !== undefined) {
      const xpIcon = TALK_ICONS.headphones || BOLT_ICON
      this.addTextureImage(praise, xpIcon, 2.2, 2.2, "Praise XP Icon", new vec3(-5.5, -1.5, 1.2))
      this.addOverlayText(praise, `+${summary.xp} ${lingoCopy(this.nativeLanguage, "audioXp")}`, 16, 2.4, "Subheadline", TITLE_PURPLE, new vec3(2.5, -1.5, 1.2))
    }
    if (summary.tip) {
      const tip = this.addPlate(page, "Summary Tip", CONTENT_WIDTH - 2, 5.2, PEACH_PLATE, new vec4(1, 0.82, 0.62, 1))
      if (TALK_ICONS.bulb) this.addTextureImage(tip, TALK_ICONS.bulb, 3.2, 3.2, "Tip Icon", new vec3(-(CONTENT_WIDTH - 2) / 2 + 2.8, 0, 1.2))
      this.addOverlayText(tip, summary.tip, CONTENT_WIDTH - 9, 4.4, "Caption", FIX_COLOR, new vec3(1.5, 0, 1.2))
    }

    // Phrase list: speaker · bubble (phrase + meaning) · picture.
    const rows = summary.phrases.slice(0, 5)
    if (rows.length > 0) {
      const rowHeight = 4.6
      const listHeight = rows.length * rowHeight + 1.4
      const list = this.addPlate(page, "Summary Phrases", CONTENT_WIDTH - 4, listHeight, LILAC_PLATE, LILAC_BORDER)
      const top0 = listHeight / 2 - 0.7
      for (let i = 0; i < rows.length; i++) {
        const phrase = rows[i]
        const y = top0 - rowHeight * i - rowHeight / 2
        const width = CONTENT_WIDTH - 4
        this.addSpeakerButton(list, new vec3(-width / 2 + 3.2, y, 1.3), 3.6, () => onHearPhrase(phrase.text))
        const bubble = this.makeObject(list, `Phrase Bubble ${i}`, new vec3(-1.6, y + 0.85, 1.1))
        this.roundedPlate(bubble, 24, 2.4, CREAM, CREAM, 1.2)
        const sound = phrase.phonetic ? `  (${phrase.phonetic})` : ""
        this.boostDense(this.addOverlayText(bubble, `${phrase.text}${sound}`, 23, 2.1, "Body", TITLE_PURPLE, new vec3(0, 0, 0.3), HorizontalAlignment.Left))
        this.addOverlayText(list, phrase.translation, 23, 1.8, "Caption", SOFT_INK, new vec3(-1.6, y - 1.3, 1.2), HorizontalAlignment.Left)
        const picture = phrase.icon ? OBJECT_ICONS[phrase.icon] : undefined
        if (picture) this.addTextureImage(list, picture, 3.6, 3.6, `Phrase Icon ${i}`, new vec3(width / 2 - 4, y, 1.2))
      }
    }
    const actions = this.makeRow(page, "Summary Actions", 5.6, 0.8)
    this.addHeroButton(actions, this.copy("talkNewScene"), REFRESH_ICON, 20, "primary", onAnotherScene)
    this.addBackButton(actions, 18, onBack)
    this.audio.playSaved()
    this.scheduleRenderOrderPass()
  }

  /** PRACTICA HABLAR: loading page while the lesson is written — a bubbly scene
   * title, a progress bar with a star racing toward the book. */
  beginDrill(scene: TalkScene, customPlace: string = ""): void {
    this.generation += 1
    this.busy = true
    this.drillScene = scene
    this.drillTitle = scene === "CUSTOM" && customPlace ? customPlace.toUpperCase() : this.sceneTitle(scene)
    const page = this.newPage("Speaking Drill Loading")
    this.page = "DRILL"
    const header = this.makeRow(page, "Drill Loading Header", 12, 0.4)
    this.addOverflowArt(header, LANGUAGE_CLOUDS[this.targetLanguage], 11, 12, 15, new vec3(0, 0.4, 0.6), "Drill Cloud")
    const middle = this.makeColumn(header, "Drill Loading Middle", 20, 12)
    this.bubbly(this.addText(middle, this.drillTitle, 20, 4, "Headline", TITLE_PURPLE), 58)
    if (TALK_ICONS.booksCloud) this.addImage(middle, TALK_ICONS.booksCloud, 11, 7, "Drill Books")
    this.addSceneArt(header, scene, 10, 12)
    this.statusText = this.addText(page, this.copy("drillPreparing"), CONTENT_WIDTH, 3, "Subheadline", TITLE_PURPLE)
    this.addLoadingBar(page)
    const back = this.makeRow(page, "Drill Loading Back", 5.6, 0.6)
    this.addBackButton(back, 24, () => this.showScenePicker())
    this.scheduleRenderOrderPass()
  }

  startDrill(plan: DrillPlan): void {
    this.busy = false
    this.drillItems = plan.items.slice()
    this.drillRole = plan.role || ""
    this.drillIndex = 0
    this.drillCorrect = 0
    this.drillXp = 0
    this.showDrillStep("SAY")
  }

  /** The whole line the learner should be saying right now. */
  drillTarget(): TalkLine | null {
    const item = this.drillItems[this.drillIndex]
    return item ? item.line : null
  }

  /** While the coach evaluates a spoken attempt, holds and taps wait. */
  setDrillBusy(): void {
    this.busy = true
    this.setStatus(this.copy("talkThinking"))
  }

  /** Spoken attempt judged: up to three tries, then the lesson always moves on.
   * Returns the XP earned: more on the first try, most for the memory round. */
  drillResult(correct: boolean): number {
    this.busy = false
    this.drillAttempts += 1
    let xp = 0
    if (correct) {
      this.audio.playSaved()
      if (this.drillPhase === "FINAL") this.drillCorrect += 1
      xp = this.drillPhase === "FINAL" ? 15 : this.drillAttempts === 1 ? 10 : 5
      this.drillXp += xp
      if (this.sentenceText) this.sentenceText.textFill.color = OK_COLOR
      this.setStatus(`✓ ${this.copy("talkPerfect")}  ·  +${xp} XP`)
    } else {
      const left = DRILL_ATTEMPTS - this.drillAttempts
      this.setStatus(left > 0 ? `↻ ${lingoCopy(this.nativeLanguage, "quizWrong")}  (${left})` : `↻ ${lingoCopy(this.nativeLanguage, "quizWrong")}`)
    }
    if (!correct && this.drillAttempts < DRILL_ATTEMPTS) return xp
    // Moving on waits for the coach's spoken feedback (continueDrill); meanwhile
    // the page is locked so a hold or SKIP can't cut the praise.
    this.drillAwaitingNext = true
    this.busy = true
    return xp
  }

  /** True after drillResult when this sentence is finished. */
  drillWaitingForNext(): boolean {
    return this.drillAwaitingNext
  }

  /** Called once the coach's voice has ended: next sentence (or the summary). */
  continueDrill(generation: number): void {
    if (generation !== this.generation || !this.drillAwaitingNext || !this.root.enabled) return
    this.drillAwaitingNext = false
    this.busy = false
    this.advanceDrill()
  }

  private advanceDrill(): void {
    const final = this.drillPhase === "FINAL"
    this.drillIndex += 1
    if (this.drillIndex < this.drillItems.length) {
      this.showDrillStep(final ? "FINAL" : "SAY")
      return
    }
    if (!final) {
      this.drillIndex = 0
      this.showDrillStep("FINAL")
      return
    }
    this._onDrillFinished.invoke({correct: this.drillCorrect, total: this.drillItems.length, xp: this.drillXp, items: this.drillItems})
  }

  /** One drill sentence, laid out like the mockup: scene header with progress,
   * what they say to you in a bubble, your sentence on a big cream card, the
   * hint pill (also the status line), ESCUCHAR / DECIRLA, then SKIP / BACK. */
  private showDrillStep(phase: DrillPhase): void {
    const item = this.drillItems[this.drillIndex]
    if (!item) return
    this.generation += 1
    this.busy = false
    this.drillPhase = phase
    this.drillAttempts = 0
    this.drillAwaitingNext = false
    const page = this.newPage(`Speaking Drill ${phase} ${this.drillIndex + 1}`)
    this.page = "DRILL"
    const total = this.drillItems.length
    const fromMemory = phase === "FINAL"

    // Header: cloud · (scene icon + bubbly title + role, sentence progress) · scene art.
    const header = this.makeRow(page, "Drill Header", 10, 0.4)
    this.addOverflowArt(header, LANGUAGE_CLOUDS[this.targetLanguage], 9, 10, 13, new vec3(0, 0.5, 0.6), "Drill Cloud")
    const titles = this.makeColumn(header, "Drill Titles", 22, 10)
    const titleRow = this.makeRowW(titles, "Drill Title Row", 22, 5.6, 0.7)
    const badge = this.addCircle(titleRow, 4.6, DOT_PURPLE, LINGO_COLORS.white, "")
    this.addTextureImage(badge, SCENE_ICONS[this.drillScene], 2.5, 2.5, "Scene Badge Icon", new vec3(0, 0, 0.3))
    const names = this.makeColumn(titleRow, "Drill Names", 16.7, 5.6)
    this.bubbly(this.addText(names, this.drillTitle, 16.7, 3.2, "Headline", TITLE_PURPLE, HorizontalAlignment.Left), 52)
    const subtitle = fromMemory ? this.copy("drillFinal") : this.drillRole
    if (subtitle) this.fitLabel(this.addText(names, subtitle, 16.7, 2.2, "Subheadline", LINGO_COLORS.lavender, HorizontalAlignment.Left)).size = 40
    const progress = this.makeRowW(titles, "Drill Progress", 22, 3.4, 0.6)
    this.fitLabel(this.addText(progress, `${this.copy("drillSentence")} ${this.drillIndex + 1} / ${total}`, 8, 2.4, "Caption", SOFT_INK, HorizontalAlignment.Right))
    this.addProgressDots(progress, total, this.drillIndex + 1, false, 13.4, 1.7, 0.8)
    this.addSceneArt(header, this.drillScene, 9.5, 10)

    // What they say to you: a speech bubble with its own speaker.
    if (item.cue.text) {
      const bubbleWidth = CONTENT_WIDTH - 6
      const bubble = this.addPlate(page, "Drill Cue Bubble", bubbleWidth, 5.8, LINGO_COLORS.white, LILAC_BORDER)
      this.addOverlayText(bubble, lingoCopy(this.nativeLanguage, "humanTheySay"), bubbleWidth - 8, 1.8, "Caption", SOFT_INK, new vec3(-2.6, 1.5, 1.2), HorizontalAlignment.Left).size = 32
      const cue = this.addOverlayText(bubble, item.cue.text, bubbleWidth - 8, 3, "Subheadline", LINGO_COLORS.ink, new vec3(-2.6, -0.8, 1.2), HorizontalAlignment.Left)
      this.boostDense(this.fitLabel(cue))
      this.addSpeakerButton(bubble, new vec3(bubbleWidth / 2 - 3, 0, 1.3), 3.6, () => this._onDrillSpeak.invoke({text: item.cue.text, kind: "cue"}))
      const cueSound = item.cue.phonetic ? `   (${item.cue.phonetic})` : ""
      this.boostDense(this.fitLabel(this.addText(page, `${item.cue.translation}${cueSound}`, CONTENT_WIDTH - 6, 2.2, "Caption", TRANSLATION_COLOR, HorizontalAlignment.Left)))
    }

    // The learner's whole sentence: big, bold, with a speaker beside it.
    const card = this.addPlate(page, "Drill Sentence", CONTENT_WIDTH, 9.4, CREAM, LILAC_BORDER)
    // FINAL hides the target text: the learner answers from memory, helped by the meaning.
    this.sentenceText = this.addOverlayText(card, fromMemory ? "· · ·" : item.line.text, CONTENT_WIDTH - 12, 4.4, "Headline", LINGO_COLORS.ink, new vec3(-2, 1.9, 1.2))
    this.sentenceText.size = 64
    this.boostDense(this.sentenceText)
    if (!fromMemory) this.addSpeakerButton(card, new vec3(CONTENT_WIDTH / 2 - 4.6, 1.9, 1.3), 4, () => this._onDrillSpeak.invoke({text: item.line.text, kind: "model"}))
    if (!fromMemory && item.line.phonetic) {
      this.boostDense(this.fitLabel(this.addOverlayText(card, item.line.phonetic, CONTENT_WIDTH - 6, 1.8, "Caption", LINGO_COLORS.purple, new vec3(0, -1.1, 1.2))))
    }
    this.boostDense(this.fitLabel(this.addOverlayText(card, item.line.translation, CONTENT_WIDTH - 6, 2.4, "Body", TRANSLATION_COLOR, new vec3(0, item.line.phonetic && !fromMemory ? -3.1 : -2.4, 1.2))))
    // What they scan becomes what they say: celebrate their own words in the line.
    if (item.known.length > 0 && !fromMemory) {
      this.boostDense(this.addText(page, `${this.copy("drillYourWords")} ${item.known.join(", ")}`, CONTENT_WIDTH, 2.2, "Caption", LINGO_COLORS.purple))
    }

    // Instruction pill, reused as the live status line (listening, ✓ +XP, try again).
    this.statusText = this.addHintPill(page, this.plainCopy(fromMemory ? "drillFinalStep" : "drillSayStep"), TALK_ICONS.bulb || null, CONTENT_WIDTH - 4)

    const actions = this.makeRow(page, "Drill Actions", 5.6, 1)
    const listenKind: "model" | "cue" = fromMemory ? "cue" : "model"
    const listenText = fromMemory ? item.cue.text : item.line.text
    this.addHeroButton(actions, lingoCopy(this.nativeLanguage, "listen"), VOLUME_ICON, 19.5, "primary", () => {
      if (listenText) this._onDrillSpeak.invoke({text: listenText, kind: listenKind})
    })
    const say = this.addHeroButton(actions, this.copy("drillSay"), MIC_ICON, 19.5, "home")
    say.onTriggerDown.add(() => {
      if (this.busy) {
        this.audio.playSoftReturn()
        return
      }
      this.talkHeld = true
      this._onVoiceHoldStart.invoke("SAY")
    })
    say.onTriggerUp.add(() => {
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    })
    const nav = this.makeRow(page, "Drill Nav", 4.4, 1.4)
    const skip = skipButton(nav, lingoCopy(this.nativeLanguage, "skip"))
    this.registerFlexItem(nav, skip.made.root, SKIP_WIDTH, skip.made.height * ART_FLOW, FlexAlignSelf.Center)
    fitRow(nav, skip.made.height * ART_FLOW)
    skip.made.button.onTriggerUp.add(() => {
      if (this.busy) return
      this.audio.playClick()
      this.advanceDrill()
    })
    this.addBackButton(nav, 22, () => this.showScenePicker())
    this.scheduleRenderOrderPass()

    // Hear it without asking: the model line to repeat, or the cue in the final round.
    const generation = this.generation
    this.after(0.45, generation, () => {
      if (listenText) this._onDrillSpeak.invoke({text: listenText, kind: listenKind})
    })
  }

  private after(seconds: number, generation: number, action: () => void): void {
    const delayed = this.host.createEvent("DelayedCallbackEvent")
    delayed.bind(() => {
      if (generation !== this.generation || !this.root.enabled) return
      action()
    })
    delayed.reset(seconds)
  }

  /** Placement test, step 1: "how much do you know?" — the learner's own estimate. */
  showPlacementIntro(): void {
    this.generation += 1
    this.busy = false
    const page = this.newPage("Level Intro")
    this.page = "LEVEL"
    // Header: the language cloud and the question in a fluffy cloud bubble.
    const intro = this.makeRow(page, "Level Intro Header", 11.5, 0.4)
    this.addOverflowArt(intro, LANGUAGE_CLOUDS[this.targetLanguage], 10, 11.5, 13, new vec3(0, 0.3, 0.6), "Level Cloud")
    const language = languageName(this.targetLanguage, this.nativeLanguage)
    const spoken = this.nativeLanguage === "German" || this.nativeLanguage === "English" ? language : language.toLowerCase()
    const bubbleWidth = 27
    const bubble = this.makeObject(intro, "Level Ask Bubble")
    this.registerFlexItem(intro, bubble, bubbleWidth, 11.5, FlexAlignSelf.Center)
    artImage(bubble, ART.bubbleCloud, bubbleWidth, new vec3(0, 0, 0.4), "Level Ask Bubble Art")
    this.statusText = artLabel(bubble, ART.bubbleCloud, bubbleWidth, this.plainCopy("levelAsk").replace("{language}", spoken).replace(/\s*✦\s*$/, ""), 46, TITLE_PURPLE, 0.3, 7)
    // "LEVEL TEST" on the starry pill.
    const pillWidth = 26
    const pill = this.makeObject(page, "Level Title Pill")
    this.registerFlexItem(page, pill, pillWidth, pillWidth * ART.pillStars.aspect, FlexAlignSelf.Center)
    artImage(pill, ART.pillStars, pillWidth, new vec3(0, 0, 0.4), "Level Title Pill Art")
    artLabel(pill, ART.pillStars, pillWidth, this.copy("levelTitle"), 38, TITLE_PURPLE)
    // One designed button per self-estimate (icon baked in each).
    const choices: {key: LingoCopyKey, level: SpeakingLevel, art: ArtPiece}[] = [
      {key: "levelNone", level: "A0", art: ART.levelA0},
      {key: "levelSome", level: "A1", art: ART.levelA1},
      {key: "levelGetBy", level: "A2", art: ART.levelA2},
      {key: "levelGood", level: "B1", art: ART.levelB1},
    ]
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i]
      const width = 30
      const made = this.addArtButton(page, choice.art, width, `Level Choice ${choice.level}`)
      this.softShadow(artLabel(made.root, choice.art, width, this.copy(choice.key), 46))
      made.button.onTriggerUp.add(() => {
        if (this.busy) return
        this.busy = true
        this.audio.playClick()
        this.setStatus(this.copy("talkThinking"))
        this._onPlacementSelfReport.invoke(choice.level)
      })
    }
    const back = this.makeRow(page, "Level Back Row", 5, 0.6)
    this.addBackButton(back, 19, () => {
      if (this.level) this.showScenePicker()
      else this._onBackRequested.invoke()
    })
    this.scheduleRenderOrderPass()
  }

  /** Placement test: one spoken question (adaptive), answered by holding ANSWER. */
  showPlacementQuestion(number: number, step: PlacementStep): void {
    this.generation += 1
    this.busy = false
    const page = this.newPage(`Level Question ${number}`)
    this.page = "LEVEL"
    const header = this.makeRow(page, "Level Question Header", 11, 0.2)
    this.addOverflowArt(header, LANGUAGE_CLOUDS[this.targetLanguage], 10, 11, 14, new vec3(0, 0.3, 0.6), "Level Cloud")
    const titles = this.makeColumn(header, "Level Question Titles", 23, 11)
    this.bubbly(this.addText(titles, this.copy("levelTitle"), 23, 3.6, "Headline", TITLE_PURPLE), 54)
    this.addProgressDots(titles, 5, number - 1, true, 23)
    if (step.instruction) {
      const note = this.makeObject(titles, "Level Instruction")
      this.registerFlexItem(titles, note, 23, 23 * ART.bubbleLilac.aspect, FlexAlignSelf.Center)
      artImage(note, ART.bubbleLilac, 23, new vec3(0, 0, 0.4), "Level Instruction Art")
      artLabel(note, ART.bubbleLilac, 23, step.instruction, 32, TITLE_PURPLE, 0.25, 3).font = LINGO_FONT_SEMIBOLD
    }
    this.addLandmark(header, 9, 11)

    // The question card (speaker baked in at ~20% of its width): line in big bold letters, meaning below.
    const width = CONTENT_WIDTH - 2
    const card = this.makeObject(page, "Level Question Card")
    const cardHeight = width * ART.questionCard.aspect
    this.registerFlexItem(page, card, width, cardHeight, FlexAlignSelf.Center)
    artImage(card, ART.questionCard, width, new vec3(0, 0, 0.4), "Level Question Card Art")
    const speaker = hitButton(card, cardHeight * 0.62, cardHeight * 0.62, "Level Question Speaker", new vec3(-width * 0.3, -cardHeight * 0.03, 0.8))
    speaker.onTriggerUp.add(() => {
      this.audio.playClick()
      this._onPlacementListen.invoke()
    })
    const textX = (ART.questionCard.labelCenter - 0.5) * width
    const textWidth = width * ART.questionCard.labelSpan
    const question = this.addOverlayText(card, step.question.text, textWidth, 4.4, "Headline", TITLE_PURPLE, new vec3(textX, 1.2, 1.2), HorizontalAlignment.Left)
    question.size = 50
    this.boostDense(question)
    const meaning = step.question.phonetic ? `${step.question.phonetic} · ${step.question.translation}` : step.question.translation
    this.fitLabel(this.addOverlayText(card, meaning, textWidth, 2.2, "Caption", SOFT_INK, new vec3(textX, -2.2, 1.2), HorizontalAlignment.Left))

    this.statusText = this.addHintPill(page, this.copy("levelHint"), MIC_ICON, 32, TITLE_PURPLE)
    const actions = this.makeRow(page, "Level Actions", 5.8, 0.8)
    this.addHeroButton(actions, lingoCopy(this.nativeLanguage, "listen"), VOLUME_ICON, 20, "primary", () => this._onPlacementListen.invoke())
    const answer = this.addHeroButton(actions, this.copy("levelAnswer"), MIC_ICON, 20, "home")
    answer.onTriggerDown.add(() => {
      if (this.busy) {
        this.audio.playSoftReturn()
        return
      }
      this.talkHeld = true
      this._onVoiceHoldStart.invoke("LEVEL")
    })
    answer.onTriggerUp.add(() => {
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    })
    const nav = this.makeRow(page, "Level Nav", 6, 0.6)
    const skipWidth = 19
    const skip = this.addArtButton(nav, ART.dontKnow, skipWidth, "Level Dont Know")
    artLabel(skip.root, ART.dontKnow, skipWidth, stripArrow(this.copy("levelDontKnow")), 42)
    skip.button.onTriggerUp.add(() => {
      if (this.busy) return
      this.busy = true
      this.audio.playClick()
      this.setStatus(this.copy("talkThinking"))
      this._onPlacementSkip.invoke()
    })
    this.scheduleRenderOrderPass()
  }

  /** Placement verdict: bubbly title, level pill with a star badge, the level
   * ladder, a warm message and CONTINUE. */
  showPlacementResult(level: SpeakingLevel, message: string): void {
    this.generation += 1
    this.busy = false
    this.level = level
    this.subtitlesOn = level === "A0" || level === "A1" || level === "A2"
    const page = this.newPage("Level Result")
    this.page = "LEVEL"
    const top = this.makeRow(page, "Level Result Header", 13, 0.2)
    this.addOverflowArt(top, LANGUAGE_CLOUDS[this.targetLanguage], 11, 13, 16, new vec3(0, 0.3, 0.6), "Level Result Cloud")
    const titles = this.makeColumn(top, "Level Result Titles", 22, 13)
    this.bubbly(this.addText(titles, this.copy("levelYour"), 22, 4, "Headline", TITLE_PURPLE), 64)
    const pill = this.addPlate(titles, "Level Pill", 22, 4.4, CREAM, LILAC_BORDER)
    const badge = this.makeObject(pill, "Level Badge", new vec3(-8.6, 0, 1.1))
    this.circlePlate(badge, 3.8, new vec4(0.8, 0.7, 1, 1), LINGO_COLORS.white)
    this.addTextureImage(badge, TALK_ICONS.starBadge || STAR_TEXTURE, TALK_ICONS.starBadge ? 3.6 : 6.4, TALK_ICONS.starBadge ? 3.6 : 6.4, "Level Badge Star", new vec3(0, 0, 0.3))
    this.fitLabel(this.addOverlayText(pill, `${level} · ${this.levelName(level)}`, 16, 3, "Subheadline", LINGO_COLORS.ink, new vec3(2.2, 0, 1.2)))
    this.addProgressDots(titles, 5, ["A0", "A1", "A2", "B1", "B2"].indexOf(level) + 1, false, 22)
    this.addLandmark(top, 9, 13)
    if (message) {
      const width = CONTENT_WIDTH - 4
      const plate = this.addPlate(page, "Level Result Message", width, 7.4, MINT_PLATE, new vec4(0.6, 0.92, 0.85, 1))
      if (TALK_ICONS.sprout) this.addTextureImage(plate, TALK_ICONS.sprout, 4.2, 4.2, "Level Sprout", new vec3(-width / 2 + 3.4, 0, 1.2))
      this.addOverlayText(plate, message, width - 9, 6.4, "Body", LINGO_COLORS.ink, new vec3(2, 0, 1.2))
    }
    const actions = this.makeRow(page, "Level Result Actions", 6, 0.8)
    this.addHeroButton(actions, this.copy("levelContinue"), null, 26, "primary", () => this.showScenePicker())
    this.audio.playSaved()
    this.scheduleRenderOrderPass()
  }

  private levelName(level: SpeakingLevel): string {
    const keys: Record<SpeakingLevel, LingoCopyKey> = {A0: "levelA0", A1: "levelA1", A2: "levelA2", B1: "levelB1", B2: "levelB2"}
    return this.copy(keys[level])
  }

  /** Gamified scoreboard: stars, score, streak, XP, counts and words to practice (with audio). */
  showGameResults(nativeLanguage: LanguageId, targetLanguage: LanguageId, results: GameResults, againLabel: string, onAgain: () => void, onBack: () => void, onHearWord: (word: string) => void): void {
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.root.enabled = true
    this.generation += 1
    this.busy = false
    const page = this.newPage("Game Results")
    this.page = "SUMMARY"
    this.fx.popIn(this.root, {rotateDegrees: -8})

    this.addText(page, results.title, CONTENT_WIDTH, 4, "Headline", LINGO_COLORS.purple)
    const hero = this.makeRow(page, "Results Hero", 10, 0.4)
    this.addImage(hero, LANGUAGE_CLOUDS[targetLanguage], 10, 10, "Results Cloud")
    for (let i = 0; i < 3; i++) this.addStar(hero, i < results.stars, i)
    if (results.note) this.addText(page, results.note, CONTENT_WIDTH, 2.2, "Caption", FIX_COLOR)

    // Score pill.
    const scoreRow = this.makeRow(page, "Results Score Row", 5.6, 0.6)
    const score = this.addPlate(scoreRow, "Results Score", 26, 5.6, CREAM, GOLD_EDGE)
    this.fitLabel(this.addOverlayText(score, this.copy("gameScore"), 10, 2.4, "Caption", LINGO_COLORS.ink, new vec3(-6.5, 0, 1.2), HorizontalAlignment.Right))
    this.addOverlayText(score, `${results.scorePercent}%`, 13, 4.6, "Headline", LINGO_COLORS.ink, new vec3(5.5, 0, 1.2), HorizontalAlignment.Left).size = 72

    // Streak + XP pills.
    const pills = this.makeRow(page, "Results Pills", 4.8, 1)
    const streak = this.addPlate(pills, "Results Streak", 20.5, 4.6, PEACH_PLATE, new vec4(1, 0.78, 0.55, 1))
    this.addTextureImage(streak, FLAME_ICON, 3.4, 3.4, "Streak Icon", new vec3(-8, 0, 1.2))
    this.fitLabel(this.addOverlayText(streak, this.copy("gameStreak"), 11, 2.2, "Caption", LINGO_COLORS.ink, new vec3(-0.4, 0, 1.2)))
    this.addOverlayText(streak, String(results.bestStreak), 4, 3.6, "Headline", FIX_COLOR, new vec3(7.8, 0, 1.2))
    const xp = this.addPlate(pills, "Results XP", 20.5, 4.6, LILAC_PLATE, LINGO_COLORS.lavender)
    this.addTextureImage(xp, BOLT_ICON, 3.4, 3.4, "XP Icon", new vec3(-8, 0, 1.2))
    this.addOverlayText(xp, `+${results.xp}`, 6, 3.4, "Subheadline", LINGO_COLORS.ink, new vec3(-3.4, 0, 1.2))
    this.fitLabel(this.addOverlayText(xp, lingoCopy(nativeLanguage, "audioXp"), 9, 2.2, "Caption", LINGO_COLORS.ink, new vec3(4.6, 0, 1.2)))

    // Words right | words to practice.
    const counts = this.addPlate(page, "Results Counts", CONTENT_WIDTH, 5.6, MINT_PLATE, LILAC_BORDER)
    this.addTextureImage(counts, CHECK_ICON, 3.2, 3.2, "Correct Icon", new vec3(-18, 0, 1.2))
    this.addOverlayText(counts, String(results.correct), 4, 4, "Headline", LINGO_COLORS.ink, new vec3(-13.6, 0, 1.2))
    this.fitLabel(this.addOverlayText(counts, this.copy("gameCorrect"), 8.5, 3.6, "Caption", LINGO_COLORS.ink, new vec3(-6.4, 0, 1.2), HorizontalAlignment.Left))
    this.addOverlayText(counts, "|", 1, 3.6, "Headline", LINGO_COLORS.lavender, new vec3(0, 0, 1.2))
    this.addTextureImage(counts, BOOK_ICON, 4.6, 4.6, "Practice Icon", new vec3(3.4, 0, 1.2))
    this.addOverlayText(counts, String(results.toPractice.length), 4, 4, "Headline", LINGO_COLORS.ink, new vec3(8, 0, 1.2))
    this.fitLabel(this.addOverlayText(counts, this.copy("gameToPractice"), 8.5, 3.6, "Caption", LINGO_COLORS.ink, new vec3(15.2, 0, 1.2), HorizontalAlignment.Left))

    // Words to practice, each with a speaker to hear it.
    const shown = results.toPractice.slice(0, 2)
    if (shown.length > 0) {
      const rowHeight = 4.6
      const cardHeight = 3 + shown.length * rowHeight
      const card = this.addPlate(page, "Results Practice", CONTENT_WIDTH, cardHeight, CREAM, LILAC_BORDER)
      const top = cardHeight / 2
      this.addOverlayText(card, `✦ ${this.copy("catcherPractice")}`, CONTENT_WIDTH - 4, 2.2, "Caption", LINGO_COLORS.purple, new vec3(0, top - 1.5, 1.2))
      for (let i = 0; i < shown.length; i++) {
        const line = shown[i]
        const y = top - 3 - rowHeight * i - rowHeight / 2
        const word = this.addOverlayText(card, line.text, 22, 2.6, "Subheadline", LINGO_COLORS.ink, new vec3(-5, y + 0.9, 1.2))
        this.boostDense(word)
        const detail = line.phonetic ? `(${line.phonetic})  ${line.translation}` : line.translation
        this.addOverlayText(card, detail, 26, 1.9, "Caption", TRANSLATION_COLOR, new vec3(-5, y - 1.2, 1.2))
        const speakerRoot = this.makeObject(card, `Hear ${line.text}`, new vec3(13, y, 1.3))
        const speaker = speakerRoot.createComponent(Button.getTypeName()) as Button
        speaker.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
        styleLingoButton(speaker, "card")
        this.marshmallow(speaker, 1.8)
        speaker.size = new vec3(5.4, 3.6, 1)
        speaker.onInitialized.add(() => speaker.size = new vec3(5.4, 3.6, 1))
        const icon = this.addTextureImage(speakerRoot, VOLUME_ICON, 1.8, 1.8, "Hear Icon", new vec3(0, 0, 1.35))
        ;(icon.getComponent("Component.Image") as Image).mainMaterial.mainPass.baseColor = LINGO_COLORS.purple
        speaker.onTriggerUp.add(() => {
          this.audio.playClick()
          onHearWord(line.text)
        })
      }
    }

    const actions = this.makeRow(page, "Results Actions", 4.6, 0.8)
    this.addActionButton(actions, againLabel, null, 19, "primary", onAgain)
    this.addBackButton(actions, 17, onBack)
    this.audio.playSaved()
    this.scheduleRenderOrderPass()
  }

  /** Big glossy star; unearned stars stay as a faint outline of themselves. */
  private addStar(parent: SceneObject, earned: boolean, index: number, slotSize: number = 8.6): void {
    const slot = this.makeObject(parent, `Results Star ${index}`)
    this.registerFlexItem(parent, slot, slotSize, slotSize, FlexAlignSelf.Center)
    // The star art has wide padding: draw it larger than its slot.
    const art = this.addTextureImage(slot, STAR_TEXTURE, slotSize * 2, slotSize * 2, "Star Art", new vec3(0, index === 1 ? slotSize * 0.09 : 0, 0.4))
    const image = art.getComponent("Component.Image") as Image
    if (!earned) image.mainMaterial.mainPass.baseColor = new vec4(0.85, 0.85, 0.95, 0.32)
    else this.fx.popIn(art, {delay: 0.25 + index * 0.2, rotateDegrees: 20})
  }

  /** Labels must fit in every language: shrink instead of wrapping out of the pill. */
  private fitLabel(text: Text): Text {
    text.horizontalOverflow = HorizontalOverflow.Shrink
    return text
  }

  /** Guards async AI results against a page the wearer already left. */
  currentGeneration(): number { return this.generation }

  private showPartnerLine(line: TalkLine): void {
    this.partnerLine = line
    if (!this.subtitlesOn) {
      this.refreshSubtitles()
      return
    }
    if (this.partnerText) {
      this.partnerText.text = line.text
      this.boostDense(this.partnerText)
    }
    if (this.partnerTranslation) {
      this.partnerTranslation.text = line.phonetic ? `${line.phonetic}\n${line.translation}` : line.translation
    }
  }

  /** SUBTITLES off: the partner is heard only (🔊); on: text + translation. */
  private refreshSubtitles(): void {
    if (this.subtitleLabel) this.subtitleLabel.text = `${this.subtitlesOn ? "◉" : "○"} ${this.copy("talkSubtitles")}`
    if (!this.partnerText || !this.partnerTranslation) return
    if (!this.subtitlesOn) {
      this.partnerText.text = "🔊 …"
      this.partnerTranslation.text = ""
      return
    }
    if (this.partnerLine) {
      const line = this.partnerLine
      this.partnerLine = null
      this.showPartnerLine(line)
    }
  }

  /** Mission pills: met goals fill their circle with a check; the header dots follow. */
  private setGoals(met: number[]): void {
    let done = 0
    for (let i = 0; i < this.goalRows.length; i++) {
      const row = this.goalRows[i]
      const goal = this.goals[i]
      const isMet = met.indexOf(i) >= 0
      if (isMet) done += 1
      row.label.text = goal || ""
      row.label.textFill.color = isMet ? OK_COLOR : TITLE_PURPLE
      row.check.text = isMet ? "✓" : ""
      this.styleRoundedPlate(row.circle, isMet ? OK_COLOR : LINGO_COLORS.white, isMet ? OK_COLOR : DOT_PURPLE, 1.15)
    }
    for (let i = 0; i < this.goalDots.length; i++) {
      this.styleRoundedPlate(this.goalDots[i], i < done ? DOT_PURPLE : LINGO_COLORS.white, DOT_PURPLE, 1.1)
    }
    if (this.goalProgress) this.goalProgress.text = `${done} / ${Math.max(1, this.goals.length)}`
  }

  private markFinished(): void {
    this.finished = true
    this.setGoals(this.goals.map((_goal, i) => i))
    if (this.endLabel) this.endLabel.text = this.copy("talkSummary")
    this.setStatus(this.copy("talkDone"))
  }

  private releaseHeldTalk(): void {
    if (!this.talkHeld) return
    this.talkHeld = false
    this._onVoiceHoldEnd.invoke()
  }

  private sceneTitle(scene: TalkScene): string {
    switch (scene) {
      case "CAFE": return this.copy("sceneCafe")
      case "AIRPORT": return this.copy("sceneAirport")
      case "FRIEND": return this.copy("sceneFriend")
      case "ROOM": return this.copy("sceneRoom")
      case "CUSTOM": return this.copy("sceneCustom")
    }
  }

  private sceneHint(scene: TalkScene): string {
    switch (scene) {
      case "CAFE": return this.copy("sceneCafeHint")
      case "AIRPORT": return this.copy("sceneAirportHint")
      case "FRIEND": return this.copy("sceneFriendHint")
      case "ROOM": return this.copy("sceneRoomHint")
      case "CUSTOM": return this.copy("sceneCustomHint")
    }
  }

  /** Scene card: gradient capsule · icon in a glass circle · bold title + hint ·
   * scene illustration on the right · chevron. */
  private addSceneButton(parent: SceneObject, scene: TalkScene): void {
    const width = CONTENT_WIDTH - 2
    const {root, button} = this.addArtButton(parent, SCENE_BUTTON_ART[scene], width, `Scene ${scene}`)
    // Text column between the baked icon circle (~17% of the width) and the illustration.
    const textWidth = width * 0.42
    const textX = -width / 2 + width * 0.195 + textWidth / 2
    const title = this.addOverlayText(root, this.sceneTitle(scene), textWidth, 3, "Headline", LINGO_COLORS.white, new vec3(textX, 1.2, 1.4), HorizontalAlignment.Left)
    title.size = 50
    this.softShadow(this.fitLabel(title))
    this.softShadow(this.fitLabel(this.addOverlayText(root, this.sceneHint(scene), textWidth, 2.2, "Caption", LINGO_COLORS.white, new vec3(textX, -1.35, 1.4), HorizontalAlignment.Left)))
    if (scene === "CUSTOM") {
      // YOUR PLACE is a hold-to-talk button: the wearer names the place aloud.
      button.onTriggerDown.add(() => {
        if (this.busy) return
        this.talkHeld = true
        this._onVoiceHoldStart.invoke("PLACE")
      })
      button.onTriggerUp.add(() => {
        this.talkHeld = false
        this._onVoiceHoldEnd.invoke()
      })
      return
    }
    button.onTriggerUp.add(() => {
      if (this.busy) return
      this.audio.playClick()
      this._onSceneChosen.invoke(scene)
    })
  }

  // ---------- Shared pieces of the redesigned screens ----------

  /** Shared-kit art button registered in this panel's flow. */
  private addArtButton(parent: SceneObject, art: ArtPiece, width: number, name: string): ArtButton {
    const made = artButton(parent, art, width, name)
    this.registerFlexItem(parent, made.root, width, made.height * ART_FLOW, FlexAlignSelf.Center)
    fitRow(parent, made.height * ART_FLOW)
    return made
  }

  /** VOLVER from the shared kit (arrow baked in). */
  private addBackButton(parent: SceneObject, width: number, onClick: () => void): void {
    const made = this.addArtButton(parent, ART.back, width, "Back")
    artLabel(made.root, ART.back, width, stripArrow(this.copy("back")), 40)
    made.button.onTriggerUp.add(() => {
      this.audio.playClick()
      onClick()
    })
  }

  /** "Your level: A0 • …" on the lilac bar, with the baked CHANGE pill as a button. */
  private addLevelBar(page: SceneObject, level: SpeakingLevel): void {
    const width = CONTENT_WIDTH - 2
    const artHeight = width * LEVEL_BAR_ART.aspect
    const bar = this.makeObject(page, "Level Bar")
    this.registerFlexItem(page, bar, width, artHeight * ART_FLOW, FlexAlignSelf.Center)
    artImage(bar, LEVEL_BAR_ART, width, new vec3(0, 0, 0.4), "Level Bar Art")
    const levelWidth = width * 0.56
    this.fitLabel(this.addOverlayText(bar, `${this.copy("levelYour")} ${level} • ${this.levelName(level)}`, levelWidth, 2.6, "Body", TITLE_PURPLE, new vec3(-width / 2 + width * 0.05 + levelWidth / 2, 0, 1.2), HorizontalAlignment.Left))
    // The pill spans ~63%–95% of the art; its refresh icon is baked at ~70%.
    const pillWidth = width * 0.32
    const pillX = width * 0.295
    const pill = this.makeObject(bar, "Level Change", new vec3(pillX, 0, 1))
    const button = pill.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Ghost"})
    button.size = new vec3(pillWidth, artHeight * 0.62, 1)
    button.onInitialized.add(() => {
      button.size = new vec3(pillWidth, artHeight * 0.62, 1)
      clearButtonVisual(button)
    })
    this.fitLabel(this.addOverlayText(pill, this.copy("levelChange"), pillWidth * 0.6, 2.4, "Body", TITLE_PURPLE, new vec3(pillWidth * 0.14, 0, 0.4)))
    button.onHoverEnter.add(() => pill.getTransform().setLocalScale(new vec3(1.05, 1.05, 1)))
    button.onHoverExit.add(() => pill.getTransform().setLocalScale(vec3.one()))
    button.onTriggerUp.add(() => {
      if (this.busy) return
      this.audio.playClick()
      this.showPlacementIntro()
    })
  }

  /** Readable white label on bright art. */
  private softShadow(text: Text): Text {
    text.dropshadowSettings.enabled = true
    text.dropshadowSettings.offset = new vec2(0.04, -0.08)
    text.dropshadowSettings.fill.color = new vec4(0.12, 0.05, 0.3, 0.45)
    return text
  }

  /** Bubbly title: deep violet, thick white outline, soft lilac shadow. */
  private bubbly(text: Text, size: number): Text {
    text.size = size
    text.font = LINGO_FONT_BOLD
    text.textFill.color = TITLE_PURPLE
    text.horizontalOverflow = HorizontalOverflow.Shrink
    text.outlineSettings.enabled = true
    text.outlineSettings.size = 0.22
    text.outlineSettings.fill.color = LINGO_COLORS.white
    text.dropshadowSettings.enabled = true
    text.dropshadowSettings.offset = new vec2(0.06, -0.12)
    text.dropshadowSettings.fill.color = new vec4(0.55, 0.42, 0.95, 0.55)
    return text
  }

  /** A row with an explicit width (makeRow always spans the content). */
  private makeRowW(parent: SceneObject, name: string, width: number, height: number, gap: number): SceneObject {
    const row = this.makeObject(parent, name)
    const flex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = width
    flex.height = height
    flex.direction = FlexDirection.Row
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.columnGap = gap
    this.registerFlexItem(parent, row, width, height, FlexAlignSelf.Center)
    return row
  }

  /** Rounded plate on an existing object (absolute layouts). */
  private roundedPlate(root: SceneObject, width: number, height: number, background: vec4, border: vec4, radius: number): void {
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(width, height)
    afterComponentStart(this.host, () => this.styleRoundedPlate(root, background, border, radius))
  }

  private circlePlate(root: SceneObject, size: number, background: vec4, border: vec4): void {
    this.roundedPlate(root, size, size, background, border, size / 2)
  }

  /** Flow shape (lines, pills). */
  private addShape(parent: SceneObject, name: string, width: number, height: number, background: vec4, border: vec4, radius: number): SceneObject {
    const root = this.makeObject(parent, name)
    this.roundedPlate(root, width, height, background, border, radius)
    this.registerFlexItem(parent, root, width, height, FlexAlignSelf.Center)
    return root
  }

  /** Flow circle, optionally with a centered label. */
  private addCircle(parent: SceneObject, size: number, background: vec4, border: vec4, label: string, labelColor: vec4 = LINGO_COLORS.white): SceneObject {
    const root = this.addShape(parent, "Circle", size, size, background, border, size / 2)
    if (label) this.addOverlayText(root, label, size, size * 0.8, "Body", labelColor, new vec3(0, 0, 0.3)).size = Math.round(size * 13)
    return root
  }

  /** Progress dots: done (filled), current (numbered or filled), upcoming (hollow), linked by lines; a finish flag at the end. */
  private addProgressDots(parent: SceneObject, total: number, done: number, numbered: boolean, width: number, dot: number = 2, line: number = 1.4): void {
    const row = this.makeRowW(parent, "Progress Dots", width, 3.4, 0)
    for (let i = 0; i < total; i++) {
      if (i > 0) this.addShape(row, "Progress Line", line, 0.28, LINGO_COLORS.lavender, LINGO_COLORS.lavender, 0.14)
      const current = numbered ? i === done : i === done - 1
      if (numbered && current) this.addCircle(row, dot * 1.6, DOT_PURPLE, LINGO_COLORS.white, String(i + 1))
      else this.addCircle(row, current ? dot * 1.3 : dot, i < done || current ? DOT_PURPLE : LINGO_COLORS.white, DOT_PURPLE, "")
    }
    if (numbered && TALK_ICONS.finishFlag) {
      const slot = this.makeObject(row, "Finish Flag")
      this.addTextureImage(slot, TALK_ICONS.finishFlag, 3.2, 3.2, "Finish Flag Art", new vec3(0.6, 0.3, 0.4))
      this.registerFlexItem(row, slot, 3.4, 3.4, FlexAlignSelf.Center)
    }
  }

  /** Hint line on the shared lilac pill (mic baked in); returns the text (used as status line). */
  private addHintPill(parent: SceneObject, value: string, _icon: Texture | null, width: number, color: vec4 = LINGO_COLORS.ink): Text {
    const root = this.makeObject(parent, "Hint Pill")
    this.registerFlexItem(parent, root, width, width * ART.hintPill.aspect, FlexAlignSelf.Center)
    artImage(root, ART.hintPill, width, new vec3(0, 0, 0.4), "Hint Pill Art")
    const text = artLabel(root, ART.hintPill, width, value, 34, color)
    text.font = LINGO_FONT_SEMIBOLD
    return text
  }

  /** Big action button from the shared kit: speaker art for LISTEN, mic art for
   * speaking, the back art for neutral, the ▶ art for everything else. */
  private addHeroButton(parent: SceneObject, label: string, icon: Texture | null, width: number, tone: LingoTone, onClick?: () => void): Button {
    const art = icon === VOLUME_ICON ? ART.listen : icon === MIC_ICON ? ART.speak : tone === "neutral" ? ART.back : ART.next
    const made = this.addArtButton(parent, art, width, label || "Hero Button")
    // Bigger buttons get bigger letters (CONTINUE on its wide button reads at a glance).
    artLabel(made.root, art, width, stripArrow(label), Math.round(Math.min(64, 30 + made.height * 3.6)))
    if (onClick) made.button.onTriggerUp.add(() => {
      this.audio.playClick()
      onClick()
    })
    return made.button
  }

  /** Shared speaker disc: hear this line. `size` is the disc diameter, centered on `position`. */
  private addSpeakerButton(parent: SceneObject, position: vec3, size: number, onClick: () => void): void {
    // The disc is ~74% of the art's width and sits right of its "loud" dashes.
    const width = size / 0.74
    const made = artButton(parent, ART.speaker, width, "Speaker Button", new vec3(position.x - width * 0.15, position.y, position.z))
    made.button.onTriggerUp.add(() => {
      this.audio.playClick()
      onClick()
    })
  }

  /** Artwork bigger than its flow slot (spills over neighbors, like a sticker). */
  private addOverflowArt(parent: SceneObject, texture: Texture, slotWidth: number, slotHeight: number, artSize: number, offset: vec3, name: string): void {
    const slot = this.makeObject(parent, name)
    this.registerFlexItem(parent, slot, slotWidth, slotHeight, FlexAlignSelf.Center)
    this.addTextureImage(slot, texture, artSize, artSize, `${name} Art`, offset)
  }

  /** The studied language's landmark (right side), once its art exists. */
  private addLandmark(parent: SceneObject, width: number, height: number): void {
    const art = LANDMARKS[this.targetLanguage]
    if (art) this.addFittedImage(parent, art, width, height, "Landmark")
  }

  /** Scene illustration; until a scene has its own art, the language's landmark stands in. */
  private addSceneArt(parent: SceneObject, scene: TalkScene, width: number, height: number): void {
    const art = SCENE_ART[scene] || LANDMARKS[this.targetLanguage]
    if (art) this.addFittedImage(parent, art, width, height, "Scene Art")
  }

  /** Image kept at its own proportions inside a width × height slot (no stretching). */
  private addFittedImage(parent: SceneObject, texture: Texture, width: number, height: number, name: string): void {
    const aspect = texture.getHeight() / Math.max(1, texture.getWidth())
    const drawWidth = Math.min(width, height / aspect)
    const slot = this.makeObject(parent, name)
    this.addTextureImage(slot, texture, drawWidth, drawWidth * aspect, `${name} Art`, new vec3(0, 0, 0.4))
    this.registerFlexItem(parent, slot, width, height, FlexAlignSelf.Center)
  }

  /** Lesson-loading bar: a violet fill eases forward, a star rides its tip, a book waits at the end. */
  private addLoadingBar(page: SceneObject): void {
    const width = 30
    const track = this.addPlate(page, "Loading Track", width, 3.4, new vec4(1, 1, 1, 0.9), LILAC_BORDER)
    const fill = this.makeObject(track, "Loading Fill", new vec3(-width / 2 + 1.2, 0, 0.6))
    this.roundedPlate(fill, 1, 1.8, DOT_PURPLE, DOT_PURPLE, 0.9)
    this.loadingFill = fill
    this.loadingStar = this.addTextureImage(track, STAR_TEXTURE, 6, 6, "Loading Star", new vec3(-width / 2 + 1.2, 0, 1.2))
    this.addTextureImage(track, BOOK_ICON, 3.4, 3.4, "Loading Book", new vec3(width / 2 - 2.2, 0, 1.2))
    this.loadingTime = 0
  }

  private tickLoading(): void {
    if (!this.loadingFill || isNull(this.loadingFill) || !this.root.enabled) return
    this.loadingTime += getDeltaTime()
    // Eases toward LOADING_CAP: it never claims to be done before the lesson is.
    const progress = LOADING_CAP * (1 - Math.exp(-this.loadingTime / 3.5))
    const span = 30 - 6.4
    const length = Math.max(1, span * progress)
    const left = -30 / 2 + 1.2
    this.loadingFill.getTransform().setLocalScale(new vec3(length, 1, 1))
    this.loadingFill.getTransform().setLocalPosition(new vec3(left + length / 2, 0, 0.6))
    if (this.loadingStar && !isNull(this.loadingStar)) {
      this.loadingStar.getTransform().setLocalPosition(new vec3(left + length, Math.sin(this.loadingTime * 4) * 0.2, 1.2))
    }
  }

  private copy(key: LingoCopyKey): string {
    return lingoCopy(this.nativeLanguage, key)
  }

  /** Copy without its leading emoji (the pill draws its own icon). */
  private plainCopy(key: LingoCopyKey): string {
    return this.copy(key).replace(/^(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2000-\u2BFF])\uFE0F?\s*/, "")
  }

  private boostDense(text: Text, factor: number = 1.3): void {
    const base = text.size
    if (hasDenseScript(text.text) && !(text as any).__lingoDense) {
      text.size = Math.round(base * factor)
      ;(text as any).__lingoDense = true
    }
  }

  private findLabel(button: Button): Text | null {
    const object = button.getSceneObject()
    for (let i = 0; i < object.getChildrenCount(); i++) {
      const text = object.getChild(i).getComponent("Component.Text") as Text | null
      if (text) return text
    }
    return null
  }

  private newPage(name: string): SceneObject {
    if (this.pageItem) {
      this.contentFlex.removeItems([this.pageItem])
      this.pageItem = null
    }
    if (this.pageRoot) {
      deferDestroy(this.host, this.pageRoot)
      this.pageRoot = null
    }
    this.releaseHeldTalk()
    this.roleText = null
    this.goalTexts = []
    this.partnerText = null
    this.partnerTranslation = null
    this.learnerText = null
    this.subtitleLabel = null
    this.sentenceText = null
    this.hintPlate = null
    this.hintText = null
    this.goalRows = []
    this.goalProgress = null
    this.goalDots = []
    this.loadingFill = null
    this.loadingStar = null
    this.statusText = null
    this.endLabel = null
    const page = this.makeObject(this.contentFlex.sceneObject, name)
    const pageFlex = page.createComponent(FlexLayout.getTypeName()) as FlexLayout
    pageFlex.autoDiscoverItemsOnStart = false
    pageFlex.width = CONTENT_WIDTH
    pageFlex.height = -1
    pageFlex.direction = FlexDirection.Column
    pageFlex.alignItems = FlexAlign.Stretch
    pageFlex.justifyContent = FlexJustify.Start
    pageFlex.rowGap = 0.9
    const item = page.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = CONTENT_WIDTH
    item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Stretch
    this.contentFlex.addItems([item])
    this.pageItem = item
    this.pageRoot = page
    this.fx.popIn(page, {rotateDegrees: -5, duration: 0.34})
    return page
  }

  private makeRow(parent: SceneObject, name: string, height: number, gap: number): SceneObject {
    const row = this.makeObject(parent, name)
    const flex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = CONTENT_WIDTH
    flex.height = height
    flex.direction = FlexDirection.Row
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.columnGap = gap
    this.registerFlexItem(parent, row, CONTENT_WIDTH, height, FlexAlignSelf.Center)
    return row
  }

  private makeColumn(parent: SceneObject, name: string, width: number, height: number): SceneObject {
    const column = this.makeObject(parent, name)
    const flex = column.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = width
    flex.height = height
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Center
    flex.rowGap = 0.2
    this.registerFlexItem(parent, column, width, height, FlexAlignSelf.Center)
    return column
  }

  /** Rounded cream card registered in the flow; children are placed absolutely. */
  private addPlate(parent: SceneObject, name: string, width: number, height: number, background: vec4, border: vec4): SceneObject {
    const root = this.makeObject(parent, name)
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(width, height)
    afterComponentStart(this.host, () => this.styleRoundedPlate(root, background, border, 2))
    this.registerFlexItem(parent, root, width, height, FlexAlignSelf.Center)
    return root
  }

  private addBubble(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, background: vec4): Text {
    const plate = this.addPlate(parent, "Talk Bubble", width, height, background, LILAC_BORDER)
    return this.addOverlayText(plate, value, width - 1.6, height - 0.8, role, color, new vec3(0, 0, 1.2))
  }

  private styleRoundedPlate(root: SceneObject, background: vec4, border: vec4, cornerRadius: number): void {
    if (!root || isNull(root)) return
    const rounded = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (!rounded) return
    rounded.gradient = false
    rounded.backgroundColor = background
    rounded.cornerRadius = cornerRadius
    rounded.border = true
    rounded.borderSize = 0.07
    rounded.borderColor = border
  }

  private marshmallow(button: Button, radius: number): void {
    button.onInitialized.add(() => {
      const visual = button.visual as RoundedRectangleVisual
      if (visual instanceof RoundedRectangleVisual) visual.cornerRadius = radius
    })
  }

  private addActionButton(parent: SceneObject, label: string, icon: Texture | null, width: number, tone: LingoTone, onClick?: () => void): Button {
    const root = this.makeObject(parent, label)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, tone)
    this.marshmallow(button, 2.05)
    button.size = new vec3(width, 4.1, 1)
    button.onInitialized.add(() => button.size = new vec3(width, 4.1, 1))
    if (icon) this.addTextureImage(root, icon, 1.35, 1.35, `${label} Icon`, new vec3(-width * 0.5 + 1.35, 0, 1.35))
    this.addOverlayText(root, label, width - (icon ? 3.4 : 1.2), 2.7, "Caption", LINGO_COLORS.white, new vec3(icon ? 0.65 : 0, 0, 1.35))
    this.registerFlexItem(parent, root, width, 4.1, FlexAlignSelf.Center)
    if (onClick) button.onTriggerUp.add(() => {
      this.audio.playClick()
      onClick()
    })
    return button
  }

  private addImage(parent: SceneObject, texture: Texture, width: number, height: number, name: string): void {
    const slot = this.makeObject(parent, name)
    this.addTextureImage(slot, texture, width, height, `${name} Art`, new vec3(0, 0, 0.4))
    this.registerFlexItem(parent, slot, width, height, FlexAlignSelf.Center)
  }

  private addTextureImage(parent: SceneObject, texture: Texture, width: number, height: number, name: string, position: vec3): SceneObject {
    const root = this.makeObject(parent, name, position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    root.getTransform().setLocalScale(new vec3(width, height, 1))
    return root
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
    const root = this.makeObject(parent, `Text ${role}`)
    const text = this.addOverlayText(root, value, width, height, role, color, vec3.zero(), alignment)
    this.registerFlexItem(parent, root, width, height, FlexAlignSelf.Stretch)
    return text
  }

  private addOverlayText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, position: vec3, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
    const root = position.equal(vec3.zero()) ? parent : this.makeObject(parent, `Overlay ${role}`, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = ROLE_FONT[role]
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

  private scheduleRenderOrderPass(): void {
    const delays = [0.3, 1.2]
    for (let i = 0; i < delays.length; i++) {
      const delayed = this.host.createEvent("DelayedCallbackEvent")
      delayed.bind(() => {
        if (isNull(this.root)) return
        this.applyRenderOrders(this.root, false)
      })
      delayed.reset(delays[i])
    }
  }

  private applyRenderOrders(object: SceneObject, insideButton: boolean): void {
    const isButton = insideButton || !!object.getComponent(Button.getTypeName())
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      const typeName = visual.getTypeName()
      if (isButton) {
        if (typeName === "Component.Text") visual.setRenderOrder(RENDER_ORDER.buttonText)
        else if (typeName === "Component.Image") visual.setRenderOrder(RENDER_ORDER.buttonIcon)
        else visual.setRenderOrder(RENDER_ORDER.buttonMesh)
        continue
      }
      if (object === this.backgroundRoot) visual.setRenderOrder(RENDER_ORDER.background)
      else if (typeName === "Component.Text") visual.setRenderOrder(RENDER_ORDER.text)
      else if (typeName === "Component.Image") visual.setRenderOrder(RENDER_ORDER.image)
      else visual.setRenderOrder(RENDER_ORDER.plate)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) this.applyRenderOrders(object.getChild(i), isButton)
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
