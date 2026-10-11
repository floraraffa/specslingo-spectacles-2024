/** CONNECT: a button left of MOVE / FOLLOW that opens a calm pop-up with ONLY
 * what is needed to link the website — the native language's cloud, the web
 * address and the NUBE code, all in the wearer's native language. The pop-up
 * covers the panel (nothing else to read or press) until DONE. */
import {LanguageId} from "./LingoSpaceData"
import {lingoCopy} from "./LingoSpaceLocalization"
import {LINGO_COLORS} from "./LingoSpaceTheme"
import {ART, artButton, artImage, artLabel, artPiece, hitButton, kitText, stripArrow} from "./LingoSpaceArtKit"
import {LINGO_WEB_URL} from "./LingoSpaceWeb"
import {LingoSpaceAudioController} from "./LingoSpaceAudioController"
import {LingoFX} from "./LingoSpaceFX"

const LANGUAGE_CLOUDS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../LingoDesign/nube-es.png") as Texture,
  English: requireAsset("../LingoDesign/nube-en.png") as Texture,
  German: requireAsset("../LingoDesign/nube-gr.png") as Texture,
  French: requireAsset("../LingoDesign/nube-fr.png") as Texture,
  Italian: requireAsset("../LingoDesign/nube-it.png") as Texture,
  Japanese: requireAsset("../LingoDesign/nube-jp.png") as Texture,
}
const PANEL_ART = artPiece(requireAsset("../ScreenDesign/background.png") as Texture, 638, 798)
const TITLE_PURPLE = new vec4(0.36, 0.16, 0.9, 1)
const SOFT_INK = new vec4(0.42, 0.38, 0.6, 1)

/** Above every panel, card and grab handle (those top out at 28). */
const ORDER = {panel: 40, image: 41, text: 42, buttonMesh: 43, buttonIcon: 44, buttonText: 45}
const POPUP_WIDTH = 46
/** Centered on the main panel, a little toward the wearer so it sits in front of it. */
const POPUP_POSITION = new vec3(0, 2, 9)

export class LingoSpaceWebConnect {
  readonly buttonRoot: SceneObject
  private popup: SceneObject | null = null
  private codeText: Text | null = null
  private language: LanguageId = "English"
  private code = ""
  private fx: LingoFX
  private label: Text

  constructor(private host: BaseScriptComponent, private panelRoot: SceneObject, private audio: () => LingoSpaceAudioController, position: vec3) {
    this.fx = new LingoFX(host)
    // Same height as MOVE / FOLLOW; teal so it reads as a different kind of action.
    const button = artButton(panelRoot, ART.scanTealB, 12.4, "Web Connect Button", position, 4)
    this.buttonRoot = button.root
    this.label = artLabel(button.root, artPiece(ART.scanTealB.texture, 502, 130, 0.5, 0.8), 12.4, lingoCopy("English", "webConnect"), 34)
    button.button.onTriggerUp.add(() => {
      this.audio().playClick()
      this.open()
    })
  }

  setLanguage(language: LanguageId): void {
    this.language = language
    this.label.text = lingoCopy(language, "webConnect")
  }

  setCode(code: string): void {
    this.code = code
    if (this.codeText && !isNull(this.codeText)) this.codeText.text = code
  }

  open(): void {
    this.close()
    const language = this.language
    const popup = global.scene.createSceneObject("Web Connect Popup")
    popup.setParent(this.panelRoot)
    popup.getTransform().setLocalPosition(POPUP_POSITION)
    this.popup = popup

    // Opaque kawaii panel; an invisible button over it swallows every tap meant for what's behind.
    const panelHeight = POPUP_WIDTH * PANEL_ART.aspect
    artImage(popup, PANEL_ART, POPUP_WIDTH, new vec3(0, 0, 0), "Web Connect Panel")
    hitButton(popup, POPUP_WIDTH - 2, panelHeight - 2, "Web Connect Blocker", new vec3(0, 0, 0.2))

    const top = panelHeight / 2
    artImage(popup, artPiece(LANGUAGE_CLOUDS[language], 1, 1), 14, new vec3(0, top - 10, 0.6), "Web Connect Cloud")
    const title = kitText(popup, lingoCopy(language, "webTitle"), POPUP_WIDTH - 8, 5.5, new vec3(0, top - 21, 0.8), 58, TITLE_PURPLE)
    title.horizontalOverflow = HorizontalOverflow.Wrap
    title.outlineSettings.enabled = true
    title.outlineSettings.size = 0.2
    title.outlineSettings.fill.color = LINGO_COLORS.white

    // 1. go to the website
    kitText(popup, lingoCopy(language, "webStep1"), POPUP_WIDTH - 10, 2.6, new vec3(0, top - 26.5, 0.8), 38, SOFT_INK, false)
    const urlWidth = POPUP_WIDTH - 8
    artImage(popup, ART.cloudPill, urlWidth, new vec3(0, top - 31, 0.6), "Web Connect Url Pill")
    kitText(popup, LINGO_WEB_URL, urlWidth * 0.84, 3, new vec3(0, top - 31, 0.8), 48, TITLE_PURPLE)

    // 2. type this code
    kitText(popup, lingoCopy(language, "webStep2"), POPUP_WIDTH - 10, 2.6, new vec3(0, top - 37, 0.8), 38, SOFT_INK, false)
    const codeWidth = POPUP_WIDTH - 8
    artImage(popup, ART.bubbleCream, codeWidth, new vec3(0, top - 43.5, 0.6), "Web Connect Code Bubble")
    this.codeText = kitText(popup, this.code || lingoCopy(language, "webWaiting"), codeWidth * 0.78, 5, new vec3(1, top - 43.5, 0.8), 80, LINGO_COLORS.ink)

    const done = artButton(popup, ART.next, 20, "Web Connect Done", new vec3(0, -top + 5, 1))
    artLabel(done.root, ART.next, 20, stripArrow(lingoCopy(language, "webDone")), 46)
    done.button.onTriggerUp.add(() => {
      this.audio().playClick()
      this.close()
    })

    this.applyOrders(popup, false)
    // SIK buttons build their visuals a frame or two later: order them again.
    const delays = [0.2, 1]
    for (let i = 0; i < delays.length; i++) {
      const event = this.host.createEvent("DelayedCallbackEvent")
      event.bind(() => {
        if (this.popup === popup && !isNull(popup)) this.applyOrders(popup, false)
      })
      event.reset(delays[i])
    }
    this.fx.popIn(popup, {rotateDegrees: -4, duration: 0.32})
  }

  close(): void {
    if (this.popup && !isNull(this.popup)) this.popup.destroy()
    this.popup = null
    this.codeText = null
  }

  private applyOrders(object: SceneObject, insideButton: boolean): void {
    const isButton = insideButton || object.name === "Web Connect Done"
    const visuals = object.getComponents("Component.BaseMeshVisual") as BaseMeshVisual[]
    for (let i = 0; i < visuals.length; i++) {
      const type = visuals[i].getTypeName()
      if (object.name === "Web Connect Panel") visuals[i].setRenderOrder(ORDER.panel)
      else if (isButton) visuals[i].setRenderOrder(type === "Component.Text" ? ORDER.buttonText : type === "Component.Image" ? ORDER.buttonIcon : ORDER.buttonMesh)
      else visuals[i].setRenderOrder(type === "Component.Text" ? ORDER.text : type === "Component.Image" ? ORDER.image : ORDER.panel)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) this.applyOrders(object.getChild(i), isButton)
  }
}
