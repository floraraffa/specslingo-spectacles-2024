/** CLOUD CATCHER: a 60-second pronunciation game in the room. Word bubbles float
 * in an arc in front of the wearer; saying one right sends the studied
 * language's cloud flying to eat it. Streaks multiply points, golden words are
 * worth triple, and missed words are modeled aloud and remembered for practice. */
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button515 as Button} from "./compat515/Button515"
import {afterComponentStart} from "./compat515/Timing515"
import {hasDenseScript, LanguageId, SpeakingLevel} from "./LingoSpaceData"
import {lingoCopy, LingoCopyKey} from "./LingoSpaceLocalization"
import {LINGO_COLORS, LINGO_FONT} from "./LingoSpaceTheme"
import {ART, artButton, artLabel, backButton, stripArrow} from "./LingoSpaceArtKit"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {LingoFX} from "./LingoSpaceFX"
import {deferDestroy} from "./LingoSpaceDeferredDestroy"

export type CatcherWord = {word: string, translation: string, phonetic: string, texture: Texture | null}
/** `attempts`: every spoken try (right or wrong), for the accuracy score. */
export type CatcherResult = {caught: number, attempts: number, score: number, bestStreak: number, missed: CatcherWord[]}

/** Words caught in one round for each star: 6 → ★★, 12 → ★★★. */
export const CATCHER_STAR_GOALS = [6, 12]

export function catcherStars(caught: number): number {
  return caught >= CATCHER_STAR_GOALS[1] ? 3 : caught >= CATCHER_STAR_GOALS[0] ? 2 : 1
}

const LANGUAGE_CLOUDS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../LingoDesign/nube-es.png") as Texture,
  English: requireAsset("../LingoDesign/nube-en.png") as Texture,
  German: requireAsset("../LingoDesign/nube-gr.png") as Texture,
  French: requireAsset("../LingoDesign/nube-fr.png") as Texture,
  Italian: requireAsset("../LingoDesign/nube-it.png") as Texture,
  Japanese: requireAsset("../LingoDesign/nube-jp.png") as Texture,
}

const ROUND_SECONDS = 60
/** Every word said right buys more time; the clock never goes above the round's start. */
const BONUS_SECONDS = 5
const BONUS_FLASH_SECONDS = 0.8
const SLOT_COUNT = 6
// Arc in front of the wearer: within the Spectacles field of view, alternating heights.
const SLOT_YAWS = [-34, -21, -7, 7, 21, 34]
const SLOT_HEIGHTS = [6, -6, 7, -5, 6, -6]
const ARC_DISTANCE = 115
const BUBBLE_SIZE = 15
const GOLDEN_CHANCE = 0.18
const ORDER = {plate: 40, image: 41, text: 42, buttonMesh: 43, buttonIcon: 44, buttonText: 45}
const CREAM = new vec4(1, 0.97, 0.91, 0.97)
const LILAC = new vec4(0.84, 0.72, 1, 1)
const GOLD_FILL = new vec4(1, 0.95, 0.72, 0.97)
const GOLD_BORDER = new vec4(1, 0.76, 0.2, 1)
const OK_COLOR = new vec4(0.08, 0.56, 0.4, 1)
const FIX_COLOR = new vec4(0.82, 0.34, 0.12, 1)
const HUD_BUTTON_WIDTH = 15
const HUD_BUTTON_HEIGHT = 3.8
const HUD_BUTTON_X = 8.5
/** Long enough for the hand ray to leave the HUD (SIK caches the colliders it pointed at). */
const TEARDOWN_DELAY = 2

type Bubble = {
  root: SceneObject
  word: CatcherWord
  golden: boolean
  base: vec3
  phase: number
  misses: number
  wiggle: number
}

export class LingoSpaceCloudCatcher {
  private root: SceneObject
  private fx: LingoFX
  private camera = WorldCameraFinderProvider.getInstance()
  private cloud!: SceneObject
  private hud!: SceneObject
  private timerText!: Text
  private scoreText!: Text
  private starsText!: Text
  private statusText!: Text
  private bubbles: (Bubble | null)[] = []
  private pool: CatcherWord[] = []
  private poolIndex = 0
  private nativeLanguage: LanguageId = "English"
  private level: SpeakingLevel = "A1"
  private running = false
  private remaining = ROUND_SECONDS
  private score = 0
  private caught = 0
  private attempts = 0
  private streak = 0
  private bestStreak = 0
  private missed: CatcherWord[] = []
  private busy = false
  private talkHeld = false
  private cloudHome = vec3.zero()
  private flight: {from: vec3, to: vec3, t: number, back: boolean, bubble: Bubble | null} | null = null
  private time = 0
  private bonusFlash = 0
  private _onHoldStart = new Event<void>()
  private _onHoldEnd = new Event<void>()
  private _onSpeak = new Event<string>()
  private _onFinished = new Event<CatcherResult>()
  private _onExit = new Event<void>()

  get onHoldStart(): PublicApi<void> { return this._onHoldStart.publicApi() }
  get onHoldEnd(): PublicApi<void> { return this._onHoldEnd.publicApi() }
  /** A missed word: model it aloud slowly. */
  get onSpeak(): PublicApi<string> { return this._onSpeak.publicApi() }
  get onFinished(): PublicApi<CatcherResult> { return this._onFinished.publicApi() }
  get onExit(): PublicApi<void> { return this._onExit.publicApi() }

  constructor(private host: BaseScriptComponent, private audio: LingoSpaceAudioController, private similarity: (heard: string, target: string) => number) {
    this.fx = new LingoFX(host)
    // Scene root: the arc stays anchored in the room, it does not follow the head.
    this.root = global.scene.createSceneObject("Cloud Catcher")
    this.root.enabled = false
    host.createEvent("UpdateEvent").bind(() => this.update())
  }

  isRunning(): boolean { return this.running }

  start(words: CatcherWord[], nativeLanguage: LanguageId, targetLanguage: LanguageId, level: SpeakingLevel): void {
    this.clear()
    this.nativeLanguage = nativeLanguage
    this.level = level
    this.pool = this.shuffle(words.slice())
    this.poolIndex = 0
    this.remaining = ROUND_SECONDS
    this.score = 0
    this.caught = 0
    this.attempts = 0
    this.streak = 0
    this.bestStreak = 0
    this.missed = []
    this.busy = false
    this.flight = null
    this.root.enabled = true

    const camPos = this.camera.getWorldPosition()
    const forward = this.flatForward()
    this.buildHud(camPos.add(forward.uniformScale(ARC_DISTANCE - 10)).add(new vec3(0, -26, 0)))
    this.cloudHome = camPos.add(forward.uniformScale(ARC_DISTANCE - 15)).add(new vec3(0, -12, 0))
    this.buildCloud(targetLanguage)
    for (let i = 0; i < SLOT_COUNT; i++) {
      const dir = this.rotateYaw(forward, SLOT_YAWS[i])
      const position = camPos.add(dir.uniformScale(ARC_DISTANCE)).add(new vec3(0, SLOT_HEIGHTS[i], 0))
      this.bubbles.push(null)
      this.spawnBubble(i, position, i * 0.08)
    }
    this.running = true
    this.refreshHud()
    // The goal up front: how many words make each star.
    this.setStatus(this.copy("catcherGoal").replace("{two}", String(CATCHER_STAR_GOALS[0])).replace("{three}", String(CATCHER_STAR_GOALS[1])), LINGO_COLORS.ink)
    this.scheduleOrderPass()
  }

  /** Teardown from outside (menu exit): no result. */
  stop(): void {
    this.releaseHold()
    this.running = false
    this.clear()
    this.root.enabled = false
  }

  /** The learner said something: catch the best-matching bubble, or help with the closest. */
  handleHeard(heard: string): void {
    this.busy = false
    if (!this.running) return
    if (heard) this.attempts += 1
    let best: Bubble | null = null
    let bestScore = 0
    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i]
      if (!bubble) continue
      const score = Math.max(this.similarity(heard, bubble.word.word), bubble.word.phonetic ? this.similarity(heard, bubble.word.phonetic) : 0)
      if (score > bestScore) {
        bestScore = score
        best = bubble
      }
    }
    print(`[LINGO CATCH] heard "${heard}" → best "${best ? best.word.word : "-"}" ${bestScore}%`)
    if (best && bestScore >= this.passScore()) {
      this.catchBubble(best)
      return
    }
    this.streak = 0
    this.audio.playSoftReturn()
    if (best && bestScore >= 35) {
      // Close but not quite: the bubble wiggles and the cloud models the word.
      best.misses += 1
      best.wiggle = 0.6
      if (best.misses === 1) this.missed.push(best.word)
      this.setStatus(`↻ ${best.word.word}  —  ${best.word.translation}`, FIX_COLOR)
      this._onSpeak.invoke(best.word.word)
    } else {
      this.setStatus(`↻ ${lingoCopy(this.nativeLanguage, "nothingHeard")}`, FIX_COLOR)
    }
    this.refreshHud()
  }

  /** A failed mic session frees the SAY button again. */
  unlock(): void {
    this.busy = false
  }

  /** Mic status while the hold is open. */
  setStatus(message: string, color: vec4 = LINGO_COLORS.ink): void {
    // Late mic replies can arrive after the round's HUD is gone.
    if (!this.statusText || isNull(this.statusText)) return
    this.statusText.text = message
    this.statusText.textFill.color = color
    this.statusText.size = hasDenseScript(message) ? 40 : 32
  }

  private passScore(): number {
    // Beginners get more room; advanced learners must be crisp.
    switch (this.level) {
      case "A0": return 55
      case "A1": return 60
      case "A2": return 65
      default: return 72
    }
  }

  private catchBubble(bubble: Bubble): void {
    this.streak += 1
    this.bestStreak = Math.max(this.bestStreak, this.streak)
    const multiplier = this.streak >= 5 ? 3 : this.streak >= 3 ? 2 : 1
    const points = 10 * multiplier * (bubble.golden ? 3 : 1)
    this.score += points
    this.caught += 1
    this.remaining = Math.min(ROUND_SECONDS, this.remaining + BONUS_SECONDS)
    this.bonusFlash = BONUS_FLASH_SECONDS
    this.audio.playSaved()
    const combo = multiplier > 1 ? `  ×${multiplier}` : ""
    this.setStatus(`✓ ${bubble.word.word}  +${points}${combo}${bubble.golden ? "  ★" : ""}  ⏱+${BONUS_SECONDS}s`, OK_COLOR)
    // The cloud flies to the bubble, eats it, and comes back home.
    this.flight = {from: this.cloud.getTransform().getWorldPosition(), to: bubble.base, t: 0, back: false, bubble}
    this.refreshHud()
  }

  private update(): void {
    if (!this.root.enabled) return
    const dt = getDeltaTime()
    this.time += dt
    const camPos = this.camera.getWorldPosition()
    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i]
      if (!bubble || isNull(bubble.root)) continue
      const bob = Math.sin(this.time * 1.4 + bubble.phase) * 1.2
      let shake = 0
      if (bubble.wiggle > 0) {
        bubble.wiggle = Math.max(0, bubble.wiggle - dt)
        shake = Math.sin(this.time * 40) * bubble.wiggle * 2.5
      }
      const position = bubble.base.add(new vec3(shake, bob, 0))
      const transform = bubble.root.getTransform()
      transform.setWorldPosition(position)
      transform.setWorldRotation(quat.lookAt(camPos.sub(position).normalize(), vec3.up()))
    }
    this.updateCloud(dt, camPos)
    if (this.hud && !isNull(this.hud)) {
      const hudPos = this.hud.getTransform().getWorldPosition()
      this.hud.getTransform().setWorldRotation(quat.lookAt(camPos.sub(hudPos).normalize(), vec3.up()))
    }
    if (!this.running) return
    if (this.bonusFlash > 0) {
      this.bonusFlash = Math.max(0, this.bonusFlash - dt)
      if (this.bonusFlash === 0) this.refreshHud()
    }
    this.remaining -= dt
    if (Math.floor(this.remaining + dt) !== Math.floor(this.remaining)) this.refreshHud()
    if (this.remaining <= 0) this.finish()
  }

  private updateCloud(dt: number, camPos: vec3): void {
    if (!this.cloud || isNull(this.cloud)) return
    const transform = this.cloud.getTransform()
    if (this.flight) {
      const flight = this.flight
      flight.t = Math.min(1, flight.t + dt / 0.45)
      const eased = 1 - Math.pow(1 - flight.t, 3)
      const arcLift = Math.sin(flight.t * Math.PI) * 6
      transform.setWorldPosition(vec3.lerp(flight.from, flight.to, eased).add(new vec3(0, arcLift, 0)))
      if (flight.t >= 1) {
        if (!flight.back && flight.bubble) {
          this.eatBubble(flight.bubble)
          this.flight = {from: flight.to, to: this.cloudHome, t: 0, back: true, bubble: null}
        } else {
          this.flight = null
        }
      }
    } else {
      transform.setWorldPosition(this.cloudHome.add(new vec3(0, Math.sin(this.time * 1.7) * 0.8, 0)))
    }
    const position = transform.getWorldPosition()
    transform.setWorldRotation(quat.lookAt(camPos.sub(position).normalize(), vec3.up()))
  }

  private eatBubble(bubble: Bubble): void {
    const slot = this.bubbles.indexOf(bubble)
    if (slot < 0) return
    this.bubbles[slot] = null
    // A happy gulp: the cloud bounces as it swallows the word.
    this.fx.popIn(this.cloud, {duration: 0.3, rotateDegrees: 12})
    const base = bubble.base
    this.fx.popOut(bubble.root, () => {
      if (!isNull(bubble.root)) deferDestroy(this.host, bubble.root)
    })
    if (this.running) this.spawnBubble(slot, base, 0.35)
  }

  private spawnBubble(slot: number, base: vec3, delay: number): void {
    const word = this.nextWord()
    if (!word) return
    const golden = Math.random() < GOLDEN_CHANCE
    const root = this.makeObject(this.root, `Catcher Bubble ${word.word}`)
    root.getTransform().setWorldPosition(base)
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(BUBBLE_SIZE, BUBBLE_SIZE)
    afterComponentStart(this.host, () => {
      if (isNull(root)) return
      const rounded = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
      if (!rounded) return
      rounded.gradient = false
      rounded.backgroundColor = golden ? GOLD_FILL : CREAM
      rounded.cornerRadius = BUBBLE_SIZE / 2
      rounded.border = true
      rounded.borderSize = golden ? 0.25 : 0.12
      rounded.borderColor = golden ? GOLD_BORDER : LILAC
    })
    if (word.texture) this.addImage(root, word.texture, 8, 8, new vec3(0, 2.2, 0.4), "Catcher Bubble Art")
    const label = this.addText(root, `${golden ? "★ " : ""}${word.word}`, BUBBLE_SIZE - 2, 3, 36, LINGO_COLORS.ink, new vec3(0, word.texture ? -3.6 : 0.6, 0.6))
    if (hasDenseScript(word.word)) label.size = 46
    if (word.phonetic) this.addText(root, word.phonetic, BUBBLE_SIZE - 2, 2, 26, LINGO_COLORS.purple, new vec3(0, word.texture ? -5.8 : -1.8, 0.6))
    const bubble: Bubble = {root, word, golden, base, phase: Math.random() * Math.PI * 2, misses: 0, wiggle: 0}
    this.bubbles[slot] = bubble
    this.fx.popIn(root, {delay, rotateDegrees: -12})
    this.scheduleOrderPass()
  }

  private nextWord(): CatcherWord | null {
    if (this.pool.length === 0) return null
    // Never two bubbles with the same word on screen.
    for (let tries = 0; tries < this.pool.length; tries++) {
      const word = this.pool[this.poolIndex % this.pool.length]
      this.poolIndex += 1
      if (this.poolIndex % this.pool.length === 0) this.pool = this.shuffle(this.pool)
      const visible = this.bubbles.some((bubble) => bubble && bubble.word.word === word.word)
      if (!visible) return word
    }
    return this.pool[0]
  }

  private finish(): void {
    if (!this.running) return
    this.running = false
    this.remaining = 0
    this.releaseHold()
    this.refreshHud()
    print(`[LINGO CATCH] round over: caught=${this.caught} score=${this.score} bestStreak=${this.bestStreak}`)
    const result: CatcherResult = {caught: this.caught, attempts: this.attempts, score: this.score, bestStreak: this.bestStreak, missed: this.missed.slice(0, 5)}
    // A beat to see the last catch before the results take over.
    const delayed = this.host.createEvent("DelayedCallbackEvent")
    delayed.bind(() => {
      this.clear()
      this.root.enabled = false
      this._onFinished.invoke(result)
    })
    delayed.reset(1.2)
  }

  private buildCloud(targetLanguage: LanguageId): void {
    this.cloud = this.makeObject(this.root, "Catcher Cloud")
    this.cloud.getTransform().setWorldPosition(this.cloudHome)
    this.addImage(this.cloud, LANGUAGE_CLOUDS[targetLanguage], 13, 13, vec3.zero(), "Catcher Cloud Art")
    this.fx.popIn(this.cloud, {rotateDegrees: 10})
  }

  private buildHud(position: vec3): void {
    this.hud = this.makeObject(this.root, "Catcher HUD")
    this.hud.getTransform().setWorldPosition(position)
    const plate = this.hud.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    plate.size = new vec2(40, 16)
    afterComponentStart(this.host, () => {
      if (isNull(this.hud)) return
      const rounded = this.hud.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
      if (!rounded) return
      rounded.gradient = false
      rounded.backgroundColor = CREAM
      rounded.cornerRadius = 3
      rounded.border = true
      rounded.borderSize = 0.1
      rounded.borderColor = LILAC
    })
    this.addText(this.hud, "☁ CLOUD CATCHER", 18, 2.6, 34, LINGO_COLORS.purple, new vec3(-9.5, 6.1, 0.6), HorizontalAlignment.Left)
    this.timerText = this.addText(this.hud, "", 9, 2.6, 36, LINGO_COLORS.ink, new vec3(5, 6.1, 0.6))
    this.scoreText = this.addText(this.hud, "", 12, 2.6, 34, OK_COLOR, new vec3(13.5, 6.1, 0.6))
    this.starsText = this.addText(this.hud, "", 37, 2.6, 32, GOLD_BORDER, new vec3(0, 3.1, 0.6))
    this.statusText = this.addText(this.hud, "", 37, 2.8, 32, LINGO_COLORS.ink, new vec3(0, 0.1, 0.6))
    // DECIR and VOLVER: the shared kit art, same width and height side by side.
    const sayMade = artButton(this.hud, ART.speak, HUD_BUTTON_WIDTH, "Catcher Say", new vec3(-HUD_BUTTON_X, -4.8, 0.8), HUD_BUTTON_HEIGHT)
    artLabel(sayMade.root, ART.speak, HUD_BUTTON_WIDTH, stripArrow(this.copy("catcherSay")), 32)
    const say = sayMade.button
    say.onTriggerDown.add(() => {
      if (!this.running || this.busy || this.flight) {
        this.audio.playSoftReturn()
        return
      }
      this.talkHeld = true
      this.busy = true
      this.setStatus(`● ${lingoCopy(this.nativeLanguage, "releaseToStop")}`, LINGO_COLORS.purple)
      this._onHoldStart.invoke()
    })
    say.onTriggerUp.add(() => this.releaseHold())
    const exit = backButton(this.hud, HUD_BUTTON_WIDTH, lingoCopy(this.nativeLanguage, "back"), 32, HUD_BUTTON_HEIGHT, new vec3(HUD_BUTTON_X, -4.8, 0.8)).made.button
    exit.onTriggerUp.add(() => {
      this.audio.playClick()
      this.stop()
      this._onExit.invoke()
    })
  }

  private releaseHold(): void {
    if (!this.talkHeld) return
    this.talkHeld = false
    this._onHoldEnd.invoke()
  }

  private refreshHud(): void {
    if (!this.timerText || isNull(this.timerText) || isNull(this.scoreText) || isNull(this.starsText)) return
    // Right after a catch the clock shows the bonus in green.
    const bonus = this.bonusFlash > 0 ? `  +${BONUS_SECONDS}` : ""
    this.timerText.text = `⏱ ${Math.max(0, Math.ceil(this.remaining))}${bonus}`
    this.timerText.textFill.color = this.bonusFlash > 0 ? OK_COLOR : this.remaining <= 10 ? FIX_COLOR : LINGO_COLORS.ink
    const combo = this.streak >= 5 ? " ×3" : this.streak >= 3 ? " ×2" : ""
    this.scoreText.text = `★ ${this.score}${combo}`
    // Star progress: what is earned so far and how many words to the next star.
    const stars = catcherStars(this.caught)
    const earned = "★".repeat(stars) + "☆".repeat(3 - stars)
    const next = CATCHER_STAR_GOALS.find((goal) => goal > this.caught)
    this.starsText.text = next === undefined
      ? `${earned}  ${this.caught}`
      : `${earned}  ·  ${this.copy("catcherToNext").replace("{count}", String(next - this.caught)).replace("{stars}", "★".repeat(stars + 1))}`
  }

  private clear(): void {
    this.flight = null
    this.bubbles = []
    // SIK buttons live in here: disable now, destroy later (avoids "Object is null").
    for (let i = this.root.getChildrenCount() - 1; i >= 0; i--) {
      const child = this.root.getChild(i)
      deferDestroy(this.host, child, TEARDOWN_DELAY)
    }
    // Nothing may touch the old round's objects again.
    this.hud = null as unknown as SceneObject
    this.cloud = null as unknown as SceneObject
    this.timerText = null as unknown as Text
    this.scoreText = null as unknown as Text
    this.starsText = null as unknown as Text
    this.statusText = null as unknown as Text
  }

  private flatForward(): vec3 {
    const forward = this.camera.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const flat = new vec3(forward.x, 0, forward.z)
    return flat.length > 0.001 ? flat.normalize() : new vec3(0, 0, -1)
  }

  private rotateYaw(direction: vec3, degrees: number): vec3 {
    return quat.angleAxis(degrees * MathUtils.DegToRad, vec3.up()).multiplyVec3(direction)
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const swap = items[i]
      items[i] = items[j]
      items[j] = swap
    }
    return items
  }

  private copy(key: LingoCopyKey): string {
    return lingoCopy(this.nativeLanguage, key)
  }

  private addImage(parent: SceneObject, texture: Texture, width: number, height: number, position: vec3, name: string): SceneObject {
    const root = this.makeObject(parent, name)
    root.getTransform().setLocalPosition(position)
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
    root.getTransform().setLocalScale(new vec3(width, height, 1))
    return root
  }

  private addText(parent: SceneObject, value: string, width: number, height: number, size: number, color: vec4, position: vec3, alignment: HorizontalAlignment = HorizontalAlignment.Center): Text {
    const root = this.makeObject(parent, "Catcher Text")
    root.getTransform().setLocalPosition(position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.font = LINGO_FONT
    text.depthTest = false
    text.size = size
    ;(text as Text & {weight?: number}).weight = 700
    text.horizontalAlignment = alignment
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Shrink
    text.verticalOverflow = VerticalOverflow.Shrink
    ;text.worldSpaceRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
    text.textFill.color = color
    return text
  }

  /** Everything here floats over the room: keep it above other content. */
  private scheduleOrderPass(): void {
    const delays = [0.3, 1.2]
    for (let i = 0; i < delays.length; i++) {
      const delayed = this.host.createEvent("DelayedCallbackEvent")
      delayed.bind(() => {
        if (!isNull(this.root)) this.applyOrders(this.root, false)
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
        continue
      }
      if (typeName === "Component.Text") visual.setRenderOrder(ORDER.text)
      else if (typeName === "Component.Image") visual.setRenderOrder(ORDER.image)
      else visual.setRenderOrder(ORDER.plate)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) this.applyOrders(object.getChild(i), isButton)
  }

  private makeObject(parent: SceneObject, name: string): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    return object
  }
}
