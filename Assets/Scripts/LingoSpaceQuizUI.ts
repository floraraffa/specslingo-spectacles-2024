/** Two-phase vocabulary quiz: picture recognition, then guided pronunciation practice. */
import {FlexLayout515 as FlexLayout} from "./compat515/FlexLayout515"
import {FlexItem515 as FlexItem} from "./compat515/FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./compat515/FlexTypes515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {Button515 as Button} from "./compat515/Button515"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {getWordPhonetic, hasDenseScript, LanguageId, usesNonLatinScript, VocabularyCard} from "./LingoSpaceData"
import {languageName, lingoCopy, LingoCopyKey} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"

type TextRole = "Headline" | "Subheadline" | "Body" | "Caption"
type QuizPhase = "A" | "B" | "C"
type AnswerView = {root: SceneObject, button: Button, label: Text, word: string}

const IMAGE_MATERIAL = IMAGE_MATERIAL_ASSET
const MIC_ICON = requireAsset("../Icons/mic.png") as Texture
const VOLUME_ICON = requireAsset("../Icons/volume_up.png") as Texture
const CARD_FRAME_TEXTURE = requireAsset("../BoardDesign/card central.png") as Texture
const BACKGROUND_TEXTURE = requireAsset("../ScreenDesign/background.png") as Texture
const CLOUD_MESSAGE_TEXTURE = requireAsset("../BoardDesign/cloud-messages-b.png") as Texture

// Explicit draw order: on device the panel background otherwise wins the depth
// fight against its own texts. Background first, plates, images, texts, buttons.
const QUIZ_RENDER_ORDER = {background: 6, plate: 8, image: 11, artwork: 12, text: 14, buttonMesh: 16, buttonIcon: 17, buttonText: 18}

const TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Headline: {size: 54, weight: 800},
  Subheadline: {size: 46, weight: 800},
  Body: {size: 41, weight: 700},
  Caption: {size: 37, weight: 700},
}

// Dark tones stay legible over the cream plate; mirrors the board voice coach.
const QUIZ_CORRECT_COLOR = new vec4(0.08, 0.56, 0.4, 1)
const QUIZ_RETRY_COLOR = new vec4(0.82, 0.34, 0.12, 1)
const XP_COLOR = new vec4(0.05, 0.48, 0.43, 1)

const CONTENT_WIDTH = 42
const TRANSITION_OUT_SECONDS = 0.35
const TRANSITION_IN_SECONDS = 0.35
const TRANSITION_SCALE_DIP = 0.15
const TRANSITION_Y_ROTATION = 0.16

export type QuizCard = {card: VocabularyCard, texture: Texture | null, phonetic: string}

export class LingoSpaceQuizUI {
  private root: SceneObject
  private contentFlex!: FlexLayout
  private languageText!: Text
  private progressText!: Text
  private xpText!: Text
  private menuActionContent!: Text
  private skipActionContent!: Text
  private menuItem: FlexItem | null = null
  private pageRoot: SceneObject | null = null
  private pageItem: FlexItem | null = null
  private backgroundRoot!: SceneObject
  private cloudRoot!: SceneObject
  private cloudText!: Text
  private fx: LingoFX
  private artworkMaterial: Material | null = null
  private artworkImageRoot: SceneObject | null = null
  private artworkPendingRoot: SceneObject | null = null
  private answerViews: AnswerView[] = []
  private correctAnswerView: AnswerView | null = null
  private phraseLineText: Text | null = null
  private puzzleExpected: string[] = []
  private puzzleProgress = 0

  private cards: QuizCard[] = []
  private distractorPool: string[] = []
  private index = 0
  private phase: QuizPhase = "A"
  private nativeLanguage: LanguageId = "English"
  private targetLanguage: LanguageId = "Spanish"
  private answerLocked = false
  private advancing = false
  private talkHeld = false
  private generation = 0

  private tweenPhase: "idle" | "out" | "in" = "idle"
  private tweenTime = 0
  private tweenAction: (() => void) | null = null

  private _onListenRequested = new Event<void>()
  private _onVoiceHoldStart = new Event<void>()
  private _onVoiceHoldEnd = new Event<void>()
  private _onAnswerResult = new Event<boolean>()
  private _onWordCompleted = new Event<number>()
  private _onRoundCompleted = new Event<void>()
  private _onReturnToMenu = new Event<void>()
  private _onLanguagePickRequested = new Event<void>()
  private _onPhraseSolved = new Event<number>()

  get onListenRequested(): PublicApi<void> { return this._onListenRequested.publicApi() }
  get onVoiceHoldStart(): PublicApi<void> { return this._onVoiceHoldStart.publicApi() }
  get onVoiceHoldEnd(): PublicApi<void> { return this._onVoiceHoldEnd.publicApi() }
  get onAnswerResult(): PublicApi<boolean> { return this._onAnswerResult.publicApi() }
  get onWordCompleted(): PublicApi<number> { return this._onWordCompleted.publicApi() }
  get onRoundCompleted(): PublicApi<void> { return this._onRoundCompleted.publicApi() }
  get onReturnToMenu(): PublicApi<void> { return this._onReturnToMenu.publicApi() }
  get onLanguagePickRequested(): PublicApi<void> { return this._onLanguagePickRequested.publicApi() }
  get onPhraseSolved(): PublicApi<number> { return this._onPhraseSolved.publicApi() }

  constructor(owner: SceneObject, private host: BaseScriptComponent, private audio: LingoSpaceAudioController) {
    // Owner is the head-locked panel root; +8 keeps the tall quiz centered in
    // the Spectacles FOV (~±40) and clear of the MOVE/FOLLOW handles at +33.
    this.root = this.makeObject(owner, "Spatial Quiz HUD", new vec3(0, 8, 2))
    this.fx = new LingoFX(host)
    // The starry-cloud illustration IS the panel: opaque, so quiz text never
    // fights the passthrough camera for contrast the way the old plate did.
    this.backgroundRoot = this.addTextureImage(this.root, BACKGROUND_TEXTURE, 50, 62, "Quiz Background", new vec3(0, 0, 0.2))

    const content = this.makeObject(this.root, "Spatial Quiz HUD Content", new vec3(0, 0, 1.3))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.contentFlex = flex
    flex.autoDiscoverItemsOnStart = false
    flex.width = 44
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.justifyContent = FlexJustify.Center
    // Rows need head-room for wrapped lines: text can wrap beyond its rect,
    // and tight rows made neighboring rows overlap visually.
    flex.rowGap = 0.32
    flex.paddingTop = 1.4
    flex.paddingBottom = 1.6
    flex.paddingLeft = 0.8
    flex.paddingRight = 0.8
    flex.onLayoutComplete.add((result) => {
      // Fit the illustrated frame around the content (rounded corners + cloud
      // band need breathing room) and park Cloudy just under the panel.
      this.backgroundRoot.getTransform().setLocalScale(new vec3(result.containerWidth + 5.5, result.containerHeight + 5, 1))
      this.cloudRoot.getTransform().setLocalPosition(new vec3(0, -(result.containerHeight / 2 + 8), 2))
    })
    this.buildCloudCoach()

    this.languageText = this.addText(content, "SPANISH → FRENCH", CONTENT_WIDTH, 1.5, "Caption", LINGO_COLORS.ink)
    // The language pair label doubles as the switcher: tap it to change target.
    const languageZone = this.languageText.getSceneObject()
    const languageCollider = languageZone.createComponent("Physics.ColliderComponent") as ColliderComponent
    const languageShape = Shape.createBoxShape()
    languageShape.size = new vec3(24, 2.8, 0.6)
    languageCollider.shape = languageShape
    const languageInteractable = languageZone.createComponent(Interactable.getTypeName()) as Interactable
    languageInteractable.onTriggerEnd.add(() => this._onLanguagePickRequested.invoke())
    this.progressText = this.addText(content, "1 / 4    ○ ○ ○ ○", CONTENT_WIDTH, 1.8, "Body", LINGO_COLORS.ink)
    this.xpText = this.addText(content, "★ AUDIO 0  •  TEXT 0  •  TOTAL XP 0", CONTENT_WIDTH, 2.4, "Body", XP_COLOR)
    this.newPage("Quiz Page")
    this.addBottomActions(content)
    this.host.createEvent("UpdateEvent").bind(() => this.updateTween())
    this.hide()
  }

  show(): void {
    this.root.enabled = true
  }

  /** Cloudy sits under the panel and voices every quiz message from its bubble. */
  private buildCloudCoach(): void {
    this.cloudRoot = this.makeObject(this.root, "Quiz Cloudy Coach", new vec3(0, -36, 2))
    this.addTextureImage(this.cloudRoot, CLOUD_MESSAGE_TEXTURE, 39, 12.37, "Cloudy Coach Artwork", new vec3(0, 0, 0.1))
    this.cloudText = this.addOverlayText(this.cloudRoot, "", 18.5, 7.3, "Body", LINGO_COLORS.ink, new vec3(8.65, -0.1, 1.2))
  }

  private cloudSay(message: string, color: vec4 = LINGO_COLORS.ink, pop: boolean = true): void {
    if (!this.cloudText || isNull(this.cloudRoot)) return
    this.cloudText.text = message
    this.cloudText.textFill.color = color
    if (pop) this.fx.popIn(this.cloudRoot, {duration: 0.34, rotateDegrees: -4})
  }

  hide(): void {
    // A held talk button never gets its release once the panel goes away:
    // finish the voice session first so the mic is not left open.
    if (this.talkHeld) {
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    }
    this.root.enabled = false
    this.generation += 1
    this.tweenPhase = "idle"
    this.tweenAction = null
  }

  startRound(cards: QuizCard[], distractorPool: string[], nativeLanguage: LanguageId, targetLanguage: LanguageId): void {
    this.cards = cards.slice()
    this.distractorPool = distractorPool.slice()
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.index = 0
    this.generation += 1
    this.tweenPhase = "idle"
    this.tweenAction = null
    const transform = this.root.getTransform()
    transform.setLocalScale(vec3.one())
    transform.setLocalRotation(quat.quatIdentity())
    this.languageText.text = `${languageName(nativeLanguage, nativeLanguage)} → ${languageName(targetLanguage, nativeLanguage)}`
    this.menuActionContent.text = lingoCopy(nativeLanguage, "back")
    this.skipActionContent.text = `${lingoCopy(nativeLanguage, "skip")} ▸`
    this.setXp(0, 0)
    this.show()
    this.buildPhaseA()
  }

  /** Practice launched from a live scan replaces MENU with a BACK label. */
  setMenuLabel(label: string): void {
    this.menuActionContent.text = label
  }

  setCardTexture(index: number, texture: Texture): void {
    if (index < 0 || index >= this.cards.length || !texture) return
    this.cards[index].texture = texture
    if (index !== this.index || !this.artworkMaterial) return
    if (!this.artworkImageRoot || isNull(this.artworkImageRoot)) return
    this.artworkMaterial.mainPass.baseTex = texture
    this.artworkMaterial.mainPass.baseColor = new vec4(1, 1, 1, 1)
    this.artworkImageRoot.enabled = true
    if (this.artworkPendingRoot && !isNull(this.artworkPendingRoot)) this.artworkPendingRoot.destroy()
    this.artworkPendingRoot = null
  }

  currentCard(): QuizCard | null {
    return this.cards[this.index] || null
  }

  notifyPronunciationResult(correct: boolean, message: string): void {
    if (this.phase !== "B") return
    if (!correct) {
      this.cloudSay(message, QUIZ_RETRY_COLOR)
      return
    }
    if (this.advancing) return
    this.advancing = true
    this.cloudSay(message || this.copy("quizNext"), QUIZ_CORRECT_COLOR)
    this.audio.playSaved()
    this.afterGuarded(1, () => {
      // Scanned cards carry a situational phrase: a well-pronounced word
      // graduates into ordering that phrase before moving on.
      const entry = this.cards[this.index]
      const tokens = entry && entry.card.phrase ? entry.card.phrase.split(/\s+/).filter((token) => token.length > 0) : []
      if (tokens.length >= 3 && tokens.length <= 9) this.beginTransition(() => this.buildPhaseC(tokens))
      else this.advanceWord()
    })
  }

  private advanceWord(): void {
    const completed = this.index
    this._onWordCompleted.invoke(completed)
    if (completed + 1 >= this.cards.length) {
      this._onRoundCompleted.invoke()
      return
    }
    this.index = completed + 1
    this.beginTransition(() => this.buildPhaseA())
  }

  showVoiceStatus(message: string): void {
    this.cloudSay(message, LINGO_COLORS.ink, false)
  }

  setXp(audioXp: number, textXp: number, earned: string = ""): void {
    this.xpText.text = `★ ${lingoCopy(this.nativeLanguage, "audioXp")} ${audioXp}  •  ${lingoCopy(this.nativeLanguage, "textXp")} ${textXp}  •  ${lingoCopy(this.nativeLanguage, "totalXp")} ${audioXp + textXp}${earned ? `  ${earned}` : ""}`
    this.xpText.textFill.color = earned ? new vec4(0.04, 0.5, 0.28, 1) : XP_COLOR
  }

  /** The quiz keys live in the shared copy table; the union type predates them. */
  private copy(key: string): string {
    return lingoCopy(this.nativeLanguage, key as LingoCopyKey)
  }

  private buildPhaseA(): void {
    this.phase = "A"
    this.answerLocked = false
    this.advancing = false
    const entry = this.cards[this.index]
    const page = this.newPage(`Quiz Recognition ${this.index + 1}`)
    this.refreshProgress()
    if (!entry) return
    this.addText(page, this.copy("quizQuestion"), CONTENT_WIDTH, 2.8, "Subheadline", LINGO_COLORS.purple)
    // The picture is the question: give it the biggest card the layout affords.
    this.buildCardShell(page, 15.6, 19.5, 11.2, new vec3(0, 1.1, 0.5))
    const options = this.buildOptions(entry)
    // Symbol scripts (Japanese) are unreadable for beginners: every option
    // carries its romanized pronunciation right under the traditional writing.
    // All four or none: a lone unromanized option would give the answer away.
    const showPhonetics = usesNonLatinScript(this.targetLanguage) && options.every((option) => !!this.phoneticFor(option))
    const topRow = this.makeActionRow(page, "Answer Row Top", 4.6)
    const bottomRow = this.makeActionRow(page, "Answer Row Bottom", 4.6)
    for (let i = 0; i < options.length; i++) {
      const view = this.addAnswerButton(i < 2 ? topRow : bottomRow, options[i], 20, showPhonetics ? this.phoneticFor(options[i]) : "")
      this.answerViews.push(view)
      if (options[i] === entry.card.word) this.correctAnswerView = view
    }
    this.cloudSay(this.copy("quizQuestion"))
    this.scheduleRenderOrderPass()
  }

  private buildPhaseB(): void {
    this.phase = "B"
    this.advancing = false
    const entry = this.cards[this.index]
    const page = this.newPage(`Quiz Pronunciation ${this.index + 1}`)
    this.refreshProgress()
    if (!entry) return
    this.buildCardShell(page, 11.4, 14.3, 7.6, new vec3(0, 0.8, 0.5))
    this.boostDenseText(this.addText(page, entry.card.word, CONTENT_WIDTH, 3.2, "Headline", LINGO_COLORS.ink))
    this.addText(page, entry.phonetic ? `${this.copy("quizPhonetic")}  ${entry.phonetic}` : "", CONTENT_WIDTH, 2.2, "Caption", LINGO_COLORS.purple)

    const actions = this.makeActionRow(page, "Pronunciation Actions", 4.4)
    this.addActionButton(actions, this.copy("quizListen"), VOLUME_ICON, 18.5, "primary", () => this._onListenRequested.invoke())
    const talk = this.addActionButton(actions, lingoCopy(this.nativeLanguage, "holdToTalk"), MIC_ICON, 22.5, "home")
    talk.onTriggerDown.add(() => {
      if (this.advancing || this.tweenPhase !== "idle") return
      this.talkHeld = true
      this._onVoiceHoldStart.invoke()
    })
    talk.onTriggerUp.add(() => {
      // Always release: finishVoicePractice self-guards, and a swallowed
      // release would leave the mic transcribing across the transition.
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    })

    this.cloudSay(this.copy("quizRepeat"))
    this.scheduleRenderOrderPass()
    // Let learners hear the word once without asking; the delay clears the pop-in tween.
    this.afterGuarded(0.45, () => this._onListenRequested.invoke())
  }

  /** Phase C: rebuild the example phrase by tapping its shuffled word chips in order. */
  private buildPhaseC(tokens: string[]): void {
    this.phase = "C"
    this.advancing = false
    const entry = this.cards[this.index]
    const page = this.newPage(`Quiz Phrase ${this.index + 1}`)
    this.refreshProgress()
    if (!entry) return
    this.addText(page, this.copy("orderPhrase"), CONTENT_WIDTH, 2.6, "Subheadline", LINGO_COLORS.purple)
    this.buildCardShell(page, 10.4, 13.1, 7.6, new vec3(0, 0.8, 0.5))
    this.phraseLineText = this.addText(page, "· · ·", CONTENT_WIDTH, 3, "Body", LINGO_COLORS.ink)
    // The assembled phrase fills with CJK tokens later: size up front.
    if (hasDenseScript(entry.card.phrase || "")) this.phraseLineText.size = Math.round(this.phraseLineText.size * 1.35)
    if (entry.card.phraseTranslation) this.addText(page, entry.card.phraseTranslation, CONTENT_WIDTH, 2.2, "Caption", XP_COLOR)
    // Symbol scripts also show how the whole phrase SOUNDS, when a scan provided it.
    if (usesNonLatinScript(this.targetLanguage) && entry.card.phrasePhonetic) {
      this.addText(page, entry.card.phrasePhonetic, CONTENT_WIDTH, 2, "Caption", LINGO_COLORS.purple)
    }
    this.puzzleExpected = tokens
    this.puzzleProgress = 0
    const shuffled = this.seededShuffle(tokens, this.index * 13 + 5)
    const perRow = Math.ceil(shuffled.length / 2)
    // Longer AI phrases put up to 5 chips per row: cap width so the row fits the panel.
    // CJK glyphs are ~double the width of a Latin letter per character.
    const charWidth = hasDenseScript(entry.card.phrase || "") ? 1.5 : 0.72
    const rowFit = (CONTENT_WIDTH - (perRow - 1) * 0.6 - 1) / perRow
    const chipWidth = Math.min(12.5, rowFit, Math.max(5, Math.max(...tokens.map((token) => token.length)) * charWidth + 2.6))
    const topRow = this.makeActionRow(page, "Phrase Chips Top", 4.6)
    const bottomRow = shuffled.length > perRow ? this.makeActionRow(page, "Phrase Chips Bottom", 4.6) : null
    for (let i = 0; i < shuffled.length; i++) {
      const parent = i < perRow || !bottomRow ? topRow : bottomRow
      this.addPhraseChip(parent, shuffled[i], chipWidth)
    }
    this.cloudSay(this.copy("orderPhrase"))
    this.scheduleRenderOrderPass()
  }

  private addPhraseChip(parent: SceneObject, word: string, width: number): void {
    const root = this.makeObject(parent, `Chip ${word}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
    styleLingoButton(button, "card")
    this.marshmallow(button, 2.1)
    button.size = new vec3(width, 4.2, 1)
    button.onInitialized.add(() => button.size = new vec3(width, 4.2, 1))
    const label = this.boostDenseText(this.addOverlayText(root, word, width - 1.4, 3, "Body", LINGO_COLORS.ink, new vec3(0, 0, 1.35)))
    this.registerFlexItem(parent, root, width, 4.2, FlexAlignSelf.Center)
    const view: AnswerView = {root, button, label, word}
    button.onTriggerUp.add(() => this.resolvePhraseChip(view))
  }

  private resolvePhraseChip(chip: AnswerView): void {
    if (this.phase !== "C" || this.advancing || !this.phraseLineText || !chip.root.enabled) return
    if (chip.word !== this.puzzleExpected[this.puzzleProgress]) {
      this.audio.playSoftReturn()
      styleLingoButton(chip.button, "food")
      chip.label.textFill.color = LINGO_COLORS.white
      this.afterGuarded(0.5, () => {
        if (isNull(chip.root)) return
        styleLingoButton(chip.button, "card")
        chip.label.textFill.color = LINGO_COLORS.ink
      })
      return
    }
    this.audio.playClick()
    chip.root.enabled = false
    this.puzzleProgress += 1
    const built = this.puzzleExpected.slice(0, this.puzzleProgress).join(" ")
    this.phraseLineText.text = this.puzzleProgress < this.puzzleExpected.length ? `${built} ▁` : built
    if (this.puzzleProgress < this.puzzleExpected.length) return
    this.advancing = true
    this.phraseLineText.textFill.color = QUIZ_CORRECT_COLOR
    this.cloudSay(this.copy("phraseSolved"), QUIZ_CORRECT_COLOR)
    this.audio.playSaved()
    this._onPhraseSolved.invoke(this.index)
    this.afterGuarded(1.2, () => this.advanceWord())
  }

  /** CJK glyph shapes need a larger point size than Latin in the same box;
   * vertical Shrink keeps the boosted text inside its layout rect. */
  private boostDenseText(text: Text, factor: number = 1.35): Text {
    if (hasDenseScript(text.text)) text.size = Math.round(text.size * factor)
    return text
  }

  /** Pronunciation for any option word: this round's cards first (scanned words
   * carry their own phonetic), then the reference vocabulary. */
  private phoneticFor(word: string): string {
    const key = word.trim().toLowerCase()
    for (let i = 0; i < this.cards.length; i++) {
      if (this.cards[i].card.word.trim().toLowerCase() === key) {
        return this.cards[i].phonetic || this.cards[i].card.phonetic || ""
      }
    }
    return getWordPhonetic(this.targetLanguage, word)
  }

  private buildOptions(entry: QuizCard): string[] {
    const correct = entry.card.word
    const seen: Record<string, boolean> = {}
    seen[correct.toLowerCase()] = true
    const candidates = this.distractorPool.concat(this.cards.map((quizCard) => quizCard.card.word))
    const unique: string[] = []
    for (let i = 0; i < candidates.length; i++) {
      const candidate = String(candidates[i] || "").trim()
      if (!candidate) continue
      const key = candidate.toLowerCase()
      if (seen[key]) continue
      seen[key] = true
      unique.push(candidate)
    }
    const distractors = this.seededShuffle(unique, this.index * 7 + 13).slice(0, 3)
    return this.seededShuffle([correct].concat(distractors), this.index * 31 + 7)
  }

  /** Deterministic per-word ordering so a rebuilt page shows the same grid. */
  private seededShuffle<T>(values: T[], seed: number): T[] {
    const result = values.slice()
    let state = (seed * 9301 + 49297) % 233280
    for (let i = result.length - 1; i > 0; i--) {
      state = (state * 9301 + 49297) % 233280
      const j = Math.floor((state / 233280) * (i + 1))
      const swap = result[i]
      result[i] = result[j]
      result[j] = swap
    }
    return result
  }

  private resolveAnswer(view: AnswerView): void {
    if (this.phase !== "A" || this.answerLocked || this.tweenPhase !== "idle") return
    this.answerLocked = true
    const entry = this.cards[this.index]
    const correct = !!entry && view.word === entry.card.word
    this._onAnswerResult.invoke(correct)
    if (correct) {
      styleLingoButton(view.button, "success")
      view.label.textFill.color = LINGO_COLORS.white
      this.cloudSay(this.copy("quizCorrect"), QUIZ_CORRECT_COLOR)
      this.audio.playSaved()
      this.afterGuarded(0.9, () => this.beginTransition(() => this.buildPhaseB()))
      return
    }
    styleLingoButton(view.button, "food")
    view.label.textFill.color = LINGO_COLORS.white
    this.cloudSay(this.copy("quizWrong"), QUIZ_RETRY_COLOR)
    this.audio.playSoftReturn()
    if (this.correctAnswerView) this.blinkCorrectAnswer(this.correctAnswerView, 0)
    // They still practice the word: phase B teaches what they just missed.
    this.afterGuarded(1.6, () => this.beginTransition(() => this.buildPhaseB()))
  }

  private blinkCorrectAnswer(view: AnswerView, step: number): void {
    const delayed = this.host.createEvent("DelayedCallbackEvent")
    delayed.bind(() => {
      if (!view.root || isNull(view.root)) return
      const highlight = step % 2 === 0
      styleLingoButton(view.button, highlight ? "success" : "card")
      view.label.textFill.color = highlight ? LINGO_COLORS.white : LINGO_COLORS.ink
      view.root.getTransform().setLocalScale(highlight ? new vec3(1.1, 1.1, 1) : vec3.one())
      if (step < 5) this.blinkCorrectAnswer(view, step + 1)
    })
    delayed.reset(0.22)
  }

  private beginTransition(rebuild: () => void): void {
    if (this.tweenPhase !== "idle") return
    this.tweenPhase = "out"
    this.tweenTime = 0
    this.tweenAction = rebuild
  }

  private updateTween(): void {
    if (this.tweenPhase === "idle") return
    this.tweenTime += getDeltaTime()
    const transform = this.root.getTransform()
    if (this.tweenPhase === "out") {
      const t = Math.min(1, this.tweenTime / TRANSITION_OUT_SECONDS)
      const eased = t * t * (3 - 2 * t)
      const scale = 1 - TRANSITION_SCALE_DIP * eased
      transform.setLocalScale(new vec3(scale, scale, scale))
      transform.setLocalRotation(quat.angleAxis(TRANSITION_Y_ROTATION * eased, vec3.up()))
      if (t >= 1) {
        if (this.tweenAction) this.tweenAction()
        this.tweenAction = null
        this.tweenPhase = "in"
        this.tweenTime = 0
      }
      return
    }
    const t = Math.min(1, this.tweenTime / TRANSITION_IN_SECONDS)
    // Back-out: a soft overshoot past full size lands the new card with bounce.
    const back = 1.70158
    const p = t - 1
    const eased = p * p * ((back + 1) * p + back) + 1
    const scale = 1 - TRANSITION_SCALE_DIP + TRANSITION_SCALE_DIP * eased
    transform.setLocalScale(new vec3(scale, scale, scale))
    transform.setLocalRotation(quat.angleAxis(TRANSITION_Y_ROTATION * (1 - eased), vec3.up()))
    if (t >= 1) {
      transform.setLocalScale(vec3.one())
      transform.setLocalRotation(quat.quatIdentity())
      this.tweenPhase = "idle"
    }
  }

  private newPage(name: string): SceneObject {
    // Detach the old item before destroying its SceneObject. FlexLayout defers
    // layout until LateUpdate, so leaving a destroyed item in its managed list
    // can make it call applyLayout on a null object during fast page changes.
    if (this.pageItem) {
      this.contentFlex.removeItems([this.pageItem])
      this.pageItem = null
    }
    if (this.pageRoot) {
      deferDestroy(this.host, this.pageRoot)
      this.pageRoot = null
    }
    this.artworkMaterial = null
    this.artworkImageRoot = null
    this.artworkPendingRoot = null
    if (this.talkHeld) {
      // The held talk button is about to be destroyed with the page; end the
      // hold properly so the mic session isn't left transcribing.
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    }
    this.answerViews = []
    this.correctAnswerView = null
    this.phraseLineText = null
    const page = this.makeObject(this.contentFlex.sceneObject, name)
    const pageFlex = page.createComponent(FlexLayout.getTypeName()) as FlexLayout
    pageFlex.autoDiscoverItemsOnStart = false
    pageFlex.width = CONTENT_WIDTH
    pageFlex.height = -1
    pageFlex.direction = FlexDirection.Column
    pageFlex.alignItems = FlexAlign.Stretch
    pageFlex.justifyContent = FlexJustify.Start
    pageFlex.rowGap = 0.4
    const item = page.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = CONTENT_WIDTH
    item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Stretch
    this.contentFlex.addItems([item])
    // Re-append the menu item so a rebuilt page never drops below it.
    if (this.menuItem) {
      this.contentFlex.removeItems([this.menuItem])
      this.contentFlex.addItems([this.menuItem])
    }
    this.pageItem = item
    this.pageRoot = page
    return page
  }

  private refreshProgress(): void {
    const total = this.cards.length
    const dots = "● ".repeat(this.index) + "○ ".repeat(Math.max(0, total - this.index))
    this.progressText.text = `${Math.min(this.index + 1, Math.max(1, total))} / ${total} ${lingoCopy(this.nativeLanguage, "words")}    ${dots.trim()}`
  }

  private buildCardShell(parent: SceneObject, width: number, height: number, imageScale: number, imageOffset: vec3): void {
    const shell = this.makeObject(parent, "Quiz Card Shell")
    // The kawaii frame floats directly on the illustrated background: a plate
    // behind it showed as a dark translucent ring around the card on device.
    this.addTextureImage(shell, CARD_FRAME_TEXTURE, width, height, "Illustrated Card Frame", new vec3(0, 0, 0.45))
    const entry = this.cards[this.index]
    const imageRoot = this.makeObject(shell, "Quiz Card Artwork", imageOffset)
    const image = imageRoot.createComponent("Component.Image") as Image
    image.stretchMode = StretchMode.Fit
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.baseTex = (entry && entry.texture) || CARD_FRAME_TEXTURE
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    // Generated art ships with a transparent background: without alpha blending
    // the device renders those pixels as a black slab around the drawing.
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    imageRoot.getTransform().setLocalScale(new vec3(imageScale, imageScale, 1))
    // Late-arriving generated artwork enables this through setCardTexture.
    imageRoot.enabled = !!(entry && entry.texture)
    // Until it lands, three dots in the frame say the drawing is on its way.
    if (entry && !entry.texture) {
      this.artworkPendingRoot = this.makeObject(shell, "Quiz Card Artwork Pending", new vec3(imageOffset.x, imageOffset.y, 1.2))
      this.addOverlayText(this.artworkPendingRoot, "…", width - 4, 4, "Headline", LINGO_COLORS.purple, vec3.zero())
    }
    this.artworkMaterial = material
    this.artworkImageRoot = imageRoot
    this.registerFlexItem(parent, shell, width, height, FlexAlignSelf.Center)
  }

  /** Full pill corners: the same marshmallow look as the MOVE/FOLLOW handles. */
  private marshmallow(button: Button, radius: number): void {
    button.onInitialized.add(() => {
      const visual = button.visual as RoundedRectangleVisual
      if (visual instanceof RoundedRectangleVisual) visual.cornerRadius = radius
    })
  }

  private addAnswerButton(parent: SceneObject, word: string, width: number, phonetic: string = ""): AnswerView {
    const root = this.makeObject(parent, `Answer ${word}`)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
    styleLingoButton(button, "card")
    this.marshmallow(button, 2.2)
    button.size = new vec3(width, 4.4, 1)
    button.onInitialized.add(() => button.size = new vec3(width, 4.4, 1))
    // With a phonetic the symbols move up and the romanization slots beneath.
    const labelPosition = phonetic ? new vec3(0, 0.75, 1.35) : new vec3(0, 0, 1.35)
    const label = this.boostDenseText(this.addOverlayText(root, word, width - 1.6, phonetic ? 2.3 : 3.2, "Body", LINGO_COLORS.ink, labelPosition))
    if (phonetic) this.addOverlayText(root, phonetic, width - 1.6, 1.6, "Caption", LINGO_COLORS.purple, new vec3(0, -1.15, 1.35))
    this.registerFlexItem(parent, root, width, 4.4, FlexAlignSelf.Center)
    const view: AnswerView = {root, button, label, word}
    button.onTriggerUp.add(() => this.resolveAnswer(view))
    return view
  }

  /** Bottom action row: SKIP jumps to the next word, MENU exits the quiz. */
  private addBottomActions(parent: SceneObject): void {
    const row = this.makeObject(parent, "Quiz Bottom Actions")
    const flex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = CONTENT_WIDTH
    flex.height = 4.4
    flex.direction = FlexDirection.Row
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.columnGap = 0.8
    this.menuItem = this.registerFlexItem(parent, row, CONTENT_WIDTH, 4.4, FlexAlignSelf.Center)

    const skipRoot = this.makeObject(row, "Quiz Skip Action")
    const skipButton = skipRoot.createComponent(Button.getTypeName()) as Button
    skipButton.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(skipButton, "primary")
    this.marshmallow(skipButton, 2.05)
    skipButton.size = new vec3(13.4, 4.1, 1)
    skipButton.onInitialized.add(() => skipButton.size = new vec3(13.4, 4.1, 1))
    this.skipActionContent = this.addOverlayText(skipRoot, "SKIP ▸", 12, 2.7, "Caption", LINGO_COLORS.white, new vec3(0, 0, 1.35))
    this.registerFlexItem(row, skipRoot, 13.4, 4.1, FlexAlignSelf.Center)
    skipButton.onTriggerUp.add(() => this.skipWord())

    const menuRoot = this.makeObject(row, "Quiz Menu Action")
    const menuButton = menuRoot.createComponent(Button.getTypeName()) as Button
    menuButton.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(menuButton, "neutral")
    this.marshmallow(menuButton, 2.05)
    menuButton.size = new vec3(13.4, 4.1, 1)
    menuButton.onInitialized.add(() => menuButton.size = new vec3(13.4, 4.1, 1))
    this.menuActionContent = this.addOverlayText(menuRoot, "MENU", 12, 2.7, "Caption", LINGO_COLORS.white, new vec3(0, 0, 1.35))
    this.registerFlexItem(row, menuRoot, 13.4, 4.1, FlexAlignSelf.Center)
    menuButton.onTriggerUp.add(() => {
      if (this.tweenPhase !== "idle" || this.advancing) return
      this.advancing = true
      this._onReturnToMenu.invoke()
    })
  }

  /** Change words on demand: no XP, no completion credit — just move on. */
  private skipWord(): void {
    if (this.tweenPhase !== "idle" || this.advancing) {
      this.audio.playSoftReturn()
      return
    }
    if (this.talkHeld) {
      this.talkHeld = false
      this._onVoiceHoldEnd.invoke()
    }
    this.audio.playClick()
    // Cancel any pending delayed advances from the abandoned word, and drop
    // out of phase B so a late transcript cannot advance the next word.
    this.generation += 1
    this.phase = "A"
    if (this.index + 1 >= this.cards.length) {
      this._onRoundCompleted.invoke()
      return
    }
    this.index += 1
    this.beginTransition(() => this.buildPhaseA())
  }

  private makeActionRow(parent: SceneObject, name: string, height: number): SceneObject {
    const row = this.makeObject(parent, name)
    const flex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false
    flex.width = CONTENT_WIDTH
    flex.height = height
    flex.direction = FlexDirection.Row
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.columnGap = 0.6
    this.registerFlexItem(parent, row, CONTENT_WIDTH, height, FlexAlignSelf.Center)
    return row
  }

  private addActionButton(parent: SceneObject, label: string, icon: Texture | null, width: number, tone: "home" | "primary" | "neutral", onClick?: () => void): Button {
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
    if (onClick) button.onTriggerUp.add(onClick)
    return button
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

  private addText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4): Text {
    const root = this.makeObject(parent, `Text ${role}`)
    const text = this.addOverlayText(root, value, width, height, role, color, vec3.zero())
    this.registerFlexItem(parent, root, width, height, FlexAlignSelf.Stretch)
    return text
  }

  private addOverlayText(parent: SceneObject, value: string, width: number, height: number, role: TextRole, color: vec4, position: vec3): Text {
    const root = position.equal(vec3.zero()) ? parent : this.makeObject(parent, `Overlay ${value}`, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = false
    text.size = TYPE_SCALE[role].size
    ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
    text.horizontalAlignment = HorizontalAlignment.Center
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

  /** Buttons build their visuals a few frames after creation, so the ordering
   * pass runs twice on a delay to catch everything. */
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

  /** Background stays lowest, plates next, then images, texts, and button internals on top. */
  private applyRenderOrders(object: SceneObject, insideButton: boolean): void {
    const isButton = insideButton || !!object.getComponent(Button.getTypeName())
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      const typeName = visual.getTypeName()
      if (isButton) {
        if (typeName === "Component.Text") visual.setRenderOrder(QUIZ_RENDER_ORDER.buttonText)
        else if (typeName === "Component.Image") visual.setRenderOrder(QUIZ_RENDER_ORDER.buttonIcon)
        else visual.setRenderOrder(QUIZ_RENDER_ORDER.buttonMesh)
        continue
      }
      if (object === this.backgroundRoot) visual.setRenderOrder(QUIZ_RENDER_ORDER.background)
      else if (object === this.artworkImageRoot) visual.setRenderOrder(QUIZ_RENDER_ORDER.artwork)
      else if (typeName === "Component.Text") visual.setRenderOrder(QUIZ_RENDER_ORDER.text)
      else if (typeName === "Component.Image") visual.setRenderOrder(QUIZ_RENDER_ORDER.image)
      else visual.setRenderOrder(QUIZ_RENDER_ORDER.plate)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) {
      this.applyRenderOrders(object.getChild(i), isButton)
    }
  }

  private afterGuarded(seconds: number, action: () => void): void {
    const generation = this.generation
    const delayed = this.host.createEvent("DelayedCallbackEvent")
    delayed.bind(() => {
      if (generation !== this.generation || !this.root || !this.root.enabled) return
      action()
    })
    delayed.reset(seconds)
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
