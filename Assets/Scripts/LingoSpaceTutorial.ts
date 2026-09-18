/** First-run guided tour: five Cloudy steps in the wearer's NATIVE language,
 * spoken aloud, with SKIP TUTORIAL always one tap away. Shown right after the
 * native language is chosen, so every word of it is understandable. */
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {Button515 as Button} from "./compat515/Button515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {LanguageId} from "./LingoSpaceData"
import {flagTexture} from "./LingoSpaceFlags"
import {LingoCopyKey, languageName, lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"

const PANEL_TEXTURE = requireAsset("../ScreenDesign/background2.png") as Texture
const MASCOT_TEXTURE = requireAsset("../LingoDesign/cloud.png") as Texture
const LOGO_TEXTURE = requireAsset("../LingoDesign/LOGO.png") as Texture
const CARD_TEXTURE = requireAsset("../BoardDesign/card central.png") as Texture
const BOOK_TEXTURE = requireAsset("../AIImagesKawaii/book.png") as Texture
const SOUND_TEXTURE = requireAsset("../LingoDesign/sonido.png") as Texture
const MOON_TEXTURE = requireAsset("../Icons/moon.png") as Texture
const CAMERA_TEXTURE = requireAsset("../Icons/photo_camera.png") as Texture
const MIC_TEXTURE = requireAsset("../Icons/mic.png") as Texture
const VOLUME_TEXTURE = requireAsset("../Icons/volume_up.png") as Texture
// White shapes tinted per tone: mock UI with zero interactables (SIK-safe).
// Two aspect ratios so wide pills keep round corners instead of stretching.
const PILL_TEXTURE = requireAsset("../Icons/tut-pill.png") as Texture
const PILL_WIDE_TEXTURE = requireAsset("../Icons/tut-pill-wide.png") as Texture
const CIRCLE_TEXTURE = requireAsset("../Icons/tut-circle.png") as Texture
const DOG_TEXTURE = requireAsset("../AIImagesKawaii/dog.png") as Texture
// The real menu mode-button artwork (1557x465): shown 1:1 in the tour.
const SCAN_MODE_TEXTURE = requireAsset("../ScreenDesign/scan-my-world.png") as Texture
const IMAGE_MODE_TEXTURE = requireAsset("../ScreenDesign/image-cards.png") as Texture
const CHAIR_TEXTURE = requireAsset("../AIImagesKawaii/chair.png") as Texture
const CLOUD_EN_TEXTURE = requireAsset("../LingoDesign/nube-en.png") as Texture
const CLOUD_FR_TEXTURE = requireAsset("../LingoDesign/nube-fr.png") as Texture

const STEP_KEYS: LingoCopyKey[] = [
  "tutorial1", "tutorialLang", "tutorialMode", "tutorial2", "tutorial3",
  "tutorialPhrase", "tutorial4", "tutorialQuiz", "tutorialGlossary", "tutorial5",
]

// Sample content for the exercise simulations, in the wearer's NATIVE tongue.
const DEMO_WORDS: Record<LanguageId, {right: string, wrong: string, chair: string}> = {
  Spanish: {right: "perro", wrong: "gato", chair: "silla"},
  English: {right: "dog", wrong: "cat", chair: "chair"},
  German: {right: "Hund", wrong: "Katze", chair: "Stuhl"},
  French: {right: "chien", wrong: "chat", chair: "chaise"},
  Italian: {right: "cane", wrong: "gatto", chair: "sedia"},
  Japanese: {right: "いぬ", wrong: "ねこ", chair: "いす"},
}

// A faithful sample card: target-language front with native translations.
// English plays the demo target (French for English natives).
const DEMO_CARD: Record<LanguageId, {word: string, translation: string, phrase: string, phraseTr: string, phonetic: string}> = {
  Spanish: {word: "dog", translation: "perro", phrase: "The dog is happy", phraseTr: "El perro está feliz", phonetic: "DOG"},
  English: {word: "chien", translation: "dog", phrase: "Le chien est content", phraseTr: "The dog is happy", phonetic: "shee-AN"},
  German: {word: "dog", translation: "Hund", phrase: "The dog is happy", phraseTr: "Der Hund ist glücklich", phonetic: "DOG"},
  French: {word: "dog", translation: "chien", phrase: "The dog is happy", phraseTr: "Le chien est content", phonetic: "DOG"},
  Italian: {word: "dog", translation: "cane", phrase: "The dog is happy", phraseTr: "Il cane è felice", phonetic: "DOG"},
  Japanese: {word: "dog", translation: "いぬ", phrase: "The dog is happy", phraseTr: "いぬは うれしい", phonetic: "DOG"},
}

const DEMO_PHRASE: Record<LanguageId, {scrambled: string[], solved: string}> = {
  Spanish: {scrambled: ["come", "El", "perro"], solved: "El perro come"},
  English: {scrambled: ["eats", "The", "dog"], solved: "The dog eats"},
  German: {scrambled: ["frisst", "Der", "Hund"], solved: "Der Hund frisst"},
  French: {scrambled: ["mange", "Le", "chien"], solved: "Le chien mange"},
  Italian: {scrambled: ["mangia", "Il", "cane"], solved: "Il cane mangia"},
  Japanese: {scrambled: ["たべる", "いぬが"], solved: "いぬが たべる"},
}

// Same pop-up band as the language picker: always above every HUD (they top
// out at 18); the two are never open at the same time.
const ORDER = {background: 40, mascot: 43, text: 44, buttonMesh: 46, buttonText: 48}

export class LingoSpaceTutorial {
  private root: SceneObject | null = null
  private stepText!: Text
  private counterText!: Text
  private nextLabel!: Text
  private demoGroups: SceneObject[] = []
  private step = 0
  private language: LanguageId = "Spanish"
  private worldCamera = WorldCameraFinderProvider.getInstance()
  private fx: LingoFX

  constructor(
    private host: BaseScriptComponent,
    private audio: LingoSpaceAudioController,
    private onSpeak: (text: string) => void,
    private onDone: () => void,
    private onDontShowAgain: () => void,
  ) {
    this.fx = new LingoFX(host)
    // Built LAZILY on first show — boot-built disabled buttons leave
    // half-initialized interactables in SIK's cursor cache (device crashes).
  }

  isOpen(): boolean {
    return !!this.root && this.root.enabled
  }

  private builtLanguage: LanguageId | null = null

  show(language: LanguageId): void {
    // Every text (step copy, button labels, demo samples) is baked at build
    // time: a different native language demands a fresh build, or the wearer
    // reads Spanish demos under Japanese narration. Deferred destroy keeps
    // SIK's cursor safe while the old panel goes away.
    if (this.root && this.builtLanguage !== language) {
      deferDestroy(this.host, this.root)
      this.root = null
      this.demoGroups = []
    }
    this.language = language
    this.step = 0
    const root = this.ensureBuilt()
    // Straight ahead at reading distance, then the billboard keeps facing.
    const head = this.worldCamera.getWorldPosition()
    const forward = this.worldCamera.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const flat = new vec3(forward.x, 0, forward.z)
    const direction = flat.length > 0.001 ? flat.normalize() : new vec3(0, 0, -1)
    root.getTransform().setWorldPosition(head.add(direction.uniformScale(60)))
    root.enabled = true
    this.renderStep()
    this.fx.popIn(root, {rotateDegrees: 0})
  }

  hide(): void {
    if (this.root) this.root.enabled = false
  }

  private ensureBuilt(): SceneObject {
    if (this.root) return this.root
    this.builtLanguage = this.language
    this.root = global.scene.createSceneObject("Lingo Tutorial")
    const billboard = this.root.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.3, 0.3, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    this.build()
    return this.root
  }

  private build(): void {
    const root = this.root!
    this.addImage(root, PANEL_TEXTURE, new vec2(40, 27), new vec3(0, 0, 0), ORDER.background)
    // Cloudy narrates from the top-left; the demo zone shows the REAL UI piece
    // each step talks about, so the wearer recognizes it instantly later.
    this.addImage(root, MASCOT_TEXTURE, new vec2(8.6, 8.6), new vec3(-14, 7.4, 0.8), ORDER.mascot)
    this.counterText = this.addText(root, "1/5", 8, 2.2, 34, LINGO_COLORS.purple, new vec3(14.6, 10.6, 0.8))
    this.stepText = this.addText(root, "", 27.5, 8.2, 42, LINGO_COLORS.ink, new vec3(2.4, 6.9, 0.8))
    this.buildDemos(root)
    // Three choices, always visible: SKIP (this session), DON'T SHOW AGAIN
    // (the USER retires the tour, never us), and NEXT driving the steps.
    const skipRoot = this.makeObject(root, "Tutorial Skip", new vec3(-13, -9.6, 0.8))
    const skip = skipRoot.createComponent(Button.getTypeName()) as Button
    skip.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(skip, "neutral")
    skip.size = new vec3(11.8, 3.8, 1)
    skip.onInitialized.add(() => skip.size = new vec3(11.8, 3.8, 1))
    this.addText(skipRoot, lingoCopy(this.language, "tutorialSkip"), 10.6, 2.4, 26, LINGO_COLORS.white, new vec3(0, 0, 1.2), ORDER.buttonText)
    skip.onTriggerUp.add(() => this.finish())

    const dontRoot = this.makeObject(root, "Tutorial Dont Show", new vec3(0, -9.6, 0.8))
    const dont = dontRoot.createComponent(Button.getTypeName()) as Button
    dont.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(dont, "warning")
    dont.size = new vec3(11.8, 3.8, 1)
    dont.onInitialized.add(() => dont.size = new vec3(11.8, 3.8, 1))
    this.addText(dontRoot, lingoCopy(this.language, "tutorialDontShow"), 10.6, 2.4, 24, LINGO_COLORS.white, new vec3(0, 0, 1.2), ORDER.buttonText)
    dont.onTriggerUp.add(() => {
      this.onDontShowAgain()
      this.finish()
    })

    const nextRoot = this.makeObject(root, "Tutorial Next", new vec3(13, -9.6, 0.8))
    const next = nextRoot.createComponent(Button.getTypeName()) as Button
    next.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(next, "primary")
    next.size = new vec3(11.8, 4.4, 1)
    next.onInitialized.add(() => next.size = new vec3(11.8, 4.4, 1))
    this.nextLabel = this.addText(nextRoot, "", 10.6, 2.6, 30, LINGO_COLORS.white, new vec3(0, 0, 1.2), ORDER.buttonText)
    next.onTriggerUp.add(() => {
      if (this.step >= STEP_KEYS.length - 1) {
        this.finish()
        return
      }
      this.audio.playClick()
      this.step += 1
      this.renderStep()
    })
    this.scheduleOrderPass()
  }

  private renderStep(): void {
    const text = lingoCopy(this.language, STEP_KEYS[this.step])
    this.stepText.text = text
    this.counterText.text = `${this.step + 1}/${STEP_KEYS.length}`
    for (let i = 0; i < this.demoGroups.length; i++) this.demoGroups[i].enabled = i === this.step
    const lastStep = this.step >= STEP_KEYS.length - 1
    this.nextLabel.text = lingoCopy(this.language, lastStep ? "tutorialDone" : "tutorialNext")
    this.onSpeak(text)
  }

  /** One little stage per step, built from the SAME textures and tones as the
   * real UI — pure images and text, no interactables, so nothing for SIK's
   * cursor to trip on. Only the active step's stage is visible. */
  private buildDemos(root: SceneObject): void {
    // Vertical center of the free band between the step text (bottom ~2.8)
    // and the buttons (top ~-7.4): every stage floats in the middle of it.
    const DEMO_Y = -1.6
    // 1 — welcome: the app logo, big and riding high (the square canvas
    // carries wide transparent margins, so it still clears the buttons).
    const welcome = this.makeObject(root, "Demo Welcome", new vec3(0, DEMO_Y, 0.8))
    this.addImage(welcome, LOGO_TEXTURE, new vec2(15.2, 15.2), new vec3(0, 0.7, 0), ORDER.mascot)
    // 2 — pick your languages: cloud pills like the real language pages.
    const lang = this.makeObject(root, "Demo Lang", new vec3(0, DEMO_Y, 0.8))
    const langRows: {cloud: Texture, language: LanguageId, y: number}[] = [
      {cloud: CLOUD_EN_TEXTURE, language: "English", y: 2.4},
      {cloud: CLOUD_FR_TEXTURE, language: "French", y: -2.2},
    ]
    for (let i = 0; i < langRows.length; i++) {
      const row = langRows[i]
      this.addImage(lang, PILL_TEXTURE, new vec2(15.4, 4.2), new vec3(0, row.y, 0), ORDER.mascot, new vec4(1, 0.96, 0.89, 1))
      this.addImage(lang, row.cloud, new vec2(4, 4), new vec3(-4.8, row.y + 0.1, 0.6), ORDER.text)
      this.addText(lang, languageName(row.language, this.language), 9, 2.4, 32, LINGO_COLORS.ink, new vec3(2.2, row.y, 0.6), ORDER.buttonText)
    }
    // 3 — pick your mode: the REAL menu mode buttons, same artwork.
    const mode = this.makeObject(root, "Demo Mode", new vec3(0, DEMO_Y, 0.8))
    this.addImage(mode, SCAN_MODE_TEXTURE, new vec2(16.6, 4.95), new vec3(0, 2.75, 0), ORDER.mascot)
    this.addImage(mode, IMAGE_MODE_TEXTURE, new vec2(16.6, 4.95), new vec3(0, -2.55, 0), ORDER.mascot)
    // 4 — the SCAN button and, as its result, a little card appearing.
    const scan = this.makeObject(root, "Demo Scan", new vec3(0, DEMO_Y, 0.8))
    this.addImage(scan, PILL_TEXTURE, new vec2(17, 4.7), new vec3(0, 3, 0), ORDER.mascot, new vec4(0.61, 0.42, 1, 1))
    this.addImage(scan, CAMERA_TEXTURE, new vec2(2.5, 2.5), new vec3(-5.9, 3, 0.6), ORDER.text)
    this.addText(scan, lingoCopy(this.language, "scan"), 11.6, 2.6, 36, LINGO_COLORS.white, new vec3(1.2, 3, 0.6), ORDER.buttonText)
    this.addText(scan, "✦", 3, 2, 26, LINGO_COLORS.purple, new vec3(0, 0.4, 0.6), ORDER.buttonText)
    this.addImage(scan, CARD_TEXTURE, new vec2(5.6, 6.8), new vec3(0, -3.4, 0), ORDER.mascot)
    this.addImage(scan, DOG_TEXTURE, new vec2(3.6, 3.6), new vec3(0, -3, 0.6), ORDER.text)
    // 5 — the card in full: word, translation, phrase, phonetics and its
    // two pills, mirroring the real spatial card layout.
    const card = this.makeObject(root, "Demo Card", new vec3(0, DEMO_Y, 0.8))
    const sample = DEMO_CARD[this.language]
    this.addImage(card, CARD_TEXTURE, new vec2(15.4, 10.6), new vec3(0, -0.1, 0), ORDER.mascot)
    this.addImage(card, DOG_TEXTURE, new vec2(3, 3), new vec3(-5.4, 2.9, 0.6), ORDER.text)
    this.addText(card, sample.word, 9, 2.2, 34, LINGO_COLORS.ink, new vec3(1.4, 3.3, 0.6), ORDER.buttonText)
    this.addText(card, sample.translation, 9, 1.8, 24, new vec4(0.13, 0.62, 0.55, 1), new vec3(1.4, 1.9, 0.6), ORDER.buttonText)
    this.addText(card, sample.phrase, 13.6, 1.9, 26, LINGO_COLORS.ink, new vec3(0, 0.3, 0.6), ORDER.buttonText)
    this.addText(card, sample.phraseTr, 13.6, 1.8, 22, new vec4(0.13, 0.62, 0.55, 1), new vec3(0, -1.2, 0.6), ORDER.buttonText)
    this.addText(card, sample.phonetic, 13.6, 1.7, 22, LINGO_COLORS.purple, new vec3(0, -2.6, 0.6), ORDER.buttonText)
    this.addImage(card, PILL_TEXTURE, new vec2(6.6, 2.2), new vec3(-3.5, -4.4, 0.6), ORDER.text, new vec4(0.61, 0.42, 1, 1))
    this.addImage(card, VOLUME_TEXTURE, new vec2(1.5, 1.5), new vec3(-5.3, -4.4, 1), ORDER.buttonText)
    this.addText(card, lingoCopy(this.language, "listen"), 4.6, 1.5, 18, LINGO_COLORS.white, new vec3(-2.8, -4.4, 1), ORDER.buttonText)
    this.addImage(card, PILL_TEXTURE, new vec2(6.6, 2.2), new vec3(3.5, -4.4, 0.6), ORDER.text, new vec4(0.13, 0.62, 0.55, 1))
    this.addImage(card, MIC_TEXTURE, new vec2(1.5, 1.5), new vec3(1.7, -4.4, 1), ORDER.buttonText)
    this.addText(card, lingoCopy(this.language, "holdToTalk"), 4.6, 1.5, 16, LINGO_COLORS.white, new vec3(4.2, -4.4, 1), ORDER.buttonText)
    // 6 — order the phrase: scrambled words above, the solved sentence below.
    const phrase = this.makeObject(root, "Demo Phrase", new vec3(0, DEMO_Y, 0.8))
    const phraseWords = DEMO_PHRASE[this.language]
    const tokenCount = phraseWords.scrambled.length
    for (let i = 0; i < tokenCount; i++) {
      const x = (i - (tokenCount - 1) / 2) * 6.8
      this.addImage(phrase, PILL_TEXTURE, new vec2(6.2, 3.2), new vec3(x, 2.2, 0), ORDER.mascot, new vec4(1, 0.96, 0.89, 1))
      this.addText(phrase, phraseWords.scrambled[i], 5.4, 2, 28, LINGO_COLORS.ink, new vec3(x, 2.2, 0.6), ORDER.buttonText)
    }
    this.addImage(phrase, PILL_WIDE_TEXTURE, new vec2(17.6, 3.7), new vec3(0, -2.6, 0), ORDER.mascot, new vec4(0.06, 0.5, 0.38, 1))
    this.addText(phrase, `✓ ${phraseWords.solved}`, 15.6, 2.3, 32, LINGO_COLORS.white, new vec3(0, -2.6, 0.6), ORDER.buttonText)
    // 7 — the PRACTICE and WORD HUNT buttons from the scan HUD.
    const games = this.makeObject(root, "Demo Games", new vec3(0, DEMO_Y, 0.8))
    this.addImage(games, PILL_WIDE_TEXTURE, new vec2(22, 4.4), new vec3(0, 2.9, 0), ORDER.mascot, new vec4(0.06, 0.5, 0.48, 1))
    this.addText(games, lingoCopy(this.language, "practiceSaved"), 19.6, 2.4, 30, LINGO_COLORS.white, new vec3(0, 2.9, 0.6), ORDER.buttonText)
    this.addImage(games, PILL_WIDE_TEXTURE, new vec2(22, 4.4), new vec3(0, -2.1, 0), ORDER.mascot, new vec4(0.06, 0.5, 0.38, 1))
    this.addText(games, lingoCopy(this.language, "huntStart"), 19.6, 2.4, 30, LINGO_COLORS.white, new vec3(0, -2.1, 0.6), ORDER.buttonText)
    // 6 — the quiz as a little EXERCISE simulation: the dog artwork asks the
    // question; the wrong answer sits plain, the right one glows green.
    const quiz = this.makeObject(root, "Demo Quiz", new vec3(0, DEMO_Y, 0.8))
    const words = DEMO_WORDS[this.language]
    this.addText(quiz, lingoCopy(this.language, "quizQuestion"), 22, 2.6, 40, LINGO_COLORS.ink, new vec3(0, 3.7, 0.6), ORDER.buttonText)
    this.addImage(quiz, CARD_TEXTURE, new vec2(6.6, 8), new vec3(-7.4, -1.5, 0), ORDER.mascot)
    this.addImage(quiz, DOG_TEXTURE, new vec2(4.4, 4.4), new vec3(-7.4, -1.1, 0.6), ORDER.text)
    this.addImage(quiz, PILL_TEXTURE, new vec2(12.8, 3.5), new vec3(4.4, 0.5, 0), ORDER.mascot, new vec4(1, 0.96, 0.89, 1))
    this.addText(quiz, words.wrong, 11, 2.2, 32, LINGO_COLORS.ink, new vec3(4.4, 0.5, 0.6), ORDER.buttonText)
    this.addImage(quiz, PILL_TEXTURE, new vec2(12.8, 3.5), new vec3(4.4, -3.5, 0), ORDER.mascot, new vec4(0.06, 0.5, 0.38, 1))
    this.addText(quiz, `✓ ${words.right}`, 11, 2.2, 32, LINGO_COLORS.white, new vec3(4.4, -3.5, 0.6), ORDER.buttonText)
    // 9 — the glossary: the book plus one real-looking row (art, word, voice).
    const gloss = this.makeObject(root, "Demo Glossary", new vec3(0, DEMO_Y, 0.8))
    this.addImage(gloss, BOOK_TEXTURE, new vec2(6.2, 6.2), new vec3(-11, 0.2, 0), ORDER.mascot)
    this.addImage(gloss, PILL_WIDE_TEXTURE, new vec2(19.4, 6.4), new vec3(2.8, 0.2, 0), ORDER.mascot, new vec4(1, 0.98, 0.93, 1))
    this.addImage(gloss, CHAIR_TEXTURE, new vec2(4.6, 4.6), new vec3(-4, 0.2, 0.6), ORDER.text)
    this.addText(gloss, DEMO_WORDS[this.language].chair, 9.4, 2.6, 36, LINGO_COLORS.ink, new vec3(2.6, 0.2, 0.6), ORDER.buttonText)
    this.addImage(gloss, CIRCLE_TEXTURE, new vec2(3.8, 3.8), new vec3(9.2, 0.2, 0.6), ORDER.text, new vec4(0.13, 0.62, 0.55, 1))
    this.addImage(gloss, VOLUME_TEXTURE, new vec2(2, 2), new vec3(9.2, 0.2, 1), ORDER.buttonText)
    // 10 — the four wrist chips, each labeled: book, music, language, night.
    const wrist = this.makeObject(root, "Demo Wrist", new vec3(0, DEMO_Y, 0.8))
    const chipXs = [-7.2, -2.4, 2.4, 7.2]
    const chipTints = [
      new vec4(1, 1, 1, 1),
      new vec4(1, 1, 1, 1),
      new vec4(1, 1, 1, 1),
      new vec4(0.22, 0.14, 0.43, 1),
    ]
    const chipIcons: Texture[] = [BOOK_TEXTURE, SOUND_TEXTURE, flagTexture(this.language), MOON_TEXTURE]
    const chipIconSizes = [2.9, 2.7, 2.7, 2.1]
    const chipLabels: LingoCopyKey[] = ["glossary", "tutorialChipMusic", "tutorialChipLang", "tutorialChipNight"]
    for (let i = 0; i < chipXs.length; i++) {
      this.addImage(wrist, CIRCLE_TEXTURE, new vec2(4.4, 4.4), new vec3(chipXs[i], 1.6, 0), ORDER.mascot, chipTints[i])
      this.addImage(wrist, chipIcons[i], new vec2(chipIconSizes[i], chipIconSizes[i]), new vec3(chipXs[i], 1.6, 0.6), ORDER.text)
      this.addText(wrist, lingoCopy(this.language, chipLabels[i]), 4.6, 1.6, 22, LINGO_COLORS.ink, new vec3(chipXs[i], -1.6, 0.6), ORDER.buttonText)
    }
    this.demoGroups = [welcome, lang, mode, scan, card, phrase, games, quiz, gloss, wrist]
    for (let i = 0; i < this.demoGroups.length; i++) this.demoGroups[i].enabled = false
  }

  private finish(): void {
    this.audio.playSaved()
    this.hide()
    this.onDone()
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
      if (visual.getTypeName() === "Component.Text") {
        // EVERY text ends above the button meshes (46) — same lesson as the
        // language picker: a label below its own pill is invisible on device.
        if (visual.getRenderOrder() < ORDER.buttonText) visual.setRenderOrder(ORDER.buttonText)
      } else if (visual.getRenderOrder() < ORDER.background) {
        visual.setRenderOrder(ORDER.buttonMesh)
      }
      if (visual instanceof RoundedRectangleVisual) visual.setRenderOrder(ORDER.buttonMesh)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) this.applyOrders(object.getChild(i))
  }

  private addImage(parent: SceneObject, texture: Texture, size: vec2, position: vec3, order: number, tint: vec4 = new vec4(1, 1, 1, 1)): void {
    const root = this.makeObject(parent, "Tutorial Image", position)
    const image = root.createComponent("Component.Image") as Image
    const material = IMAGE_MATERIAL_ASSET.clone() as Material
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = tint
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(order)
    root.getTransform().setLocalScale(new vec3(size.x, size.y, 1))
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, size: number, color: vec4, position: vec3, order: number = ORDER.text): Text {
    const root = this.makeObject(parent, "Tutorial Text", position)
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
    text.setRenderOrder(order)
    return text
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
