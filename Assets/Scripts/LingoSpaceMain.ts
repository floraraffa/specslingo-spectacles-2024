/** Experience state, semantic validation, AI scan pipeline, and voice coaching. */
import {LingoSpaceMenuUI} from "./LingoSpaceMenuUI"
import {CARD_IMAGES, LingoSpaceBoardUI} from "./LingoSpaceBoardUI"
import {LingoSpaceCompletionUI} from "./LingoSpaceCompletionUI"
import {LingoSpaceQuizUI, QuizCard} from "./LingoSpaceQuizUI"
import {GlossaryEntry, LingoSpaceGlossaryUI} from "./LingoSpaceGlossaryUI"
import {LingoSpaceLanguagePicker} from "./LingoSpaceLanguagePicker"
import {LingoFX} from "./LingoSpaceFX"
import {
  CategoryId,
  getAllWords,
  getReferenceCards,
  isLanguageId,
  LanguageId,
  LearningMode,
  ScanSituation,
  SituationPhrase,
  VocabularyCard,
} from "./LingoSpaceData"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {LingoSpaceAIService} from "./LingoSpaceAIService"
import {LingoSpaceCameraService, LingoSpaceCapture} from "./LingoSpaceCameraService"
import {lingoCopy} from "./LingoSpaceLocalization"
import {LingoSpaceProgressStore, PersistedVocabularyCard} from "./LingoSpaceProgressStore"
import {Headlock} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Headlock/Headlock"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {Button515 as Button} from "./compat515/Button515"
import {ElementContent515 as ElementContent} from "./compat515/ElementContent515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {styleLingoButton} from "./LingoSpaceTheme"

type PronunciationCopy = {
  correct: string
  retry: string
  tip: string
  correctSpoken: string
  retrySpoken: string
  tryAgainSpoken: string
}

type SavedScanCard = {
  card: VocabularyCard
  promptLabel: string
  visualDescription: string
  texture: Texture | null
  state: "PENDING" | "GENERATING" | "READY" | "FAILED"
  attempts: number
}

type ZoomTarget = {transform: Transform, basePosition: vec3}

@component
export class LingoSpaceMain extends BaseScriptComponent {
  @input @hint("Three-step setup UIKit module") menuUI!: LingoSpaceMenuUI
  @input @hint("Spatial organization UIKit module") boardUI!: LingoSpaceBoardUI
  @input @hint("Round completion UIKit module") completionUI!: LingoSpaceCompletionUI
  @input @hint("Show collider debug visuals") debugColliders: boolean = false
  @input @allowUndefined @hint("Optional background AudioTrack. Leave empty for silence; drag your own music here in the Inspector.") backgroundMusic?: AudioTrackAsset
  @input @hint("Background music volume from 0 (silent) to 1 (full volume). Recommended: 0.06.") backgroundMusicVolume: number = 0.06
  @input @hint("Keep the spatial board within the user's view using smooth head following.") followHead: boolean = true
  @input @hint("Distance of the spatial board from the user's head, in centimeters.") spatialDistance: number = 120
  @input @hint("Scale of the complete spatial UI. 0.92 keeps it inside the SPECS comfort area.") spatialScale: number = 0.92
  @input @hint("Head-follow smoothing. Lower values feel more spatial; higher values follow faster.") headFollowEasing: number = 0.18
  @input @hint("Degrees the user can look away before the UI begins to follow.") headFollowBufferDegrees: number = 4

  private nativeLanguage: LanguageId | null = null
  private targetLanguage: LanguageId | null = null
  private learningMode: LearningMode | null = null
  private cards: VocabularyCard[] = []
  private currentCard: VocabularyCard | null = null
  private currentTexture: Texture | null = null
  private cardIndex = 0
  private organized = 0
  private imageBatchIndex = 0
  private audioXp = 0
  private textXp = 0
  private practicedCardIds: string[] = []
  private readPhraseIds: string[] = []
  private scanInProgress = false
  /** Bumped on menu return and round start so a late AI response from a dead
   * scan can never mutate the new session or yank the panel off the head. */
  private scanSessionGeneration = 0
  /** Normalized label of the room the wearer scanned last: saved-cards practice
   * leads with THIS room's vocabulary, so review matches where they stand. */
  private lastScannedRoom: string | null = null
  private scanCards: VocabularyCard[] = []
  private scanCardIndex = 0
  private scanBatchIndex = 0
  private scanSituation: ScanSituation | null = null
  /** Phrases from every scan of the session, index-aligned with scanCards. */
  private scanPhrases: SituationPhrase[] = []
  private scanPhraseIndex = 0
  private savedScanCards: SavedScanCard[] = []
  private scanLibraries: {[languagePair: string]: SavedScanCard[]} = {}
  private hydratedScanLibraries: {[languagePair: string]: boolean} = {}
  private scanCardSerial = 0
  private artworkQueue: Promise<void> = Promise.resolve()
  private usingScannedLibrary = false
  private roundTotal = 6
  private counts: Record<CategoryId, number> = {HOME: 0, FOOD: 0, WORK: 0, TRAVEL: 0, PEOPLE: 0, OUTSIDE: 0}
  private audio!: LingoSpaceAudioController
  private ai!: LingoSpaceAIService
  private progress!: LingoSpaceProgressStore
  private quizUI!: LingoSpaceQuizUI
  private glossaryUI!: LingoSpaceGlossaryUI
  private languagePicker!: LingoSpaceLanguagePicker
  private fx!: LingoFX
  private quizActive = false
  private camera!: LingoSpaceCameraService
  private nextEvent: any
  private unlockDropEvent: any
  private voiceFinalizeEvent: any
  private voiceCleanupEvent: any
  private puzzleEvent: any
  private scanCaptureEvent: any
  private huntNextEvent: any
  private artRestoreEvent: any
  private voiceHoldWatchdog: any
  private voicePracticeStartedAt = 0
  /** Word Hunt: find-the-word game over the anchored spatial cards. */
  private huntActive = false
  private huntTargetIndex = -1
  private huntTargets: number[] = []
  private huntRoundsDone = 0
  /** Practice opened from a live scan: the quiz's MENU becomes BACK and
   * returns to the still-anchored scan session instead of the main menu. */
  private practiceFromScan = false
  private dropLocked = false
  private voicePracticeActive = false
  private pendingPuzzleIndex = 0
  private zoomTargets: ZoomTarget[] = []
  private distanceOffset = 0
  private spatialHeadlock: Headlock | null = null
  private spatialBillboard: Billboard | null = null
  private spatialManipulation: InteractableManipulation | null = null
  private spatialRecenterButton: Button | null = null
  private spatialMoveContent: ElementContent | null = null
  private spatialRecenterContent: ElementContent | null = null

  onAwake(): void {
    this.configureSpatialHeadFollow()
    this.buildSpatialGrabControls()
    this.camera = new LingoSpaceCameraService(this)
    this.progress = new LingoSpaceProgressStore()
    this.audio = new LingoSpaceAudioController(this.sceneObject)
    this.ai = new LingoSpaceAIService(this.sceneObject)
    // Background music dips while the AI voice talks, mirroring the mic ducking.
    this.ai.setSpeechHooks(() => this.audio.duckMusic(), () => this.audio.restoreMusic())
    this.glossaryUI = new LingoSpaceGlossaryUI(this.sceneObject, this, this.audio, () => this.glossaryEntries(), (word) => this.speakGlossaryWord(word), () => this.openLanguagePicker())
    this.languagePicker = new LingoSpaceLanguagePicker(this, this.audio, (language) => this.applyTargetLanguageChange(language))
    this.fx = new LingoFX(this)
    this.quizUI = new LingoSpaceQuizUI(this.sceneObject, this, this.audio)
    this.nextEvent = this.createEvent("DelayedCallbackEvent")
    this.nextEvent.bind(() => this.advanceAfterSave())
    this.unlockDropEvent = this.createEvent("DelayedCallbackEvent")
    this.unlockDropEvent.bind(() => this.dropLocked = false)
    this.voiceFinalizeEvent = this.createEvent("DelayedCallbackEvent")
    this.voiceFinalizeEvent.bind(() => this.ai.forceFinalizeListening())
    this.voiceCleanupEvent = this.createEvent("DelayedCallbackEvent")
    this.voiceCleanupEvent.bind(() => this.ai.cleanupListening())
    this.puzzleEvent = this.createEvent("DelayedCallbackEvent")
    this.puzzleEvent.bind(() => {
      if (this.learningMode === "SCAN" && !this.quizActive && !this.huntActive) this.boardUI.startScanPhrasePuzzle(this.pendingPuzzleIndex)
    })
    this.scanCaptureEvent = this.createEvent("DelayedCallbackEvent")
    this.scanCaptureEvent.bind(() => this.performScanCapture())
    this.huntNextEvent = this.createEvent("DelayedCallbackEvent")
    this.huntNextEvent.bind(() => {
      if (this.huntActive) this.nextHuntRound()
    })
    this.artRestoreEvent = this.createEvent("DelayedCallbackEvent")
    this.artRestoreEvent.bind(() => this.drainArtRestoreQueue())
    this.voiceHoldWatchdog = this.createEvent("DelayedCallbackEvent")
    this.voiceHoldWatchdog.bind(() => {
      // A hold this long means its release was lost: finalize like a release.
      if (this.voicePracticeActive) {
        print("[LINGO ASR] hold watchdog: finalizing lost release")
        this.finishVoicePractice()
      }
    })
    this.createEvent("OnStartEvent").bind(() => this.onStart())
  }

  private configureSpatialHeadFollow(): void {
    const scale = Math.max(0.75, Math.min(1.05, this.spatialScale))
    this.sceneObject.getTransform().setLocalScale(new vec3(scale, scale, scale))
    if (!this.followHead) return

    const easing = Math.max(0.05, Math.min(1, this.headFollowEasing))
    const buffer = Math.max(0, this.headFollowBufferDegrees)
    const headlock = this.sceneObject.createComponent(Headlock.getTypeName()) as Headlock
    this.spatialHeadlock = headlock
    headlock.distance = Math.max(85, this.spatialDistance)
    headlock.xzEasing = easing
    headlock.yEasing = easing
    headlock.translationBuffer = 1.5
    headlock.pitchEasing = easing
    headlock.yawEasing = easing
    headlock.pitchBufferDegrees = buffer
    headlock.yawBufferDegrees = buffer

    const billboard = this.sceneObject.createComponent(Billboard.getTypeName()) as Billboard
    this.spatialBillboard = billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(easing, easing, 1)
    billboard.axisBufferDegrees = new vec3(buffer, buffer, 0)
    headlock.snapToOffsetPosition()
    billboard.resetToLookAtCamera()
  }

  private buildSpatialGrabControls(): void {
    const moveRoot = global.scene.createSceneObject("Move Spatial Panel")
    moveRoot.setParent(this.sceneObject)
    moveRoot.getTransform().setLocalPosition(new vec3(-4.8, 33.1, 5))
    const moveButton = moveRoot.createComponent(Button.getTypeName()) as Button
    moveButton.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(moveButton, "primary")
    moveButton.size = new vec3(11.5, 4, 1)
    moveButton.onInitialized.add(() => {
      moveButton.size = new vec3(11.5, 4, 1)
      this.marshmallow(moveButton)
    })
    const moveContent = moveRoot.createComponent(ElementContent.getTypeName()) as ElementContent
    moveContent.text = `✦  ${lingoCopy("English", "spatialMove")}`
    moveContent.textSize = 36
    moveContent.contentAlignment = "center"
    this.spatialMoveContent = moveContent

    const manipulation = moveRoot.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setManipulateRoot(this.sceneObject.getTransform())
    manipulation.setCanTranslate(true)
    manipulation.setCanRotate(true)
    manipulation.setCanScale(true)
    manipulation.minimumScaleFactor = 0.72
    manipulation.maximumScaleFactor = 1.18
    this.spatialManipulation = manipulation

    const recenterRoot = global.scene.createSceneObject("Follow Me Again")
    recenterRoot.setParent(this.sceneObject)
    recenterRoot.getTransform().setLocalPosition(new vec3(6.8, 33.1, 5))
    const recenterButton = recenterRoot.createComponent(Button.getTypeName()) as Button
    recenterButton.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
    styleLingoButton(recenterButton, "neutral")
    recenterButton.size = new vec3(9.5, 4, 1)
    recenterButton.onInitialized.add(() => {
      recenterButton.size = new vec3(9.5, 4, 1)
      this.marshmallow(recenterButton)
    })
    const recenterContent = recenterRoot.createComponent(ElementContent.getTypeName()) as ElementContent
    recenterContent.text = `↺  ${lingoCopy("English", "spatialFollow")}`
    recenterContent.textSize = 34
    recenterContent.contentAlignment = "center"
    this.spatialRecenterContent = recenterContent
    this.spatialRecenterButton = recenterButton

    // MOVER/SEGUIR must never vanish behind a container: HUD backgrounds draw
    // at order 6-8 and their content up to 18, so the grab handles get 26-28.
    // SIK buttons build their visuals a few frames late — re-apply on delays.
    const orderDelays = [0.4, 1.4, 3.0]
    for (let i = 0; i < orderDelays.length; i++) {
      const delayed = this.createEvent("DelayedCallbackEvent")
      delayed.bind(() => {
        if (!isNull(moveRoot)) this.raiseGrabControlOrders(moveRoot)
        if (!isNull(recenterRoot)) this.raiseGrabControlOrders(recenterRoot)
      })
      delayed.reset(orderDelays[i])
    }
  }

  /** Puts every visual of a grab handle above the HUD containers. */
  private raiseGrabControlOrders(object: SceneObject): void {
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      const typeName = visual.getTypeName()
      if (typeName === "Component.Text") visual.setRenderOrder(28)
      else if (typeName === "Component.Image") visual.setRenderOrder(27)
      else visual.setRenderOrder(26)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) this.raiseGrabControlOrders(object.getChild(i))
  }

  private onStart(): void {
    if (!this.menuUI || !this.boardUI || !this.completionUI) {
      console.error("LINGO SPACE: UI module references are not wired")
      return
    }
    this.spatialManipulation?.onManipulationStart.add(() => this.detachPanelFromHead())
    this.spatialRecenterButton?.onTriggerUp.add(() => this.recenterPanel())
    this.audio.initializeForSpecs(this.backgroundMusic, this.backgroundMusicVolume)
    this.ai.initialize()
    const profile = this.progress.getProfile()
    this.nativeLanguage = profile.nativeLanguage
    this.targetLanguage = profile.targetLanguage
    if (this.nativeLanguage && this.spatialMoveContent) this.spatialMoveContent.text = `✦  ${lingoCopy(this.nativeLanguage, "spatialMove")}`
    if (this.nativeLanguage && this.spatialRecenterContent) this.spatialRecenterContent.text = `↺  ${lingoCopy(this.nativeLanguage, "spatialFollow")}`
    this.audioXp = profile.audioXp
    this.textXp = profile.textXp
    this.menuUI.setUserName(profile.userName || "Learner")
    this.menuUI.restoreSelection(this.nativeLanguage, this.targetLanguage)
    this.resolveUserName()
    this.menuUI.onNativeLanguageSelected.add((value) => {
      if (isLanguageId(value)) {
        this.nativeLanguage = value
        if (this.spatialMoveContent) this.spatialMoveContent.text = `✦  ${lingoCopy(value, "spatialMove")}`
        if (this.spatialRecenterContent) this.spatialRecenterContent.text = `↺  ${lingoCopy(value, "spatialFollow")}`
        this.targetLanguage = null
        this.learningMode = null
        this.progress.setLanguages(this.nativeLanguage, null)
      }
      this.audio.playClick()
    })
    this.menuUI.onTargetLanguageSelected.add((value) => {
      if (isLanguageId(value)) {
        this.targetLanguage = value
        this.progress.setLanguages(this.nativeLanguage, this.targetLanguage)
        this.activateSavedLibrary()
      }
      this.audio.playClick()
    })
    this.menuUI.onModeSelected.add((value) => {
      if (value === "IMAGE" || value === "SCAN") this.learningMode = value
      this.audio.playClick()
    })
    this.menuUI.onStart.add(() => {
      this.imageBatchIndex = 0
      this.startRound()
    })
    this.boardUI.onCardDropped.add((category) => this.handleDrop(category as CategoryId))
    this.boardUI.onScanRequested.add(() => this.scanObject())
    this.boardUI.onListenRequested.add(() => this.listenToCurrentWord())
    this.boardUI.onVoiceHoldStart.add(() => this.startVoicePractice())
    this.boardUI.onVoiceHoldEnd.add(() => this.finishVoicePractice())
    this.boardUI.onScanCardSelected.add((index) => {
      if (this.huntActive) {
        this.handleHuntPick(index)
        return
      }
      this.selectScanCard(index)
    })
    this.boardUI.onScanPhraseSelected.add((index) => {
      if (this.huntActive) return
      this.selectScanPhrase(index)
    })
    this.boardUI.onPracticeSavedCards.add(() => this.startSavedCardsPractice())
    this.boardUI.onHuntRequested.add(() => this.startWordHunt())
    this.boardUI.onLanguagePickRequested.add(() => this.openLanguagePicker())
    this.quizUI.onLanguagePickRequested.add(() => this.openLanguagePicker())
    this.boardUI.onReturnToMenu.add(() => this.returnToModeSelection())
    this.boardUI.onZoomRequested.add((direction) => this.applyDistanceZoom(direction))
    this.boardUI.onScanPhraseSolved.add((index) => this.handlePhraseSolved(index))
    this.quizUI.onListenRequested.add(() => this.listenToCurrentWord())
    this.quizUI.onVoiceHoldStart.add(() => this.startVoicePractice())
    this.quizUI.onVoiceHoldEnd.add(() => this.finishVoicePractice())
    this.quizUI.onAnswerResult.add((correct) => this.handleQuizAnswer(correct))
    this.quizUI.onWordCompleted.add(() => this.handleQuizWordDone())
    this.quizUI.onRoundCompleted.add(() => this.completeQuizRound())
    this.quizUI.onReturnToMenu.add(() => {
      if (this.practiceFromScan) this.resumeScanSession()
      else this.returnToModeSelection()
    })
    this.quizUI.onPhraseSolved.add(() => this.handleQuizPhraseSolved())
    this.completionUI.onNextRound.add(() => {
      if (this.usingScannedLibrary) {
        this.startSavedCardsPractice()
        return
      }
      if (this.learningMode === "IMAGE" && !this.usingScannedLibrary) this.imageBatchIndex += 1
      this.startRound()
    })
    this.completionUI.onChangeLanguage.add(() => this.changeSetup())
    global.deviceInfoSystem.onInternetStatusChanged.add((args) => this.boardUI.setInternetAvailable(args.isInternetAvailable))
    this.boardUI.setInternetAvailable(global.deviceInfoSystem.isInternetAvailable())
    this.boardUI.hide()
    this.completionUI.hide()
    this.menuUI.show()
    this.captureZoomTargets()
    this.setColliderDebugAll(this.sceneObject, this.debugColliders)
    console.log("LINGO SPACE ready: native → target → mode")
  }

  /** Full pill corners: the marshmallow look for the panel grab handles. */
  private marshmallow(button: Button): void {
    const visual = button.visual as RoundedRectangleVisual
    if (visual instanceof RoundedRectangleVisual) visual.cornerRadius = 2
  }

  private detachPanelFromHead(): void {
    if (this.spatialHeadlock) this.spatialHeadlock.enabled = false
    if (this.spatialBillboard) this.spatialBillboard.enabled = false
    print("LINGO SPACE panel anchored in the room")
  }

  private recenterPanel(): void {
    if (!this.spatialHeadlock || !this.spatialBillboard) return
    this.spatialHeadlock.enabled = true
    this.spatialBillboard.enabled = true
    this.spatialHeadlock.snapToOffsetPosition()
    this.spatialBillboard.resetToLookAtCamera()
    this.audio.playClick()
    print("LINGO SPACE panel is following the user again")
  }

  private startRound(): void {
    if (!this.nativeLanguage || !this.targetLanguage || !this.learningMode) return
    this.scanSessionGeneration += 1
    this.cancelWordHunt()
    this.practiceFromScan = false
    this.languagePicker.hide()
    this.activateSavedLibrary()
    this.audio.playClick()
    this.cards = this.learningMode === "IMAGE" ? getReferenceCards(this.targetLanguage, this.nativeLanguage, this.imageBatchIndex) : []
    if (this.learningMode === "IMAGE") {
      // Scanned words join every quiz round: what the wearer discovered in the
      // world is exactly what they should keep practicing.
      const pendingArtwork: SavedScanCard[] = []
      for (let i = 0; i < this.savedScanCards.length; i++) {
        const entry = this.savedScanCards[i]
        // Unify by WORD, not id: the same object scanned twice must appear once.
        const word = entry.card.word.trim().toLowerCase()
        if (this.cards.some((card) => card.id === entry.card.id || card.word.trim().toLowerCase() === word)) continue
        this.cards.push(entry.card)
        if (entry.state === "PENDING" || (entry.state === "FAILED" && entry.attempts < 3)) pendingArtwork.push(entry)
      }
      if (pendingArtwork.length > 0 && global.deviceInfoSystem.isInternetAvailable()) this.queueArtworkGeneration(pendingArtwork)
    }
    this.usingScannedLibrary = false
    this.roundTotal = this.cards.length > 0 ? this.cards.length : 6
    this.cardIndex = 0
    this.organized = 0
    this.dropLocked = false
    this.scanInProgress = false
    this.currentCard = null
    this.currentTexture = null
    this.practicedCardIds = []
    this.readPhraseIds = []
    this.scanCards = []
    this.scanCardIndex = 0
    this.scanBatchIndex = 0
    this.scanSituation = null
    this.scanPhrases = []
    this.scanPhraseIndex = 0
    this.counts = {HOME: 0, FOOD: 0, WORK: 0, TRAVEL: 0, PEOPLE: 0, OUTSIDE: 0}
    this.progress.beginSession(this.nativeLanguage, this.targetLanguage, this.learningMode)
    this.menuUI.hide()
    this.completionUI.hide()
    this.glossaryUI.setLanguage(this.nativeLanguage)
    this.glossaryUI.setTargetLanguage(this.targetLanguage)
    this.glossaryUI.show()
    if (this.learningMode === "SCAN") {
      this.quizActive = false
      this.quizUI.hide()
      this.boardUI.startRound(this.nativeLanguage, this.targetLanguage, this.learningMode)
      this.boardUI.setXp(this.audioXp, this.textXp)
      this.prepareScanner()
    } else {
      this.startQuizRound(this.cards)
    }
    console.log(`LINGO SPACE round started: native=${this.nativeLanguage}, target=${this.targetLanguage}, mode=${this.learningMode}`)
  }

  /** The IMAGE practice is a two-phase quiz: recognize the picture, then pronounce the word. */
  private startQuizRound(cards: VocabularyCard[]): void {
    this.quizActive = true
    this.boardUI.hide()
    const quizCards: QuizCard[] = cards.map((card) => {
      const saved = this.savedScanCards.find((entry) => entry.card.id === card.id)
      return {card, texture: saved?.texture || CARD_IMAGES[card.imageKey] || null, phonetic: card.phonetic || ""}
    })
    this.quizUI.startRound(quizCards, getAllWords(this.targetLanguage!), this.nativeLanguage!, this.targetLanguage!)
    this.quizUI.setXp(this.audioXp, this.textXp)
  }

  private handleQuizAnswer(correct: boolean): void {
    const entry = this.quizUI.currentCard()
    if (!entry) return
    this.currentCard = entry.card
    if (!correct) return
    this.textXp += 5
    this.progress.recordCard(entry.card, this.nativeLanguage!, this.targetLanguage!, {practice: "TEXT"})
    this.progress.recordXp(this.audioXp, this.textXp)
    this.updateXpDisplays(`+5 ${lingoCopy(this.nativeLanguage, "textXp")}`)
  }

  private handleQuizWordDone(): void {
    const entry = this.quizUI.currentCard()
    if (entry) {
      const category = entry.card.contexts[0]
      if (category) this.counts[category] += 1
    }
    this.organized += 1
  }

  private completeQuizRound(): void {
    this.quizActive = false
    this.quizUI.hide()
    this.currentCard = null
    this.completionUI.showSummary(this.counts, this.audioXp, this.textXp, this.nativeLanguage!)
    this.fx.popIn(this.completionUI.sceneObject, {rotateDegrees: -8})
    this.progress.completeSession()
    console.log("LINGO SPACE quiz round complete")
  }

  private handleQuizPhraseSolved(): void {
    this.textXp += 4
    this.progress.recordXp(this.audioXp, this.textXp)
    this.updateXpDisplays(`+4 ${lingoCopy(this.nativeLanguage, "textXp")}`)
    const card = this.quizUI.currentCard()?.card
    if (card?.phrase) {
      this.ai.setSpeechAnchor(null)
      this.ai.speak(card.phrase, `Pronounce this ${this.targetLanguage} sentence clearly once, at a natural beginner-friendly pace.`)
        .catch((error) => console.error(`LINGO SPACE phrase TTS error: ${error}`))
    }
  }

  private handlePhraseSolved(index: number): void {
    this.textXp += 4
    this.progress.recordXp(this.audioXp, this.textXp)
    this.updateXpDisplays(`+4 ${lingoCopy(this.nativeLanguage, "textXp")}`)
    this.audio.playSaved()
    this.voiceStatus(lingoCopy(this.nativeLanguage, "phraseSolved"))
    const phrase = this.scanPhrases[index]
    if (phrase) {
      this.anchorSpeechToScanCard(index)
      this.ai.speak(phrase.target, `Pronounce this ${this.targetLanguage} sentence clearly once, at a natural beginner-friendly pace.`)
        .catch((error) => console.error(`LINGO SPACE phrase TTS error: ${error}`))
    }
  }

  private voiceStatus(message: string): void {
    if (this.quizActive) this.quizUI.showVoiceStatus(message)
    else this.boardUI.showVoiceStatus(message)
  }

  private updateXpDisplays(earned: string = ""): void {
    this.boardUI.setXp(this.audioXp, this.textXp, earned)
    if (this.quizActive) this.quizUI.setXp(this.audioXp, this.textXp, earned)
  }

  private prepareScanner(): void {
    this.currentCard = null
    this.currentTexture = null
    this.scanCards = []
    this.scanCardIndex = 0
    this.scanSituation = null
    this.scanPhrases = []
    this.scanPhraseIndex = 0
    this.scanInProgress = false
    this.boardUI.clearScanCandidates()
    this.voiceStatus(lingoCopy(this.nativeLanguage, "scanPrompt"))
    // Spoken onboarding in the learner's native language: what to do, and to
    // hold still when scanning so placement comes out right.
    if (global.deviceInfoSystem.isInternetAvailable()) {
      this.ai.setSpeechAnchor(null)
      this.ai.speak(
        `${lingoCopy(this.nativeLanguage, "scanPrompt")} ${lingoCopy(this.nativeLanguage, "holdStill")}`,
        `Speak this ${this.nativeLanguage} guidance warmly, briefly and exactly as written. Do not translate or add anything.`,
      ).catch((error) => console.error(`LINGO SPACE scan intro TTS error: ${error}`))
    }
    if (global.deviceInfoSystem.isEditor()) {
      // Preview captures from a live stream, so warm it while the scanner opens.
      this.camera.ensureStarted()
        .then((texture) => this.boardUI.showScanner(texture))
        .catch((error) => {
          console.error(`LINGO SPACE camera error: ${error}`)
          this.boardUI.showScanFailure(lingoCopy(this.nativeLanguage, "cameraUnavailable"))
        })
    } else {
      // On Spectacles NEVER hold a live camera stream: it owns the sensitive-
      // sensor pipeline and mutes the ASR microphone. Stills are captured on demand.
      this.boardUI.showScanner(null)
    }
  }

  private scanObject(): void {
    if (this.learningMode !== "SCAN" || this.scanInProgress) return
    if (!global.deviceInfoSystem.isInternetAvailable()) {
      this.boardUI.showScanFailure(lingoCopy(this.nativeLanguage, "internetScan"))
      return
    }
    if (!this.nativeLanguage || !this.targetLanguage) return
    this.cancelWordHunt()
    this.scanInProgress = true
    this.audio.playClick()
    // A hold-still beat before the shot: the wearer settles, the photo is sharp
    // and the capture pose matches a steady head.
    this.boardUI.showScanHoldStill()
    this.scanCaptureEvent.reset(1.3)
  }

  private performScanCapture(): void {
    if (this.learningMode !== "SCAN" || !this.scanInProgress) return
    const generation = this.scanSessionGeneration
    this.boardUI.showScanning()
    this.camera.capture()
      .then((capture) => this.identifyCapture(capture, generation))
      .catch((error) => {
        if (generation !== this.scanSessionGeneration) return
        this.scanInProgress = false
        console.error(`LINGO SPACE scan error: ${error}`)
        this.boardUI.showScanFailure(lingoCopy(this.nativeLanguage, "scanFailed"))
      })
  }

  private identifyCapture(capture: LingoSpaceCapture, generation: number): Promise<void> {
    if (!this.nativeLanguage || !this.targetLanguage) {
      this.scanInProgress = false
      return Promise.resolve()
    }
    return this.ai.identifySituation(
      capture.base64Jpeg,
      this.nativeLanguage,
      this.targetLanguage,
      this.scanCards.map((card) => card.word).slice(0, 30),
    )
      .then((rawResult) => {
        if (generation !== this.scanSessionGeneration) return
        this.scanInProgress = false
        this.currentTexture = capture.texture
        this.scanBatchIndex += 1
        const scanTimestamp = new Date().getTime()
        // Dedupe is ENVIRONMENT-aware: a word only counts as "already scanned"
        // when its session card is anchored near where the wearer stands NOW.
        // Walking to another room and scanning always yields fresh cards there,
        // while re-scanning the same spot never stacks duplicates on one object.
        // Aspect first: the geometric dedupe below projects calibrated rays.
        try {
          this.boardUI.setScanCaptureAspect(capture.texture.getWidth() / capture.texture.getHeight())
        } catch (error) {
          console.error(`LINGO SPACE capture aspect error: ${error}`)
        }
        // Word-blind guard: when a fresh detection's center ray passes right
        // through an existing card's anchor, it IS that object — no matter what
        // the AI decided to call it this time.
        const RAY_HIT_CM = 30
        const pointsAtExistingAnchor = (bounds: {x: number, y: number, width: number, height: number}): boolean => {
          const center = new vec2(
            Math.max(0.02, Math.min(0.98, bounds.x + bounds.width * 0.5)),
            Math.max(0.02, Math.min(0.98, bounds.y + bounds.height * 0.5)),
          )
          const ray = this.boardUI.projectScanRay(center, capture.deviceWorldTransform)
          if (!ray) return false
          const direction = ray.end.sub(ray.start).normalize()
          for (let i = 0; i < this.scanCards.length; i++) {
            const anchor = this.boardUI.scanCardAnchor(i)
            if (!anchor) continue
            const toAnchor = anchor.sub(ray.start)
            const along = toAnchor.dot(direction)
            if (along < 40 || along > 600) continue
            const perpendicular = toAnchor.sub(direction.uniformScale(along)).length
            if (perpendicular <= RAY_HIT_CM) return true
          }
          return false
        }
        // The model sometimes returns the same object twice in one response;
        // heavily-overlapping boxes are one object, whatever the two names say.
        const boundsOverlap = (a: {x: number, y: number, width: number, height: number}, b: {x: number, y: number, width: number, height: number}): number => {
          const x1 = Math.max(a.x, b.x)
          const y1 = Math.max(a.y, b.y)
          const x2 = Math.min(a.x + a.width, b.x + b.width)
          const y2 = Math.min(a.y + a.height, b.y + b.height)
          const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
          const smaller = Math.max(0.000001, Math.min(a.width * a.height, b.width * b.height))
          return intersection / smaller
        }
        const currentRoom = rawResult.situationTranslation.trim().toLowerCase()
        const roomLabelNow = rawResult.situationTranslation.trim()
        const keptPositions: number[] = []
        const keptBounds: {x: number, y: number, width: number, height: number}[] = []
        const objects = rawResult.objects.filter((object, position) => {
          // ONE card per word per session: re-detecting a known word MOVES its
          // existing card onto this fresh sighting (also healing a bad anchor)
          // instead of ever growing a twin.
          for (let i = 0; i < this.scanCards.length; i++) {
            if (!this.sameScanWord(this.scanCards[i].word, object.word)) continue
            this.scanCards[i].room = roomLabelNow || this.scanCards[i].room
            this.boardUI.reanchorScanCard(i, object.bounds, capture.deviceWorldTransform, object.distanceMeters * 100)
            return false
          }
          if (pointsAtExistingAnchor(object.bounds)) return false
          for (let k = 0; k < keptBounds.length; k++) {
            if (boundsOverlap(keptBounds[k], object.bounds) > 0.55) return false
          }
          keptPositions.push(position)
          keptBounds.push(object.bounds)
          return true
        })
        const phrases = rawResult.phrases
          .filter((phrase) => keptPositions.indexOf(phrase.objectIndex) >= 0)
          .map((phrase, localIndex) => ({...phrase, objectIndex: localIndex}))
        const result: ScanSituation = {...rawResult, objects, phrases}
        this.scanSituation = result
        console.log(`LINGO SPACE dedupe: ${rawResult.objects.length - objects.length} same-room repeated object(s) skipped near "${result.situationTranslation}"`)
        // Scans ACCUMULATE within a session: each room's cards stay anchored
        // where they were captured while new rooms add theirs on top.
        const baseIndex = this.scanCards.length
        const roomLabel = result.situationTranslation.trim()
        const newCards: VocabularyCard[] = result.objects.map((resultCard, index) => ({
          id: `scan-${this.targetLanguage}-${scanTimestamp}-${++this.scanCardSerial}-${index}-${resultCard.objectName}`,
          imageKey: "scan",
          word: resultCard.word,
          translation: resultCard.translation,
          phonetic: resultCard.phonetic || "",
          phrase: result.phrases[index]?.target,
          phraseTranslation: result.phrases[index]?.translation,
          phrasePhonetic: result.phrases[index]?.pronunciationHint,
          room: roomLabel || undefined,
          contexts: resultCard.contexts,
          source: "SCAN",
        }))
        this.scanCards = this.scanCards.concat(newCards)
        this.scanPhrases = this.scanPhrases.concat(result.phrases.map((phrase) => ({...phrase, objectIndex: baseIndex + phrase.objectIndex})))
        const newEntries = newCards.map((card, index): SavedScanCard => ({
          card,
          promptLabel: result.objects[index].objectName,
          visualDescription: result.objects[index].visualDescription,
          texture: null,
          state: "PENDING",
          attempts: 0,
        }))
        for (let i = 0; i < newEntries.length; i++) {
          const entry = newEntries[i]
          this.savedScanCards.push(entry)
          this.progress.recordCard(entry.card, this.nativeLanguage!, this.targetLanguage!, {
            promptLabel: entry.promptLabel,
            visualDescription: entry.visualDescription,
            practice: "SCAN",
          })
        }
        try {
          this.boardUI.showSituation(result, capture.texture, this.savedScanCards.length, this.readyScanCardCount(), capture.deviceWorldTransform, baseIndex > 0)
          // Once cards land on real objects the HUD must stop chasing the wearer:
          // anchored, it never blocks the view of the cards. SEGUIR re-attaches it.
          this.detachPanelFromHead()
          if (newCards.length > 0) {
            this.selectScanCard(baseIndex)
            this.selectScanPhrase(baseIndex, false)
            // Room-aware review: this place already holds vocabulary from earlier
            // sessions — invite the learner to practice it right here. Count
            // unique WORDS not yet floating in this session (repeat scans of the
            // same room across days record several entries per word).
            const sessionWordKeys = this.scanCards.map((card) => card.word.trim().toLowerCase())
            const reviewWords: string[] = []
            for (let i = 0; i < this.savedScanCards.length; i++) {
              const entry = this.savedScanCards[i]
              const entryRoom = (entry.card.room || "").trim().toLowerCase()
              if (!entryRoom || entryRoom !== currentRoom) continue
              const wordKey = entry.card.word.trim().toLowerCase()
              if (sessionWordKeys.indexOf(wordKey) >= 0 || reviewWords.indexOf(wordKey) >= 0) continue
              reviewWords.push(wordKey)
            }
            const reviewCount = reviewWords.length
            if (reviewCount > 0) {
              this.voiceStatus(lingoCopy(this.nativeLanguage!, "roomReview")
                .replace("{count}", String(reviewCount))
                .replace("{room}", roomLabel))
            }
          } else {
            // A fully-deduped scan must NOT jump to a stale card from another
            // room ("scanned the bathroom, got the bed"): explain instead.
            this.voiceStatus(lingoCopy(this.nativeLanguage!, "nothingNew"))
          }
          this.lastScannedRoom = currentRoom || null
          this.queueArtworkGeneration(newEntries)
          console.log(`LINGO SPACE situational scan [${result.situation} / ${result.situationTranslation}]: +${newCards.length} objects (${this.scanCards.length} total this session), ${result.phrases.length} phrases created`)
        } catch (error) {
          console.error(`LINGO SPACE scan presentation error: ${error}`)
          // The cards are already saved; stop the scanning animation and hand
          // the wearer the standard scan-again affordance instead of a frozen HUD.
          this.boardUI.showScanFailure(lingoCopy(this.nativeLanguage!, "scanFailed"))
        }
      })
  }

  /** "televisión", "televisor" and "la tele" are the same object to the
   * dedupe: the AI's word choice drifts between scans, exact equality doesn't. */
  private sameScanWord(a: string, b: string): boolean {
    const left = a.trim().toLowerCase()
    const right = b.trim().toLowerCase()
    if (!left || !right) return false
    if (left === right) return true
    if (left.length >= 4 && right.length >= 4 && (left.indexOf(right) === 0 || right.indexOf(left) === 0)) return true
    return this.ai.similarityScore(left, right) >= 80
  }

  private selectScanCard(index: number): void {
    if (this.learningMode !== "SCAN" || !this.scanSituation || this.scanCards.length === 0) return
    const selected = Math.max(0, Math.min(index, this.scanCards.length - 1))
    this.scanCardIndex = selected
    this.boardUI.selectScanObject(selected)
    console.log(`LINGO SPACE selected detected object ${selected + 1}/${this.scanCards.length}: ${this.scanCards[selected].word}`)
  }

  private selectScanPhrase(index: number, awardXp: boolean = true): void {
    if (this.learningMode !== "SCAN" || !this.scanSituation || this.scanPhrases.length === 0) return
    this.scanPhraseIndex = Math.max(0, Math.min(index, this.scanPhrases.length - 1))
    this.boardUI.selectScanPhrase(this.scanPhraseIndex)
    const phraseId = this.scanCards[this.scanPhraseIndex]?.id || `${this.scanPhraseIndex}`
    if (awardXp && this.readPhraseIds.indexOf(phraseId) < 0) {
      this.readPhraseIds.push(phraseId)
      this.textXp += 3
      this.progress.recordXp(this.audioXp, this.textXp)
      this.boardUI.setXp(this.audioXp, this.textXp, `+3 ${lingoCopy(this.nativeLanguage, "textXp")}`)
    }
    this.voiceStatus(lingoCopy(this.nativeLanguage, "listenPhrase"))
  }

  /** Word Hunt: Cloudy names an anchored word; the wearer must find its card
   * in the room and tap it. Three rounds, +5 audio XP per find. */
  private startWordHunt(): void {
    if (this.learningMode !== "SCAN" || this.quizActive || this.scanInProgress) return
    if (!this.nativeLanguage || !this.targetLanguage || !this.scanSituation) {
      this.voiceStatus(lingoCopy(this.nativeLanguage, "scanPrompt"))
      return
    }
    if (this.scanCards.length < 3) {
      // A hunt among one or two cards is no hunt: ask for more of the room first.
      this.voiceStatus(lingoCopy(this.nativeLanguage, "scanPrompt"))
      return
    }
    this.audio.playClick()
    // A puzzle earned just before the hunt must not pop over it.
    this.puzzleEvent.cancel()
    this.huntActive = true
    this.huntRoundsDone = 0
    this.huntTargetIndex = -1
    this.huntTargets = this.planHuntTargets()
    this.nextHuntRound()
  }

  /** Three DIFFERENT words per hunt, spread across different rooms when the
   * session has them — finding words in another room is the walk that makes
   * the game spatial. */
  private planHuntTargets(): number[] {
    const pool: number[] = []
    for (let i = 0; i < this.scanCards.length; i++) pool.push(i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const swap = pool[i]
      pool[i] = pool[j]
      pool[j] = swap
    }
    const targets: number[] = []
    const usedRooms: string[] = []
    for (let pass = 0; pass < 2 && targets.length < 3; pass++) {
      for (let i = 0; i < pool.length && targets.length < 3; i++) {
        const index = pool[i]
        if (targets.indexOf(index) >= 0) continue
        const room = (this.scanCards[index].room || "").trim().toLowerCase()
        if (pass === 0 && room && usedRooms.indexOf(room) >= 0) continue
        targets.push(index)
        if (room) usedRooms.push(room)
      }
    }
    return targets
  }

  private nextHuntRound(): void {
    if (!this.huntActive) return
    const target = this.huntTargets[this.huntRoundsDone]
    if (target === undefined || !this.scanCards[target]) {
      this.cancelWordHunt()
      return
    }
    this.huntTargetIndex = target
    // The prompt rides the wearer; finding the card is the game.
    this.nextHuntRoundRepeat()
  }

  /** Re-asks the current hunt question without moving to a new target. */
  private nextHuntRoundRepeat(): void {
    if (!this.huntActive || this.huntTargetIndex < 0 || !this.scanCards[this.huntTargetIndex]) return
    const word = this.scanCards[this.huntTargetIndex].word
    const prompt = lingoCopy(this.nativeLanguage, "huntPrompt").replace("{word}", word)
    this.voiceStatus(prompt)
    if (global.deviceInfoSystem.isInternetAvailable()) {
      this.ai.setSpeechAnchor(null)
      this.ai.speak(prompt, `Speak this ${this.nativeLanguage} question playfully; pronounce "${word}" clearly in ${this.targetLanguage}. Do not add anything.`)
        .catch((error) => console.error(`LINGO SPACE hunt TTS error: ${error}`))
    }
  }

  private handleHuntPick(index: number): void {
    if (!this.huntActive) return
    // Between rounds (target cleared, next question pending) taps only click.
    if (this.huntTargetIndex < 0) {
      this.audio.playClick()
      return
    }
    if (index !== this.huntTargetIndex) {
      this.audio.playSoftReturn()
      this.boardUI.showPronunciationResult(false, lingoCopy(this.nativeLanguage, "huntTryAgain"))
      return
    }
    // Clear the target so a double-tap on the found card can't double-score,
    // and adopt it as the selection so a follow-up LISTEN speaks THIS card.
    this.huntTargetIndex = -1
    this.scanCardIndex = index
    this.audio.playSaved()
    this.audioXp += 5
    this.progress.recordXp(this.audioXp, this.textXp)
    this.updateXpDisplays(`+5 ${lingoCopy(this.nativeLanguage, "audioXp")}`)
    this.huntRoundsDone += 1
    if (this.huntRoundsDone >= this.huntTargets.length) {
      this.huntActive = false
      this.huntNextEvent.cancel()
      this.boardUI.showPronunciationResult(true, lingoCopy(this.nativeLanguage, "huntComplete"))
      return
    }
    this.boardUI.showPronunciationResult(true, lingoCopy(this.nativeLanguage, "huntFound"))
    this.huntNextEvent.reset(1.2)
  }

  private cancelWordHunt(): void {
    if (!this.huntActive) return
    this.huntActive = false
    this.huntNextEvent.cancel()
  }

  private startSavedCardsPractice(): void {
    if (!this.nativeLanguage || !this.targetLanguage) return
    this.activateSavedLibrary()
    const pendingEntries = this.savedScanCards.filter((entry) => entry.state === "PENDING" || (entry.state === "FAILED" && entry.attempts < 3))
    if (pendingEntries.length > 0 && global.deviceInfoSystem.isInternetAvailable()) this.queueArtworkGeneration(pendingEntries)
    const readyEntries = this.savedScanCards.filter((entry) => entry.state === "READY" && !!entry.texture)
    const persistedCards = this.progress.getCards(this.nativeLanguage, this.targetLanguage)
    const referenceCards = persistedCards.filter((entry) => entry.source === "REFERENCE").map((entry) => this.asVocabularyCard(entry))
    const availableCards: VocabularyCard[] = []
    const seen: string[] = []
    for (let i = 0; i < referenceCards.length; i++) {
      availableCards.push(referenceCards[i])
      seen.push(referenceCards[i].id)
    }
    // Scanning the same word in several rooms yields several entries: the
    // practice quiz shows each WORD once, so dedupe by word as well as id.
    const seenWords = availableCards.map((card) => card.word.trim().toLowerCase())
    for (let i = 0; i < readyEntries.length; i++) {
      const wordKey = readyEntries[i].card.word.trim().toLowerCase()
      if (seen.indexOf(readyEntries[i].card.id) >= 0 || seenWords.indexOf(wordKey) >= 0) continue
      availableCards.push(readyEntries[i].card)
      seen.push(readyEntries[i].card.id)
      seenWords.push(wordKey)
    }
    if (availableCards.length === 0) {
      this.voiceStatus(`${lingoCopy(this.nativeLanguage, "savedCards")}. ${lingoCopy(this.nativeLanguage, "illustrationsReady")}…`)
      return
    }
    // Only a practice that actually starts may kill a running hunt: an empty
    // library above bounced back to the hunt still asking its question.
    this.cancelWordHunt()
    // Launched from a live scan (or re-launched from its completion screen):
    // the anchored cards stay hidden underneath, BACK restores them.
    this.practiceFromScan = (this.learningMode === "SCAN" && !!this.scanSituation) || this.practiceFromScan
    // Room-aware review: vocabulary from the room the wearer just scanned goes
    // first, so practice starts with the objects actually around them.
    if (this.lastScannedRoom) {
      const room = this.lastScannedRoom
      const inRoom = availableCards.filter((card) => (card.room || "").trim().toLowerCase() === room)
      const elsewhere = availableCards.filter((card) => (card.room || "").trim().toLowerCase() !== room)
      availableCards.length = 0
      availableCards.push(...inRoom, ...elsewhere)
    }
    this.audio.playClick()
    this.learningMode = "IMAGE"
    this.usingScannedLibrary = true
    this.cards = availableCards
    this.roundTotal = this.cards.length
    this.cardIndex = 0
    this.organized = 0
    this.dropLocked = false
    this.currentCard = null
    this.currentTexture = null
    this.practicedCardIds = []
    this.counts = {HOME: 0, FOOD: 0, WORK: 0, TRAVEL: 0, PEOPLE: 0, OUTSIDE: 0}
    this.progress.beginSession(this.nativeLanguage, this.targetLanguage, "IMAGE")
    this.menuUI.hide()
    this.completionUI.hide()
    this.startQuizRound(this.cards)
    if (this.practiceFromScan) this.quizUI.setMenuLabel(lingoCopy(this.nativeLanguage, "back"))
    console.log(`LINGO SPACE practicing ${this.roundTotal} saved situational cards in the quiz`)
  }

  /** Returns from a scan-launched practice to the scan session exactly as it
   * was left: cards still anchored, situation and selection intact. */
  private resumeScanSession(): void {
    this.audio.playClick()
    this.practiceFromScan = false
    this.quizActive = false
    this.quizUI.hide()
    this.completionUI.hide()
    this.learningMode = "SCAN"
    this.usingScannedLibrary = false
    this.currentCard = null
    this.currentTexture = null
    this.progress.beginSession(this.nativeLanguage!, this.targetLanguage!, "SCAN")
    this.boardUI.show()
    this.boardUI.setXp(this.audioXp, this.textXp)
    this.voiceStatus(lingoCopy(this.nativeLanguage, "listenPhrase"))
  }

  private queueArtworkGeneration(entries: SavedScanCard[]): void {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.state === "GENERATING" || entry.state === "READY") continue
      entry.state = "GENERATING"
      this.artworkQueue = this.artworkQueue
        .then(() => {
          // A same-word entry that already finished donates its art: scanning
          // the same object repeatedly must not pay for repeated generations.
          const wordKey = entry.card.word.trim().toLowerCase()
          const twin = this.savedScanCards.find((other) => other !== entry && other.state === "READY" && !!other.texture && other.card.word.trim().toLowerCase() === wordKey)
          if (twin && twin.texture) return twin.texture
          return this.ai.generateCardArtwork(entry.promptLabel, entry.visualDescription)
        })
        .then((texture) => {
          entry.texture = texture
          entry.state = "READY"
          const spatialIndex = this.scanCards.findIndex((card) => card.id === entry.card.id)
          if (spatialIndex >= 0) this.boardUI.setScanArtwork(spatialIndex, texture)
          // Keep the picture across sessions as a small matted thumbnail.
          if (!this.progress.getArtwork(entry.promptLabel)) this.persistArtwork(entry.promptLabel, texture)
          // Art that finishes mid-quiz drops straight into the running round.
          if (this.quizActive) {
            const quizIndex = this.cards.findIndex((card) => card.id === entry.card.id)
            if (quizIndex >= 0) this.quizUI.setCardTexture(quizIndex, texture)
          }
          this.glossaryUI.refreshIfOpen()
          this.boardUI.setScanArtworkProgress(this.savedScanCards.length, this.readyScanCardCount())
          console.log(`LINGO SPACE kawaii card ready: ${entry.promptLabel}`)
        })
        .catch((error) => {
          entry.state = "FAILED"
          entry.attempts += 1
          console.error(`LINGO SPACE card artwork failed for ${entry.promptLabel}: ${error}`)
          this.boardUI.setScanArtworkProgress(this.savedScanCards.length, this.readyScanCardCount())
          // Words still count without art: keep the open glossary page current.
          this.glossaryUI.refreshIfOpen()
        })
    }
  }

  private readyScanCardCount(): number {
    return this.savedScanCards.filter((entry) => entry.state === "READY" && !!entry.texture).length
  }

  private currentPracticeCard(): VocabularyCard | null {
    if (this.quizActive) return this.quizUI.currentCard()?.card || null
    if (this.learningMode === "IMAGE") return this.currentCard
    // Scan practice targets the selected object's word — what the card teaches.
    if (!this.scanSituation || this.scanCards.length === 0) return null
    return this.scanCards[this.scanCardIndex] || null
  }

  private handleDrop(category: CategoryId): void {
    if (this.learningMode !== "IMAGE" || this.dropLocked || !this.currentCard) return
    const card = this.currentCard
    this.dropLocked = true
    if (card.contexts.indexOf(category) >= 0) {
      this.counts[category] += 1
      this.organized += 1
      this.textXp += 5
      this.progress.recordCard(card, this.nativeLanguage!, this.targetLanguage!, {practice: "TEXT"})
      this.progress.recordXp(this.audioXp, this.textXp)
      this.boardUI.acceptDrop(category, this.counts[category], card.word)
      this.boardUI.setProgress(this.organized, this.roundTotal)
      this.boardUI.setXp(this.audioXp, this.textXp, "+5 TEXT XP")
      this.audio.playSaved()
      console.log(`LINGO SPACE saved ${card.word} to ${category}`)
      this.nextEvent.reset(0.85)
    } else {
      this.boardUI.rejectDrop()
      this.audio.playSoftReturn()
      console.log(`LINGO SPACE soft return ${card.word} from ${category}`)
      this.unlockDropEvent.reset(0.25)
    }
  }

  private advanceAfterSave(): void {
    if (this.organized >= this.roundTotal) {
      this.currentCard = null
      this.boardUI.hide()
      this.completionUI.showSummary(this.counts, this.audioXp, this.textXp, this.nativeLanguage!)
      this.progress.completeSession()
      console.log("LINGO SPACE round complete")
      return
    }
    this.dropLocked = false
    this.cardIndex += 1
    this.showReferenceCard()
  }

  private showReferenceCard(): void {
    const card = this.cards[this.cardIndex]
    if (!card) return
    this.currentCard = card
    const saved = this.savedScanCards.find((entry) => entry.card.id === card.id)
    this.currentTexture = saved?.texture || null
    this.boardUI.showCard(card.imageKey, card.word, card.translation, this.currentTexture || undefined)
    this.voiceStatus(lingoCopy(this.nativeLanguage, "listenPhrase"))
  }

  /** Objects Talk: card speech is emitted from the card's real-world anchor in
   * SCAN mode; anywhere else (quiz, menu, coaching) the voice rides the wearer. */
  private anchorSpeechToScanCard(index: number): void {
    const anchor = !this.quizActive && this.learningMode === "SCAN" && this.scanSituation
      ? this.boardUI.scanCardAnchor(index)
      : null
    this.ai.setSpeechAnchor(anchor)
  }

  private listenToCurrentWord(): void {
    if (this.huntActive) {
      // Mid-hunt, LISTEN repeats the question instead of leaking another word.
      this.nextHuntRoundRepeat()
      return
    }
    const card = this.currentPracticeCard()
    if (!card || !this.targetLanguage) {
      this.voiceStatus(lingoCopy(this.nativeLanguage, "nothingReady"))
      return
    }
    if (!global.deviceInfoSystem.isInternetAvailable()) {
      this.voiceStatus(lingoCopy(this.nativeLanguage, "voiceNeedsInternet"))
      return
    }
    this.audio.playClick()
    this.voiceStatus(`${lingoCopy(this.nativeLanguage, "playing")}: ${card.word}`)
    // Scan cards teach usage: word, then the situational phrase, then a usage
    // explanation in the learner's native language. Everywhere else: the word alone.
    const scanPhrase = !this.quizActive && this.learningMode === "SCAN" && this.scanSituation
      ? this.scanPhrases[this.scanCardIndex]
      : null
    this.anchorSpeechToScanCard(this.scanCardIndex)
    const speech = scanPhrase
      ? this.ai.speakSituationGuide(card.word, scanPhrase.target, scanPhrase.usageTip || scanPhrase.intent, this.targetLanguage, this.nativeLanguage!)
      : this.ai.speak(card.word, `Pronounce this ${this.targetLanguage} expression clearly once, at a natural beginner-friendly pace.`)
    speech
      .then(() => this.voiceStatus(lingoCopy(this.nativeLanguage, "listenThenRepeat")))
      .catch((error) => {
        console.error(`LINGO SPACE TTS error: ${error}`)
        this.voiceStatus(lingoCopy(this.nativeLanguage, "voiceFailed"))
      })
  }

  private startVoicePractice(): void {
    if (this.huntActive) {
      print("[LINGO ASR] talk blocked: hunt active")
      return
    }
    const card = this.currentPracticeCard()
    if (!card) {
      print("[LINGO ASR] talk blocked: no practice card")
      this.voiceStatus(lingoCopy(this.nativeLanguage, "nothingReady"))
      return
    }
    if (!global.deviceInfoSystem.isInternetAvailable()) {
      print("[LINGO ASR] talk blocked: no internet")
      this.voiceStatus(lingoCopy(this.nativeLanguage, "voiceNeedsInternet"))
      return
    }
    // A hold whose release got lost (finger slid off the button, interaction
    // canceled) must never brick the mic: a NEW hold always wins — the stale
    // session is aborted cleanly and this one starts fresh. But SIK can fire
    // the same physical press twice (poke + ray): a duplicate within the same
    // press must NOT murder the session it just started.
    if (this.voicePracticeActive) {
      if (getTime() - this.voicePracticeStartedAt < 0.6) {
        print("[LINGO ASR] duplicate hold ignored")
        return
      }
      print("[LINGO ASR] stale practice aborted by new hold")
      this.voicePracticeActive = false
      this.setMicDucking(false)
      this.voiceFinalizeEvent.cancel()
      this.voiceCleanupEvent.cancel()
      this.ai.abortListening()
    }
    print("[LINGO ASR] talk pressed")
    if (this.learningMode === "SCAN") this.camera.invalidateForVoice()
    this.voiceStatus(lingoCopy(this.nativeLanguage, "releaseToStop"))
    this.voicePracticeActive = this.ai.startListening(
      (partial) => this.voiceStatus(`${lingoCopy(this.nativeLanguage, "listening")}… ${partial}`),
      (error) => {
        this.voicePracticeActive = false
        this.setMicDucking(false)
        this.voiceStatus(error)
      },
    )
    if (this.voicePracticeActive) {
      this.voicePracticeStartedAt = getTime()
      this.setMicDucking(true)
      this.voiceHoldWatchdog.reset(15)
    } else {
      this.voiceStatus(lingoCopy(this.nativeLanguage, "voiceBusy"))
    }
  }

  /** Music dips while the wearer is speaking so the mic hears them cleanly. */
  private micDucked = false

  private setMicDucking(on: boolean): void {
    if (on === this.micDucked) return
    this.micDucked = on
    if (on) this.audio.duckMusic()
    else this.audio.restoreMusic()
  }

  private finishVoicePractice(): void {
    if (!this.voicePracticeActive) return
    this.voiceHoldWatchdog.cancel()
    const practiceCard = this.currentPracticeCard()
    if (!practiceCard || !this.nativeLanguage || !this.targetLanguage) {
      this.voicePracticeActive = false
      this.setMicDucking(false)
      this.voiceFinalizeEvent.cancel()
      this.voiceCleanupEvent.cancel()
      this.ai.abortListening()
      return
    }
    this.voicePracticeActive = false
    this.setMicDucking(false)
    const card = practiceCard
    this.voiceStatus(lingoCopy(this.nativeLanguage, "finishing"))
    this.voiceFinalizeEvent.reset(3.0)
    this.ai.finishListening()
      .then((transcript) => {
        this.voiceFinalizeEvent.cancel()
        if (this.ai.needsForcedCleanup()) this.voiceCleanupEvent.reset(0.05)
        const heard = transcript.trim()
        if (!heard) {
          this.voiceStatus(lingoCopy(this.nativeLanguage, "nothingHeard"))
          return
        }
        this.voiceStatus(`${lingoCopy(this.nativeLanguage, "listening")}: ${heard} • ${lingoCopy(this.nativeLanguage, "evaluating")}`)
        return this.ai.coachPronunciation(heard, card, this.nativeLanguage!, this.targetLanguage!)
          .then((assessment) => {
            const copy = this.pronunciationCopy(this.nativeLanguage!)
            // The AI can accept transliterated ASR (low letter similarity), so a
            // confirmed-correct answer never scores below 80.
            let score = this.ai.similarityScore(heard, card.word)
            if (assessment.correct) score = Math.max(score, 80)
            const shortFeedback = assessment.feedback.length > 90 ? `${assessment.feedback.slice(0, 90).trim()}…` : assessment.feedback
            const message = assessment.correct
              ? `✓ ${copy.correct} · ${score}%`
              : `↻ ${copy.retry} · ${score}%\n${copy.tip} · ${shortFeedback}`
            if (assessment.correct && this.practicedCardIds.indexOf(card.id) < 0) {
              this.audioXp += 10
              this.practicedCardIds.push(card.id)
              this.progress.recordCard(card, this.nativeLanguage!, this.targetLanguage!, {practice: "AUDIO"})
              this.progress.recordXp(this.audioXp, this.textXp)
              this.updateXpDisplays(`+10 ${lingoCopy(this.nativeLanguage, "audioXp")}`)
            }
            if (this.quizActive) this.quizUI.notifyPronunciationResult(assessment.correct, message)
            else this.boardUI.showPronunciationResult(assessment.correct, message)
            // A well-pronounced scan word graduates into its phrase-ordering puzzle.
            if (assessment.correct && !this.quizActive && this.learningMode === "SCAN") {
              this.pendingPuzzleIndex = this.scanCardIndex
              this.puzzleEvent.reset(1.2)
            }
            // The quiz celebrates success with its own sound and advances; spoken
            // feedback there would talk over the next word's model pronunciation.
            if (this.quizActive && assessment.correct) return
            const spokenFeedback = assessment.correct
              ? copy.correctSpoken
              : `${copy.retrySpoken} ${assessment.feedback} ${copy.tryAgainSpoken}`
            // Coaching is the coach's voice, not the object's: keep it on the wearer.
            this.ai.setSpeechAnchor(null)
            return this.ai.speak(
              spokenFeedback,
              `Speak only the provided ${this.nativeLanguage} coaching clearly and encouragingly. Do not add, repeat, or translate any words.`,
            )
              .catch((error) => console.error(`LINGO SPACE pronunciation TTS error: ${error}`))
          })
      })
      .catch((error) => {
        this.voiceFinalizeEvent.cancel()
        console.error(`LINGO SPACE voice coach error: ${error}`)
        this.voiceStatus(String(error))
      })
  }

  private teardownToMenu(): void {
    this.audio.playClick()
    this.voicePracticeActive = false
    this.setMicDucking(false)
    this.voiceFinalizeEvent.cancel()
    this.voiceCleanupEvent.cancel()
    this.voiceHoldWatchdog.cancel()
    this.scanCaptureEvent.cancel()
    this.nextEvent.cancel()
    this.unlockDropEvent.cancel()
    this.puzzleEvent.cancel()
    this.scanInProgress = false
    this.scanSessionGeneration += 1
    this.lastScannedRoom = null
    this.practiceFromScan = false
    this.cancelWordHunt()
    this.ai.abortListening()
    this.progress.completeSession()
    this.imageBatchIndex = 0
    this.usingScannedLibrary = false
    this.scanSituation = null
    this.quizActive = false
    this.quizUI.hide()
    this.glossaryUI.hide()
    this.completionUI.hide()
    this.boardUI.hide()
    this.languagePicker.hide()
  }

  private changeSetup(): void {
    this.teardownToMenu()
    this.menuUI.resetFlow()
    this.menuUI.show()
    this.fx.popIn(this.menuUI.sceneObject, {rotateDegrees: -8})
  }

  private openLanguagePicker(): void {
    if (!this.nativeLanguage || this.scanInProgress || this.huntActive || this.voicePracticeActive) return
    this.audio.playClick()
    this.languagePicker.show(this.nativeLanguage, this.targetLanguage)
  }

  /** Switching target mid-session restarts the current mode in the new tongue. */
  private applyTargetLanguageChange(language: LanguageId): void {
    if (!this.nativeLanguage || !isLanguageId(language)) return
    if (language === this.nativeLanguage || language === this.targetLanguage) return
    this.targetLanguage = language
    this.progress.setLanguages(this.nativeLanguage, language)
    this.practiceFromScan = false
    if (this.learningMode) this.startRound()
  }

  /** BACK from a section: languages stay chosen, land on the mode choice. */
  private returnToModeSelection(): void {
    this.teardownToMenu()
    this.menuUI.jumpToModeStep()
    this.menuUI.show()
    this.fx.popIn(this.menuUI.sceneObject, {rotateDegrees: -8})
  }

  private speakGlossaryWord(word: string): void {
    if (!this.targetLanguage || !global.deviceInfoSystem.isInternetAvailable()) return
    this.ai.setSpeechAnchor(null)
    this.ai.speak(word, `Pronounce this ${this.targetLanguage} word clearly once, at a natural beginner-friendly pace.`)
      .catch((error) => console.error(`LINGO SPACE glossary TTS error: ${error}`))
  }

  /** Every scanned word for the current language pair, for the wrist glossary.
   * Unified by word: re-scanning the same object never duplicates an entry
   * (an entry that has artwork wins over a bare one). */
  private glossaryEntries(): GlossaryEntry[] {
    if (!this.nativeLanguage || !this.targetLanguage) return []
    this.activateSavedLibrary()
    // Opening the glossary heals missing pictures: queue generation for every
    // entry without artwork; each finished image refreshes the open page.
    const missingArtwork = this.savedScanCards.filter((entry) => !entry.texture && (entry.state === "PENDING" || (entry.state === "FAILED" && entry.attempts < 3)))
    if (missingArtwork.length > 0 && global.deviceInfoSystem.isInternetAvailable()) this.queueArtworkGeneration(missingArtwork)
    const byWord: Record<string, GlossaryEntry> = {}
    const order: string[] = []
    for (let i = 0; i < this.savedScanCards.length; i++) {
      const entry = this.savedScanCards[i]
      const key = entry.card.word.trim().toLowerCase()
      if (!key) continue
      const candidate: GlossaryEntry = {
        word: entry.card.word,
        translation: entry.card.translation,
        phonetic: entry.card.phonetic || "",
        room: entry.card.room || "",
        texture: entry.texture || null,
      }
      const existing = byWord[key]
      if (!existing) {
        byWord[key] = candidate
        order.push(key)
      } else if (!existing.texture && candidate.texture) {
        candidate.room = candidate.room || existing.room
        byWord[key] = candidate
      } else if (!existing.room && candidate.room) {
        existing.room = candidate.room
      }
    }
    return order.map((key) => byWord[key])
  }

  private activateSavedLibrary(): void {
    if (!this.nativeLanguage || !this.targetLanguage) return
    const key = `${this.nativeLanguage}->${this.targetLanguage}`
    if (!this.scanLibraries[key]) this.scanLibraries[key] = []
    this.savedScanCards = this.scanLibraries[key]
    if (this.hydratedScanLibraries[key]) return
    const persisted = this.progress.getCards(this.nativeLanguage, this.targetLanguage)
    for (let i = 0; i < persisted.length; i++) {
      const entry = persisted[i]
      if (entry.source !== "SCAN" || this.savedScanCards.some((saved) => saved.card.id === entry.id)) continue
      this.savedScanCards.push({
        card: this.asVocabularyCard(entry),
        promptLabel: entry.promptLabel || entry.translation || entry.word,
        visualDescription: entry.visualDescription || `A clearly visible ${entry.promptLabel || entry.translation || entry.word}.`,
        texture: null,
        state: "PENDING",
        attempts: 0,
      })
    }
    this.restorePersistedArtwork()
    this.hydratedScanLibraries[key] = true
  }

  /** Session-to-session pictures: decode stored thumbnails so the learner never
   * waits (or pays) for a regeneration of art they already earned. Restores are
   * PACED (a couple per tick): decoding + matte-keying a whole 180-card library
   * in one frame visibly froze the menu at language selection. */
  private artRestoreQueue: SavedScanCard[] = []

  private restorePersistedArtwork(): void {
    for (let i = 0; i < this.savedScanCards.length; i++) {
      const saved = this.savedScanCards[i]
      if (saved.texture || saved.state === "GENERATING" || saved.state === "READY") continue
      if (!this.progress.getArtwork(saved.promptLabel)) continue
      saved.state = "GENERATING"
      this.artRestoreQueue.push(saved)
    }
    if (this.artRestoreQueue.length > 0) this.artRestoreEvent.reset(0.05)
  }

  private drainArtRestoreQueue(): void {
    const batch = this.artRestoreQueue.splice(0, 2)
    for (let b = 0; b < batch.length; b++) {
      const saved = batch[b]
      const stored = this.progress.getArtwork(saved.promptLabel)
      if (!stored) {
        saved.state = "PENDING"
        continue
      }
      // Old builds stored JPEG thumbnails matted onto cream; key it back out.
      const needsMatteRemoval = stored.indexOf("/9j/") === 0
      Base64.decodeTextureAsync(
        stored,
        (decoded) => {
          const texture = needsMatteRemoval ? this.keyOutCreamMatte(decoded) : decoded
          saved.texture = texture
          saved.state = "READY"
          const spatialIndex = this.scanCards.findIndex((card) => card.id === saved.card.id)
          if (spatialIndex >= 0) this.boardUI.setScanArtwork(spatialIndex, texture)
          this.glossaryUI.refreshIfOpen()
          if (this.quizActive) {
            const quizIndex = this.cards.findIndex((card) => card.id === saved.card.id)
            if (quizIndex >= 0) this.quizUI.setCardTexture(quizIndex, texture)
          }
          this.boardUI.setScanArtworkProgress(this.savedScanCards.length, this.readyScanCardCount())
        },
        () => {
          saved.state = "PENDING"
        },
      )
    }
    if (this.artRestoreQueue.length > 0) this.artRestoreEvent.reset(0.08)
  }

  private persistArtwork(label: string, texture: Texture): void {
    try {
      const thumbnail = this.makeArtThumbnail(texture, 256)
      Base64.encodeTextureAsync(
        thumbnail,
        (encoded) => {
          this.progress.saveArtwork(label, encoded)
          print(`LINGO SPACE artwork persisted: ${label} (${encoded.length} chars)`)
        },
        () => console.error(`LINGO SPACE artwork persist encode failed: ${label}`),
        CompressionQuality.LowQuality,
        EncodingType.Png,
      )
    } catch (error) {
      console.error(`LINGO SPACE artwork persist failed for ${label}: ${error}`)
    }
  }

  /** CPU downscale keeping alpha: PNG storage preserves the kawaii art's
   * transparent background all the way to the next session. */
  private makeArtThumbnail(source: Texture, size: number): Texture {
    const copy = ProceduralTextureProvider.createFromTexture(source)
    const provider = copy.control as ProceduralTextureProvider
    const width = copy.getWidth()
    const height = copy.getHeight()
    const pixels = new Uint8Array(width * height * 4)
    provider.getPixels(0, 0, width, height, pixels)
    const out = ProceduralTextureProvider.createWithFormat(size, size, TextureFormat.RGBA8Unorm)
    const outProvider = out.control as ProceduralTextureProvider
    const outPixels = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      const sourceY = Math.min(height - 1, Math.floor((y * height) / size))
      for (let x = 0; x < size; x++) {
        const sourceX = Math.min(width - 1, Math.floor((x * width) / size))
        const si = (sourceY * width + sourceX) * 4
        const di = (y * size + x) * 4
        outPixels[di] = pixels[si]
        outPixels[di + 1] = pixels[si + 1]
        outPixels[di + 2] = pixels[si + 2]
        outPixels[di + 3] = pixels[si + 3]
      }
    }
    outProvider.setPixels(0, 0, size, size, outPixels)
    return out
  }

  /** Thumbnails saved by older builds were matted onto cream for JPEG storage:
   * key that exact cream back to transparency so restored art floats free. */
  private keyOutCreamMatte(source: Texture): Texture {
    const copy = ProceduralTextureProvider.createFromTexture(source)
    const provider = copy.control as ProceduralTextureProvider
    const width = copy.getWidth()
    const height = copy.getHeight()
    const pixels = new Uint8Array(width * height * 4)
    provider.getPixels(0, 0, width, height, pixels)
    for (let i = 0; i < pixels.length; i += 4) {
      const dr = Math.abs(pixels[i] - 255)
      const dg = Math.abs(pixels[i + 1] - 247)
      const db = Math.abs(pixels[i + 2] - 236)
      const distance = Math.max(dr, dg, db)
      if (distance < 14) pixels[i + 3] = 0
      else if (distance < 34) pixels[i + 3] = Math.round(((distance - 14) / 20) * 255)
    }
    provider.setPixels(0, 0, width, height, pixels)
    return copy
  }

  private asVocabularyCard(entry: PersistedVocabularyCard): VocabularyCard {
    return {
      id: entry.id,
      imageKey: entry.imageKey,
      word: entry.word,
      translation: entry.translation,
      phonetic: entry.phonetic || "",
      phrase: entry.phrase,
      phraseTranslation: entry.phraseTranslation,
      phrasePhonetic: entry.phrasePhonetic,
      room: entry.room,
      contexts: entry.contexts.slice(),
      source: entry.source,
    }
  }

  private resolveUserName(): void {
    try {
      global.userContextSystem.requestDisplayName((value) => {
        const userName = String(value || "").trim()
        if (!userName) return
        this.progress.setUserName(userName)
        this.menuUI.setUserName(userName)
      })
    } catch (error) {
      console.warn(`LINGO SPACE display name unavailable: ${error}`)
    }
  }

  private captureZoomTargets(): void {
    this.zoomTargets = []
    for (let i = 0; i < this.sceneObject.getChildrenCount(); i++) {
      const transform = this.sceneObject.getChild(i).getTransform()
      const value = transform.getLocalPosition()
      this.zoomTargets.push({transform, basePosition: new vec3(value.x, value.y, value.z)})
    }
  }

  private applyDistanceZoom(direction: number): void {
    this.distanceOffset = Math.max(-22, Math.min(22, this.distanceOffset + (direction > 0 ? 7 : -7)))
    for (let i = 0; i < this.zoomTargets.length; i++) {
      const target = this.zoomTargets[i]
      const base = target.basePosition
      target.transform.setLocalPosition(new vec3(base.x, base.y, base.z + this.distanceOffset))
    }
    this.audio.playClick()
    print(`LINGO SPACE view distance adjusted: ${this.distanceOffset} cm`)
  }

  private pronunciationCopy(language: LanguageId): PronunciationCopy {
    switch (language) {
      case "Spanish": return {
        correct: "CORRECTO · SE ENTENDIÓ",
        retry: "INCORRECTO · VUELVE A PROBAR",
        tip: "CONSEJO",
        correctSpoken: "Correcto. Se entendió.",
        retrySpoken: "Incorrecto.",
        tryAgainSpoken: "Escucha el modelo y vuelve a probar.",
      }
      case "English": return {
        correct: "CORRECT · UNDERSTOOD",
        retry: "INCORRECT · TRY AGAIN",
        tip: "TIP",
        correctSpoken: "Correct. Understood.",
        retrySpoken: "Incorrect.",
        tryAgainSpoken: "Listen to the model and try again.",
      }
      case "German": return {
        correct: "RICHTIG · VERSTANDEN",
        retry: "NICHT RICHTIG · NOCH EINMAL",
        tip: "TIPP",
        correctSpoken: "Richtig. Verstanden.",
        retrySpoken: "Nicht richtig.",
        tryAgainSpoken: "Hör dir das Vorbild an und versuch es noch einmal.",
      }
      case "French": return {
        correct: "CORRECT · COMPRIS",
        retry: "INCORRECT · RÉESSAIE",
        tip: "CONSEIL",
        correctSpoken: "Correct. Compris.",
        retrySpoken: "Incorrect.",
        tryAgainSpoken: "Écoute le modèle et réessaie.",
      }
      case "Italian": return {
        correct: "CORRETTO · CAPITO",
        retry: "NON CORRETTO · RIPROVA",
        tip: "SUGGERIMENTO",
        correctSpoken: "Corretto. Capito.",
        retrySpoken: "Non corretto.",
        tryAgainSpoken: "Ascolta il modello e riprova.",
      }
      case "Japanese": return {
        correct: "正解 · 伝わりました",
        retry: "不正解 · もう一度",
        tip: "ヒント",
        correctSpoken: "正解です。伝わりました。",
        retrySpoken: "不正解です。",
        tryAgainSpoken: "お手本を聞いて、もう一度試してください。",
      }
    }
  }

  private setColliderDebugAll(root: SceneObject, enabled: boolean): void {
    const collider = root.getComponent("Physics.ColliderComponent") as ColliderComponent | null
    if (collider) collider.debugDrawEnabled = enabled
    for (let i = 0; i < root.getChildrenCount(); i++) this.setColliderDebugAll(root.getChild(i), enabled)
  }
}
