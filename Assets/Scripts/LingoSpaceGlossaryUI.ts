/** Wrist glossary: a kawaii book floating over the LEFT wrist that opens an
 * alphabetical picture dictionary of every scanned word. */
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {SIK} from "SpectaclesInteractionKit.lspkg/SIK"
import {Button515 as Button} from "./compat515/Button515"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {hasDenseScript, LanguageId} from "./LingoSpaceData"
import {flagTexture} from "./LingoSpaceFlags"
import {lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT, styleLingoButton} from "./LingoSpaceTheme"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"

const BOOK_TEXTURE = requireAsset("../AIImagesKawaii/book.png") as Texture
const PANEL_TEXTURE = requireAsset("../ScreenDesign/background2.png") as Texture
const VOLUME_ICON = requireAsset("../Icons/volume_up.png") as Texture
const MOON_ICON = requireAsset("../Icons/moon.png") as Texture
const HELP_ICON = requireAsset("../Icons/help.png") as Texture

const ORDER = {background: 6, image: 11, text: 14, buttonMesh: 16, buttonIcon: 17, buttonText: 18}
const ROWS_PER_PAGE = 4
// The dictionary opens BESIDE the book, shifted left so they never overlap.
const PANEL_OFFSET = new vec3(-26, 12, 0)
const TRANSLATION_COLOR = new vec4(0.05, 0.48, 0.43, 1)

export type GlossaryEntry = {word: string, translation: string, phonetic: string, room: string, texture: Texture | null}

export class LingoSpaceGlossaryUI {
  private root: SceneObject
  private bookRoot: SceneObject
  private panelRoot: SceneObject
  private musicRoot!: SceneObject
  private musicIconMaterial: Material | null = null
  private languageRoot!: SceneObject
  private flagMaterial: Material | null = null
  private whisperRoot!: SceneObject
  private whisperIconMaterial: Material | null = null
  private rowsRoot: SceneObject | null = null
  private titleText!: Text
  private pageText!: Text
  private prevArrowText!: Text
  private nextArrowText!: Text
  private moveText!: Text
  private followText!: Text
  private panelBillboard!: Billboard
  private entries: GlossaryEntry[] = []
  private page = 0
  private panelOpen = false
  /** While true the panel floats above the book; a MOVE grab parks it in place. */
  private panelFollow = true
  private nativeLanguage: LanguageId = "English"
  private smoothedPos: vec3 | null = null
  private panelSmoothed: vec3 | null = null
  private fx: LingoFX
  private worldCamera = WorldCameraFinderProvider.getInstance()
  /** SIK buttons occasionally revert to their variant's default size when they
   * initialize late (this UI is built disabled): sizes are re-enforced on a delay. */
  private sizedButtons: {button: Button, size: vec3, radius: number}[] = []
  private voiceNoticeEvent: DelayedCallbackEvent | null = null

  constructor(
    private fallbackAnchor: SceneObject,
    private host: BaseScriptComponent,
    private audio: LingoSpaceAudioController,
    private fetchEntries: () => GlossaryEntry[],
    private speakEntry: (word: string) => void,
    private onLanguagePick: () => void,
    private onWhisperToggle: () => boolean,
    private onHelp: () => void,
  ) {
    this.fx = new LingoFX(host)
    this.root = global.scene.createSceneObject("Lingo Glossary")
    this.bookRoot = this.buildBook()
    this.panelRoot = this.buildPanel()
    this.buildMusicButton()
    this.buildLanguageChip()
    this.buildWhisperChip()
    this.buildHelpChip()
    this.panelRoot.enabled = false
    this.root.enabled = false
    this.host.createEvent("UpdateEvent").bind(() => this.followWrist())
  }

  show(): void {
    this.smoothedPos = null
    this.root.enabled = true
    this.scheduleOrderPass()
  }

  hide(): void {
    this.panelOpen = false
    this.panelRoot.enabled = false
    this.root.enabled = false
  }

  setLanguage(language: LanguageId): void {
    this.nativeLanguage = language
    this.titleText.text = lingoCopy(language, "glossary")
    this.moveText.text = `✦ ${lingoCopy(language, "spatialMove")}`
    this.followText.text = `↺ ${lingoCopy(language, "spatialFollow")}`
  }

  /** The book rides the left wrist while the open palm faces the wearer;
   * without hand tracking it docks beside the main panel. */
  private followWrist(): void {
    if (!this.root.enabled || isNull(this.bookRoot)) return
    let target: vec3
    let bookVisible = true
    const hand = SIK.HandInputData.getHand("left")
    const tracked = !!(hand && hand.isTracked())
    const palmOpen = tracked && hand.isFacingCamera()
    // Camera-right in the horizontal plane keeps the two chips side by side
    // from the wearer's point of view no matter how the hand rotates.
    const cameraRight = this.worldCamera.getWorldTransform().multiplyDirection(new vec3(1, 0, 0))
    const flatRight = new vec3(cameraRight.x, 0, cameraRight.z)
    const sideways = flatRight.length > 0.001 ? flatRight.normalize() : new vec3(1, 0, 0)
    if (tracked) {
      // Hug the wrist, floated toward the wearer so the hand never occludes the chips.
      const towardCamera = this.worldCamera.getWorldPosition().sub(hand.wrist.position).normalize()
      target = hand.wrist.position
        .add(new vec3(0, 1, 0))
        .add(towardCamera.uniformScale(3.5))
        .add(sideways.uniformScale(-1.7))
      // Palm turned away: the book hides instead of drifting through the scene.
      bookVisible = palmOpen
    } else {
      const world = this.fallbackAnchor.getTransform().getWorldTransform()
      target = world.multiplyPoint(new vec3(-26, -6, 6))
    }
    if (this.bookRoot.enabled !== bookVisible) this.bookRoot.enabled = bookVisible
    const blend = Math.min(1, getDeltaTime() * 10)
    this.smoothedPos = this.smoothedPos ? vec3.lerp(this.smoothedPos, target, blend) : target
    this.bookRoot.getTransform().setWorldPosition(this.smoothedPos)
    // On the wrist the book stays a discreet chip; floating free (no hand
    // tracked) it grows so it reads clearly from panel distance.
    const scaleTarget = tracked ? 1 : 1.9
    const currentScale = this.bookRoot.getTransform().getLocalScale().x
    const nextScale = currentScale + (scaleTarget - currentScale) * blend
    this.bookRoot.getTransform().setLocalScale(new vec3(nextScale, nextScale, nextScale))
    // Music switch sits beside the book at the wrist, never on the palm.
    if (!isNull(this.musicRoot)) {
      const musicVisible = tracked && palmOpen
      if (this.musicRoot.enabled !== musicVisible) this.musicRoot.enabled = musicVisible
      if (musicVisible) this.musicRoot.getTransform().setWorldPosition(this.smoothedPos.add(sideways.uniformScale(3.4)))
    }
    // The studied language's flag rides beside the music switch.
    if (!isNull(this.languageRoot)) {
      const flagVisible = tracked && palmOpen
      if (this.languageRoot.enabled !== flagVisible) this.languageRoot.enabled = flagVisible
      if (flagVisible) this.languageRoot.getTransform().setWorldPosition(this.smoothedPos.add(sideways.uniformScale(6.4)))
    }
    // Whisper moon completes the wrist row: book · music · flag · moon.
    if (!isNull(this.whisperRoot)) {
      const moonVisible = tracked && palmOpen
      if (this.whisperRoot.enabled !== moonVisible) this.whisperRoot.enabled = moonVisible
      if (moonVisible) this.whisperRoot.getTransform().setWorldPosition(this.smoothedPos.add(sideways.uniformScale(9.2)))
    }
    // The "?" tutorial chip closes the row, right beside the moon.
    if (this.helpRoot && !isNull(this.helpRoot)) {
      const helpVisible = tracked && palmOpen
      if (this.helpRoot.enabled !== helpVisible) this.helpRoot.enabled = helpVisible
      if (helpVisible) this.helpRoot.getTransform().setWorldPosition(this.smoothedPos.add(sideways.uniformScale(12)))
    }
    // The open dictionary floats beside the book until the wearer grabs it with MOVE.
    if (this.panelOpen && this.panelFollow && !isNull(this.panelRoot)) {
      const panelTarget = this.smoothedPos.add(PANEL_OFFSET)
      this.panelSmoothed = this.panelSmoothed ? vec3.lerp(this.panelSmoothed, panelTarget, Math.min(1, getDeltaTime() * 7)) : panelTarget
      this.panelRoot.getTransform().setWorldPosition(this.panelSmoothed)
    }
  }

  private togglePanel(): void {
    if (this.panelOpen) {
      this.closePanel()
      return
    }
    this.audio.playClick()
    this.entries = this.sortedEntries()
    this.page = 0
    this.panelOpen = true
    this.panelFollow = true
    this.panelBillboard.enabled = true
    this.panelSmoothed = null
    const bookPos = this.bookRoot.getTransform().getWorldPosition()
    this.panelRoot.getTransform().setWorldPosition(bookPos.add(PANEL_OFFSET))
    this.renderPage()
    this.panelRoot.enabled = true
    this.fx.popIn(this.panelRoot, {rotateDegrees: -6})
    this.scheduleOrderPass()
  }

  private sortedEntries(): GlossaryEntry[] {
    return this.fetchEntries()
      .slice()
      .sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()))
  }

  /** Newly generated artwork lands on the open page without user action. */
  refreshIfOpen(): void {
    if (!this.panelOpen || isNull(this.panelRoot)) return
    this.entries = this.sortedEntries()
    const pageCount = Math.max(1, Math.ceil(this.entries.length / ROWS_PER_PAGE))
    if (this.page >= pageCount) this.page = pageCount - 1
    this.renderPage()
    this.scheduleOrderPass()
  }

  private closePanel(): void {
    this.audio.playSoftReturn()
    this.panelOpen = false
    this.fx.popOut(this.panelRoot, () => {
      if (!this.panelOpen && !isNull(this.panelRoot)) this.panelRoot.enabled = false
    })
  }

  private turnPage(step: number): void {
    const pageCount = Math.max(1, Math.ceil(this.entries.length / ROWS_PER_PAGE))
    if (pageCount <= 1) return
    this.audio.playClick()
    // Circular paging: advancing past the last page loops back to the first
    // (and going back from the first jumps to the last).
    this.page = ((this.page + step) % pageCount + pageCount) % pageCount
    this.renderPage()
    this.scheduleOrderPass()
  }

  private renderPage(): void {
    if (this.rowsRoot && !isNull(this.rowsRoot)) deferDestroy(this.host, this.rowsRoot)
    // Destroying the rows orphans their play buttons' size entries: drop them.
    this.sizedButtons = this.sizedButtons.filter((entry) => !isNull(entry.button))
    this.rowsRoot = this.makeObject(this.panelRoot, "Glossary Rows")
    const pageCount = Math.max(1, Math.ceil(this.entries.length / ROWS_PER_PAGE))
    this.pageText.text = `${this.page + 1} / ${pageCount}`
    // A single page has nowhere to turn: the arrows dim to say so.
    const arrowAlpha = pageCount > 1 ? 1 : 0.3
    this.prevArrowText.textFill.color = new vec4(1, 1, 1, arrowAlpha)
    this.nextArrowText.textFill.color = new vec4(1, 1, 1, arrowAlpha)
    if (this.entries.length === 0) {
      this.addText(this.rowsRoot, lingoCopy(this.nativeLanguage, "glossaryEmpty"), 34, 9, 48, LINGO_COLORS.ink, new vec3(0, 0, 0.8))
      return
    }
    const start = this.page * ROWS_PER_PAGE
    const visible = this.entries.slice(start, start + ROWS_PER_PAGE)
    for (let i = 0; i < visible.length; i++) {
      const entry = visible[i]
      const y = 8.8 - i * 5.6
      const thumb = this.addImage(this.rowsRoot, entry.texture || BOOK_TEXTURE, 5.2, `Thumb ${entry.word}`, new vec3(-12.6, y, 0.8))
      if (!entry.texture) {
        const image = thumb.getComponent("Component.Image") as Image
        image.mainMaterial.mainPass.baseColor = new vec4(1, 1, 1, 0.35)
      }
      // Word and its translation hug each other (2.4 apart) while rows keep a
      // 3.3 gap: each pair clearly belongs together, not to the next word.
      const wordText = this.addText(this.rowsRoot, entry.word, 21, 3.2, 58, LINGO_COLORS.ink, new vec3(0.9, y + 1.2, 0.8))
      // CJK glyph shapes need a larger size to stay legible at row height.
      if (hasDenseScript(entry.word)) wordText.size = 74
      const parts = [entry.translation]
      if (entry.phonetic) parts.push(entry.phonetic)
      // Where the learner found the word: the scanned environment label.
      if (entry.room) parts.push(entry.room)
      this.addText(this.rowsRoot, parts.join("  ·  "), 21, 2.5, 44, TRANSLATION_COLOR, new vec3(0.9, y - 1.2, 0.8))
      this.addPlayButton(this.rowsRoot, entry.word, new vec3(16.4, y, 0.8))
    }
  }

  /** A small speaker beside each word: hear its real pronunciation instantly. */
  private addPlayButton(parent: SceneObject, word: string, position: vec3): void {
    const root = this.makeObject(parent, `Play ${word}`, position)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, "home")
    this.enforceButtonSize(button, 3.7, 3.7, 1.85)
    this.addImage(root, VOLUME_ICON, 2, `Play Icon ${word}`, new vec3(0, 0, 1.35))
    button.onTriggerUp.add(() => {
      this.audio.playClick()
      if (!global.deviceInfoSystem.isInternetAvailable()) {
        this.showVoiceNotice()
        return
      }
      this.speakEntry(word)
    })
  }

  /** Offline tap feedback: the panel title briefly explains why the voice stayed silent. */
  private showVoiceNotice(): void {
    this.titleText.text = lingoCopy(this.nativeLanguage, "voiceNeedsInternet")
    if (!this.voiceNoticeEvent) {
      this.voiceNoticeEvent = this.host.createEvent("DelayedCallbackEvent")
      this.voiceNoticeEvent.bind(() => {
        if (!isNull(this.titleText)) this.titleText.text = lingoCopy(this.nativeLanguage, "glossary")
      })
    }
    this.voiceNoticeEvent.reset(2)
  }

  private buildBook(): SceneObject {
    const book = this.makeObject(this.root, "Glossary Book")
    const billboard = book.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.25, 0.25, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    const button = book.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
    styleLingoButton(button, "card")
    this.enforceButtonSize(button, 2.8, 2.8, 1.4)
    this.addImage(book, BOOK_TEXTURE, 2.1, "Glossary Book Icon", new vec3(0, 0.05, 1.4))
    button.onTriggerUp.add(() => this.togglePanel())
    return book
  }

  /** Palm switch: mutes or revives the background music with one tap. */
  private buildMusicButton(): void {
    this.musicRoot = this.makeObject(this.root, "Palm Music Switch")
    const billboard = this.musicRoot.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.3, 0.3, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    const button = this.musicRoot.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, "home")
    this.enforceButtonSize(button, 2, 2, 1)
    const icon = this.addImage(this.musicRoot, VOLUME_ICON, 1.2, "Music Switch Icon", new vec3(0, 0, 1.4))
    const iconImage = icon.getComponent("Component.Image") as Image
    this.musicIconMaterial = iconImage.mainMaterial
    button.onTriggerUp.add(() => {
      this.audio.playClick()
      // No track loaded: dimming the icon would fake a mute that never happens.
      if (!this.audio.hasMusic()) return
      const enabled = this.audio.toggleMusic()
      if (this.musicIconMaterial) this.musicIconMaterial.mainPass.baseColor = new vec4(1, 1, 1, enabled ? 1 : 0.3)
    })
    this.musicRoot.enabled = false
  }

  /** Wrist flag: always shows the language being studied; one tap opens the
   * in-section language switcher pop-up. */
  private buildLanguageChip(): void {
    this.languageRoot = this.makeObject(this.root, "Palm Language Chip")
    const billboard = this.languageRoot.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.3, 0.3, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    const button = this.languageRoot.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(button, "primary")
    this.enforceButtonSize(button, 2.2, 2.2, 1.1)
    const icon = this.addImage(this.languageRoot, flagTexture("French"), 1.7, "Language Chip Flag", new vec3(0, 0, 1.4))
    const iconImage = icon.getComponent("Component.Image") as Image
    this.flagMaterial = iconImage.mainMaterial
    button.onTriggerUp.add(() => {
      this.audio.playClick()
      this.onLanguagePick()
    })
    this.languageRoot.enabled = false
  }

  /** Whisper mode: a moon on the wrist — soft coach voice and hushed sounds
   * for practicing in public. Bright moon = whisper on. */
  private buildWhisperChip(): void {
    this.whisperRoot = this.makeObject(this.root, "Palm Whisper Chip")
    const billboard = this.whisperRoot.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.3, 0.3, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    const button = this.whisperRoot.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(button, "neutral")
    this.enforceButtonSize(button, 2, 2, 1)
    const icon = this.addImage(this.whisperRoot, MOON_ICON, 1.2, "Whisper Chip Icon", new vec3(0, 0, 1.4))
    const iconImage = icon.getComponent("Component.Image") as Image
    this.whisperIconMaterial = iconImage.mainMaterial
    if (this.whisperIconMaterial) this.whisperIconMaterial.mainPass.baseColor = new vec4(1, 1, 1, 0.4)
    button.onTriggerUp.add(() => {
      this.audio.playClick()
      const enabled = this.onWhisperToggle()
      if (this.whisperIconMaterial) this.whisperIconMaterial.mainPass.baseColor = new vec4(1, 1, 1, enabled ? 1 : 0.4)
    })
    this.whisperRoot.enabled = false
  }

  private helpRoot: SceneObject | null = null

  /** Replay-the-tutorial chip: a "?" beside the moon, so the wearer (or a
   * friend trying the Specs) can rewatch the tour whenever they want. */
  private buildHelpChip(): void {
    this.helpRoot = this.makeObject(this.root, "Palm Help Chip")
    const billboard = this.helpRoot.createComponent(Billboard.getTypeName()) as Billboard
    billboard.xAxisEnabled = true
    billboard.yAxisEnabled = true
    billboard.zAxisEnabled = false
    billboard.axisEasing = new vec3(0.3, 0.3, 1)
    billboard.axisBufferDegrees = new vec3(2, 2, 0)
    const button = this.helpRoot.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Round", style: "Primary"})
    styleLingoButton(button, "primary")
    this.enforceButtonSize(button, 2, 2, 1)
    this.addImage(this.helpRoot, HELP_ICON, 1.3, "Help Chip Icon", new vec3(0, 0, 1.4))
    button.onTriggerUp.add(() => {
      this.audio.playClick()
      this.onHelp()
    })
    this.helpRoot.enabled = false
  }

  /** Keeps the wrist chip's flag in sync with the studied language. */
  setTargetLanguage(language: LanguageId | null): void {
    if (!language || !this.flagMaterial) return
    this.flagMaterial.mainPass.baseTex = flagTexture(language)
  }

  private buildPanel(): SceneObject {
    const panel = this.makeObject(this.root, "Glossary Panel")
    this.panelBillboard = panel.createComponent(Billboard.getTypeName()) as Billboard
    this.panelBillboard.xAxisEnabled = true
    this.panelBillboard.yAxisEnabled = true
    this.panelBillboard.zAxisEnabled = false
    this.panelBillboard.axisEasing = new vec3(0.2, 0.2, 1)
    this.panelBillboard.axisBufferDegrees = new vec3(3, 3, 0)
    const background = this.addImage(panel, PANEL_TEXTURE, 1, "Glossary Background", new vec3(0, 0, 0))
    background.getTransform().setLocalScale(new vec3(42, 33, 1))
    const backgroundImage = background.getComponent("Component.Image") as Image
    backgroundImage.setRenderOrder(ORDER.background)
    this.titleText = this.addText(panel, "GLOSSARY", 26, 3.6, 62, new vec4(0.61, 0.42, 1, 1), new vec3(0, 13, 0.6))
    // True bold: max font weight PLUS a same-color outline that thickens every
    // stroke (the single-file font alone barely changes with weight).
    ;(this.titleText as Text & {weight?: number}).weight = 800
    this.titleText.outlineSettings.enabled = true
    this.titleText.outlineSettings.size = 0.28
    this.titleText.outlineSettings.fill.color = new vec4(0.61, 0.42, 1, 1)
    this.buildGrabHandles(panel)
    // Low enough that the fourth row's translation never hides behind them.
    this.prevArrowText = this.addNavButton(panel, "<", new vec3(-7.6, -14.7, 0.6), () => this.turnPage(-1))
    this.pageText = this.addText(panel, "1 / 1", 8, 2.8, 40, LINGO_COLORS.ink, new vec3(0, -14.7, 0.6))
    this.nextArrowText = this.addNavButton(panel, ">", new vec3(7.6, -14.7, 0.6), () => this.turnPage(1))
    this.addNavButton(panel, "X", new vec3(17.4, 13, 0.6), () => this.closePanel())
    return panel
  }

  /** MOVE grabs and parks the dictionary; FOLLOW sends it back over the book. */
  private buildGrabHandles(panel: SceneObject): void {
    const moveRoot = this.makeObject(panel, "Glossary Move", new vec3(-6.2, 18.6, 0.6))
    const moveButton = moveRoot.createComponent(Button.getTypeName()) as Button
    moveButton.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(moveButton, "primary")
    this.enforceButtonSize(moveButton, 10.6, 3.8, 1.9)
    this.moveText = this.addText(moveRoot, "✦ MOVE", 9.4, 2.6, 34, LINGO_COLORS.white, new vec3(0, 0, 1.35))
    const manipulation = moveRoot.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setManipulateRoot(panel.getTransform())
    manipulation.setCanTranslate(true)
    manipulation.setCanRotate(false)
    manipulation.setCanScale(false)
    manipulation.onManipulationStart.add(() => {
      this.panelFollow = false
      this.panelBillboard.enabled = false
    })

    const followRoot = this.makeObject(panel, "Glossary Follow", new vec3(5.6, 18.6, 0.6))
    const followButton = followRoot.createComponent(Button.getTypeName()) as Button
    followButton.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Secondary"})
    styleLingoButton(followButton, "neutral")
    this.enforceButtonSize(followButton, 10.6, 3.8, 1.9)
    this.followText = this.addText(followRoot, "↺ FOLLOW", 9.4, 2.6, 34, LINGO_COLORS.white, new vec3(0, 0, 1.35))
    followButton.onTriggerUp.add(() => {
      this.audio.playClick()
      this.panelFollow = true
      this.panelBillboard.enabled = true
      this.panelSmoothed = null
    })
  }


  private addNavButton(parent: SceneObject, label: string, position: vec3, onClick: () => void): Text {
    const root = this.makeObject(parent, `Glossary Nav ${label}`, position)
    const button = root.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Capsule", style: "Primary"})
    styleLingoButton(button, label === "X" ? "neutral" : "primary")
    this.enforceButtonSize(button, 4.2, 4.2, 2.1)
    const text = this.addText(root, label, 3, 2.6, 40, LINGO_COLORS.white, new vec3(0, 0, 1.35))
    button.onTriggerUp.add(onClick)
    return text
  }

  private addImage(parent: SceneObject, texture: Texture, size: number, name: string, position: vec3): SceneObject {
    const root = this.makeObject(parent, name, position)
    const image = root.createComponent("Component.Image") as Image
    image.stretchMode = StretchMode.Fit
    const material = IMAGE_MATERIAL_ASSET.clone()
    material.mainPass.baseTex = texture
    material.mainPass.baseColor = new vec4(1, 1, 1, 1)
    material.mainPass.blendMode = BlendMode.Normal
    material.mainPass.depthTest = false
    material.mainPass.depthWrite = false
    material.mainPass.twoSided = true
    image.clearMaterials()
    image.addMaterial(material)
    image.setRenderOrder(ORDER.image)
    root.getTransform().setLocalScale(new vec3(size, size, 1))
    return root
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, size: number, color: vec4, position: vec3): Text {
    const root = this.makeObject(parent, `Glossary Text`, position)
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
    text.setRenderOrder(ORDER.text)
    return text
  }

  private enforceButtonSize(button: Button, width: number, height: number, radius: number): void {
    const size = new vec3(width, height, 1)
    button.size = size
    this.sizedButtons.push({button, size, radius})
    button.onInitialized.add(() => this.applyButtonSizes())
  }

  private applyButtonSizes(): void {
    for (let i = 0; i < this.sizedButtons.length; i++) {
      const entry = this.sizedButtons[i]
      if (isNull(entry.button)) continue
      entry.button.size = entry.size
      const visual = entry.button.visual as RoundedRectangleVisual
      if (visual instanceof RoundedRectangleVisual) visual.cornerRadius = entry.radius
    }
  }

  /** Buttons build their visuals late: the pass lifts them above the background
   * and re-asserts every button's intended size and pill corners. */
  private scheduleOrderPass(): void {
    const delays = [0.3, 1.2]
    for (let i = 0; i < delays.length; i++) {
      const delayed = this.host.createEvent("DelayedCallbackEvent")
      delayed.bind(() => {
        if (isNull(this.root)) return
        this.applyButtonSizes()
        this.applyOrders(this.root, false)
      })
      delayed.reset(delays[i])
    }
  }

  private applyOrders(object: SceneObject, insideButton: boolean): void {
    const isButton = insideButton || !!object.getComponent(Button.getTypeName())
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i]
      const typeName = visual.getTypeName()
      if (isButton) {
        if (typeName === "Component.Text") visual.setRenderOrder(ORDER.buttonText)
        else if (typeName === "Component.Image") visual.setRenderOrder(ORDER.buttonIcon)
        else visual.setRenderOrder(ORDER.buttonMesh)
      }
    }
    for (let i = 0; i < object.getChildrenCount(); i++) {
      this.applyOrders(object.getChild(i), isButton)
    }
  }

  private makeObject(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
}
