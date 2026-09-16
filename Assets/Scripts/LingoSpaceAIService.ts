/** OpenAI via Remote Service Gateway plus Specs ASR/TTS voice coaching. */
import {OpenAI} from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI"
import {OpenAITypes} from "RemoteServiceGateway.lspkg/HostedExternal/OpenAITypes"
import {Promisfy} from "RemoteServiceGateway.lspkg/Utils/Promisfy"
import {
  CATEGORY_IDS,
  CategoryId,
  LanguageId,
  NormalizedBounds,
  ScanObjectCard,
  ScanSituation,
  SituationPhrase,
  VocabularyCard,
} from "./LingoSpaceData"

export type PronunciationAssessment = {
  correct: boolean
  heard: string
  feedback: string
}

export class LingoSpaceAIService {
  private asrModule: AsrModule = require("LensStudio:AsrModule")
  private remoteMediaModule = require("LensStudio:RemoteMediaModule") as RemoteMediaModule
  private internetModule = require("LensStudio:InternetModule") as InternetModule
  private voiceAudio: AudioComponent
  private listening = false
  private latestTranscript = ""
  private finalTranscript = ""
  private releaseRequested = false
  private cleanupRequired = false
  private receivedTranscription = false
  private sessionGeneration = 0
  private resolveListening: ((text: string) => void) | null = null
  private rejectListening: ((error: Error) => void) | null = null

  private speechActive = false
  private speechStart: (() => void) | null = null
  private speechEnd: (() => void) | null = null

  constructor(_owner: SceneObject) {
    // Scene-root on purpose: a child of the head-following panel would drag a
    // card-anchored voice around with every head turn, MOVE grab, or zoom.
    const audioObject = global.scene.createSceneObject("LingoSpace AI Voice")
    this.voiceAudio = audioObject.createComponent("Component.AudioComponent") as AudioComponent
    this.voiceAudio.volume = 0.9
  }

  /** Lets the app duck background music while the AI voice is playing. */
  setSpeechHooks(onStart: () => void, onEnd: () => void): void {
    this.speechStart = onStart
    this.speechEnd = onEnd
    this.voiceAudio.setOnFinish(() => this.finishSpeech())
  }

  private beginSpeech(): void {
    if (this.speechActive) return
    this.speechActive = true
    if (this.speechStart) this.speechStart()
  }

  private finishSpeech(): void {
    if (!this.speechActive) return
    this.speechActive = false
    if (this.speechEnd) this.speechEnd()
  }

  initialize(): void {
    this.voiceAudio.playbackMode = Audio.PlaybackMode.LowLatency
    // Deliberately NOT touching spatialAudio here: configuring the spatializer
    // at boot reconfigures the device audio session, and the microphone shares
    // that pipeline — spatial setup happens lazily on the first anchored speech.
  }

  /** True once the spatializer has been configured (first anchored speech). */
  private spatialConfigured = false

  /** Where the NEXT utterance should come from: a card's world anchor so the
   * object itself appears to speak, or the wearer (null) for coaching and menu
   * guidance. Applied when that utterance actually starts playing, so a slow
   * TTS response can never relocate a different utterance already in flight. */
  private pendingSpeechAnchor: vec3 | null = null

  setSpeechAnchor(position: vec3 | null): void {
    this.pendingSpeechAnchor = position
  }

  private applySpeechAnchor(position: vec3 | null): void {
    if (position) {
      if (!this.spatialConfigured) {
        this.spatialConfigured = true
        // Objects Talk: full volume within a meter, fading toward room scale.
        const distance = this.voiceAudio.spatialAudio.distanceEffect
        distance.enabled = true
        distance.minDistance = 100
        distance.maxDistance = 2000
      }
      this.voiceAudio.getSceneObject().getTransform().setWorldPosition(position)
      this.voiceAudio.spatialAudio.enabled = true
    } else if (this.spatialConfigured) {
      this.voiceAudio.spatialAudio.enabled = false
    }
  }

  identifySituation(base64Jpeg: string, nativeLanguage: LanguageId, targetLanguage: LanguageId, knownWords: string[] = []): Promise<ScanSituation> {
    const prompt = [
      "Analyze this first-person camera frame as a real-world communication situation for a language learner.",
      knownWords.length > 0
        ? `Vocabulary already learned this session: ${knownWords.join(", ")}. If a detected object IS one of these, reuse EXACTLY that word spelling for its word field. Never add an object merely because it appears in this list.`
        : "",
      "First classify the environment: name the specific room or place actually visible (for example living room, bedroom, kitchen, bathroom, office, café, street or shop), judging only from the furniture and layout in this exact image.",
      "Keep situation and situationTranslation to one or two words naming that environment; never reuse an environment from any previous scene.",
      "Judge ONLY this image: never assume objects from typical room layouts or from any previous scene.",
      "Identify one to five distinct, clearly visible useful objects. Do not include blurry, hidden, duplicated or uncertain objects.",
      "Identify each object strictly by its visible traits — a photo camera has a lens barrel, a laptop has a keyboard and hinged screen, a monitor has no keyboard. If you cannot tell similar devices apart, omit the object.",
      `For every object, return a precise neutral English singular objectName, its beginner-friendly name in ${targetLanguage}, and its translation in ${nativeLanguage}.`,
      `For every object also return phonetic: how the ${targetLanguage} word field sounds — NEVER the ${nativeLanguage} translation — as hyphen-separated syllables with the stressed syllable in CAPITALS, spelled so that a ${nativeLanguage} speaker reading it aloud produces the ${targetLanguage} sounds, no IPA (for Japanese words use romaji syllables).`,
      targetLanguage === "Japanese"
        ? "Write every Japanese word in kana a beginner can read: prefer common katakana loanwords when natural (for example コンピュータ), else hiragana. Never use rare or complex kanji."
        : "",
      "For visualDescription, write one literal English sentence describing only the visible object's identity and distinguishing traits: object type, color, material, shape and visible parts.",
      "The visualDescription must identify the exact object inside its bounding box and must not describe a related object, brand, symbol, activity, container or surrounding scene.",
      "Disambiguate nouns explicitly: for example write 'portable Bluetooth audio speaker with a perforated front grille', not only 'speaker'.",
      "For every object return a normalized bounding box [x,y,width,height] using 0..1 coordinates relative to the full image, where x,y is the top-left corner.",
      "The bounding box must tightly enclose only the visible object itself — not its shadow, container, or surroundings — and its center must land on the object's body. Bounding box precision is critical: double-check each box against the image before answering.",
      "For every object also return distanceMeters: your best estimate of the straight-line distance from the camera to that object in meters (a number like 0.8 or 2.5), judged from perspective, floor position and familiar object sizes. Distance accuracy matters: it anchors the object in 3D space.",
      "Choose one or more card organization contexts only from HOME, FOOD, WORK, TRAVEL, PEOPLE, OUTSIDE.",
      `Create exactly one short, practical phrase in ${targetLanguage} for every object, in the same order as objects. Phrase 0 must relate to object 0, phrase 1 to object 1, and so on.`,
      "Each phrase must help the learner act or communicate in this exact situation, not merely name the object.",
      "Keep every phrase between 3 and 8 words so it fits the word-ordering game.",
      `For every phrase, write intent, translation and usageTip only in ${nativeLanguage}.`,
      `pronunciationHint must transcribe how the ${targetLanguage} phrase in target sounds — never the translation — using ${nativeLanguage} spelling conventions so the learner can read it aloud.`,
      "usageTip must explain briefly when or how the learner would use that phrase with the visible object or person.",
      `Write situationTranslation and summary only in ${nativeLanguage}. Keep summary under 18 words.`,
      `Do not put English in word or target unless ${targetLanguage} is English. Do not put Spanish in UI guidance unless ${nativeLanguage} is Spanish.`,
      "Return JSON only in this shape: {\"situation\":string,\"situationTranslation\":string,\"summary\":string,\"objects\":[{\"objectName\":string,\"visualDescription\":string,\"word\":string,\"translation\":string,\"phonetic\":string,\"contexts\":[string],\"bounds\":[number,number,number,number],\"distanceMeters\":number}],\"phrases\":[{\"objectIndex\":number,\"intent\":string,\"target\":string,\"translation\":string,\"pronunciationHint\":string,\"usageTip\":string}]}. objectIndex is zero-based.",
    ].filter((line) => line.length > 0).join(" ")

    const messages: OpenAITypes.ChatCompletions.Message[] = [
      {role: "system", content: "You are a cautious visual language tutor. Ground every answer in the visible scene and teach immediately useful communication."},
      {
        role: "user",
        content: [
          {type: "text", text: prompt},
          {type: "image_url", image_url: {url: `data:image/jpeg;base64,${base64Jpeg}`, detail: "high"}},
        ],
      },
    ]

    return OpenAI.chatCompletions({
      model: "gpt-4.1-mini",
      messages,
      response_format: {type: "json_object"},
      temperature: 0.2,
      max_completion_tokens: 1300,
    }).then((response) => {
      const content = response.choices?.[0]?.message?.content
      if (!content) throw new Error("Situation analysis returned no content")
      const parsed = JSON.parse(this.stripCodeFence(content)) as {
        situation?: string
        situationTranslation?: string
        summary?: string
        objects?: {objectName?: string, visualDescription?: string, word?: string, translation?: string, phonetic?: string, contexts?: string[], bounds?: number[], distanceMeters?: number}[]
        phrases?: {objectIndex?: number, intent?: string, target?: string, translation?: string, pronunciationHint?: string, usageTip?: string}[]
      }
      const rawCards = Array.isArray(parsed.objects) ? parsed.objects : []
      const objects: ScanObjectCard[] = []
      const seenWords: string[] = []
      for (let i = 0; i < rawCards.length && objects.length < 5; i++) {
        const raw = rawCards[i]
        if (!raw) continue
        const word = String(raw.word || "").trim()
        const translation = String(raw.translation || "").trim()
        const contexts = this.validContexts(raw.contexts)
        const normalizedWord = word.toLowerCase()
        if (!word || !translation || contexts.length === 0 || seenWords.indexOf(normalizedWord) >= 0) continue
        seenWords.push(normalizedWord)
        const objectName = String(raw.objectName || translation).trim()
        objects.push({
          objectName,
          visualDescription: String(raw.visualDescription || `A clearly visible ${objectName}.`).trim(),
          word,
          translation,
          phonetic: String(raw.phonetic || "").trim(),
          contexts,
          bounds: this.validBounds(raw.bounds, objects.length),
          distanceMeters: Math.max(0, Math.min(8, Number(raw.distanceMeters) || 0)),
        })
      }
      const phrases: SituationPhrase[] = []
      const rawPhrases = Array.isArray(parsed.phrases) ? parsed.phrases : []
      for (let i = 0; i < rawPhrases.length && phrases.length < objects.length; i++) {
        const raw = rawPhrases[i]
        if (!raw) continue
        const target = String(raw.target || "").trim()
        const translation = String(raw.translation || "").trim()
        if (!target || !translation) continue
        phrases.push({
          objectIndex: phrases.length,
          intent: String(raw.intent || objects[phrases.length]?.translation || `Phrase ${phrases.length + 1}`).trim(),
          target,
          translation,
          pronunciationHint: String(raw.pronunciationHint || this.fallbackCoaching(nativeLanguage)).trim(),
          usageTip: String(raw.usageTip || raw.intent || this.fallbackUsage(nativeLanguage)).trim(),
        })
      }
      if (objects.length === 0) throw new Error("Situation analysis contained no usable objects")
      if (phrases.length === 0) throw new Error("Situation analysis contained no usable phrases")
      const alignedCount = Math.min(objects.length, phrases.length)
      return {
        situation: String(parsed.situation || "Everyday situation").trim(),
        situationTranslation: String(parsed.situationTranslation || parsed.situation || "Everyday situation").trim(),
        summary: String(parsed.summary || this.fallbackSummary(nativeLanguage)).trim(),
        objects: objects.slice(0, alignedCount),
        phrases: phrases.slice(0, alignedCount),
      }
    })
  }

  generateCardArtwork(objectName: string, visualDescription: string): Promise<Texture> {
    const prompt = [
      `IDENTITY LOCK: Create exactly one clearly recognizable ${objectName}.`,
      `The scanned object was described as: ${visualDescription}`,
      `The final illustration must preserve the same object category and visible distinguishing features so a learner immediately recognizes it as ${objectName}.`,
      "Do not reinterpret the noun, substitute a related object, show a logo or symbol for it, or add any object not requested.",
      "Cute kawaii soft 3D illustration, clay-like rounded shapes, plush and toy-like appearance, soft inflated forms, smooth matte materials with subtle glossy highlights.",
      "Pastel palette using lavender purple, mint turquoise, baby blue, soft coral pink and warm cream.",
      "Soft studio lighting, subtle ambient occlusion, gentle object shadow, polished mobile game UI aesthetic, cozy friendly educational app style.",
      "Slightly chunky proportions, adorable and playful, clean high-quality 3D render.",
      "No photorealism, no hard edges, no flat vector style, no outlines, no text, no labels, no border, no scenery.",
      `Single ${objectName} only, centered composition, fully visible, transparent background PNG. Object accuracy is more important than decoration.`,
    ].join(" ")
    print(`LINGO SPACE generating kawaii card artwork: ${objectName}`)
    return OpenAI.imagesGenerate({
      // The mini image model keeps transparent PNG generation inside the
      // Remote Service Gateway's short request window.
      model: "gpt-image-1-mini",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
      background: "transparent",
      output_format: "png",
    }).then((response) => {
      const result = response.data?.[0]
      const b64 = result?.b64_json
      if (b64) {
        print(`LINGO SPACE received card artwork: ${objectName} (${b64.length} base64 chars)`)
        return new Promise<Texture>((resolve, reject) => {
          Base64.decodeTextureAsync(
            b64,
            (texture) => resolve(texture),
            () => reject(new Error("Could not decode generated card artwork")),
          )
        })
      }
      const url = result?.url
      if (!url) throw new Error("Card artwork returned no image data")
      const request = RemoteServiceHttpRequest.create()
      request.url = url
      return Promisfy.InternetModule.performHttpRequest(this.internetModule, request)
        .then((httpResponse) => Promisfy.RemoteMediaModule.loadResourceAsImageTexture(
          this.remoteMediaModule,
          httpResponse.asResource(),
        ))
    })
  }

  isListening(): boolean {
    return this.listening
  }

  startListening(onPartial: (text: string) => void, onError: (message: string) => void): boolean {
    if (this.listening) {
      // A zombie session (its release was lost) must never brick the mic:
      // abort it and start fresh instead of refusing forever.
      print("[LINGO ASR] stale session detected; aborting before fresh start")
      this.abortListening()
    }
    if (this.voiceAudio.isPlaying()) {
      this.voiceAudio.stop(false)
      this.finishSpeech()
    }
    // The mic shares the audio pipeline: never listen with the spatializer on.
    this.applySpeechAnchor(null)
    this.listening = true
    this.latestTranscript = ""
    this.finalTranscript = ""
    this.releaseRequested = false
    this.cleanupRequired = true
    this.receivedTranscription = false
    this.resolveListening = null
    this.rejectListening = null
    const generation = ++this.sessionGeneration
    const options = AsrModule.AsrTranscriptionOptions.create()
    options.silenceUntilTerminationMs = 800
    options.mode = AsrModule.AsrMode.HighAccuracy
    options.onTranscriptionUpdateEvent.add((event: AsrModule.TranscriptionUpdateEvent) => {
      if (generation !== this.sessionGeneration || !this.listening) return
      const text = (event.text || "").trim()
      if (text) this.receivedTranscription = true
      if (text) this.latestTranscript = text
      if (event.isFinal && text) this.finalTranscript = text
      onPartial(this.latestTranscript)
      print(`[LINGO ASR] partial="${event.text}" final=${event.isFinal}`)
      if (event.isFinal && this.releaseRequested) this.completeListening(this.finalTranscript || this.latestTranscript, true)
    })
    options.onTranscriptionErrorEvent.add((code: AsrModule.AsrStatusCode) => {
      if (generation !== this.sessionGeneration || !this.listening) return
      this.listening = false
      this.cleanupRequired = false
      const message = this.asrErrorMessage(code)
      print(`[LINGO ASR] ${message}`)
      onError(message)
      if (this.rejectListening) this.rejectListening(new Error(message))
      this.clearListeningPromise()
    })
    try {
      print("[LINGO ASR] startTranscribing called")
      this.asrModule.startTranscribing(options)
      return true
    } catch (error) {
      this.listening = false
      this.cleanupRequired = false
      const message = `ASR error: ${error}`
      print(`[LINGO ASR] ${message}`)
      onError(message)
      return false
    }
  }

  finishListening(): Promise<string> {
    if (!this.listening) return Promise.resolve(this.finalTranscript || this.latestTranscript)
    this.releaseRequested = true
    print("[LINGO ASR] release; waiting for final transcription")
    if (this.finalTranscript) {
      return new Promise((resolve, reject) => {
        this.resolveListening = resolve
        this.rejectListening = reject
        this.completeListening(this.finalTranscript, true)
      })
    }
    return new Promise((resolve, reject) => {
      this.resolveListening = resolve
      this.rejectListening = reject
    })
  }

  forceFinalizeListening(): void {
    if (!this.listening || !this.releaseRequested) return
    print(`[LINGO ASR] final timeout; using latest transcript="${this.latestTranscript}"`)
    this.completeListening(this.finalTranscript || this.latestTranscript, false)
  }

  /** Hard stop for menu exits and abandoned holds: unlike forceFinalizeListening,
   * this works without a prior finishListening() release, so a session can never
   * be left open (which would refuse every later hold-to-talk). stopTranscribing
   * follows the SAME deliberate rule as needsForcedCleanup: a session that
   * already produced text terminates itself on silence — forcing a stop on it
   * can wedge the ASR module on device. */
  abortListening(): void {
    if (!this.listening) {
      if (this.needsForcedCleanup()) this.cleanupListening()
      return
    }
    this.releaseRequested = true
    this.completeListening(this.finalTranscript || this.latestTranscript, false)
    if (this.needsForcedCleanup()) this.cleanupListening()
  }

  coachPronunciation(
    transcript: string,
    card: VocabularyCard,
    nativeLanguage: LanguageId,
    targetLanguage: LanguageId,
  ): Promise<PronunciationAssessment> {
    const localCorrect = this.pronunciationMatches(transcript, card.word)
    if (localCorrect) {
      return Promise.resolve({correct: true, heard: transcript, feedback: ""})
    }
    const messages: OpenAITypes.ChatCompletions.Message[] = [
      {
        role: "system",
        content: [
          `You are a supportive pronunciation coach for a beginner studying ${targetLanguage}.`,
          "Judge only whether the ASR text plausibly represents the target expression.",
          "Be lenient: if a patient native listener would understand the learner meant the target expression, mark it correct.",
          "Accept missing or wrong articles, minor vowel differences, regional accent variations, and ASR spelling quirks.",
          "ASR often writes a correctly spoken short foreign phrase phonetically in Cyrillic or another alphabet; compare how it sounds, not how it is spelled, while rejecting unrelated words.",
          "Mark incorrect only when the sounds clearly point to a different word or the attempt is unrecognizable.",
          "Return JSON only: {\"correct\": boolean, \"coaching\": string}.",
          `If incorrect, coaching must be written only in ${nativeLanguage}.`,
          "Give one concrete articulation tip, at most 18 words, specific to this expression and target language.",
          "Describe lips, tongue, vowel length, consonants, syllable timing, or rhythm as useful.",
          "Do not reproduce the target expression, its translation, or what ASR heard. Do not add a verdict or quotation marks.",
          "If correct, coaching must be an empty string.",
          "Never claim precise phoneme or accent scoring.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Target expression: "${card.word}" (${card.translation}). ASR heard: "${transcript}".`,
      },
    ]
    return OpenAI.chatCompletions({
      model: "gpt-4.1-mini",
      messages,
      response_format: {type: "json_object"},
      temperature: 0.1,
      max_completion_tokens: 100,
    }).then((response) => {
      const content = response.choices?.[0]?.message?.content
      if (!content) throw new Error("Pronunciation coach returned no content")
      const parsed = JSON.parse(this.stripCodeFence(content)) as {correct?: boolean, coaching?: string}
      let correct = parsed.correct === true
      // Safety net against an over-strict verdict: a high sound-similarity
      // attempt passes even when the model hesitates.
      if (!correct && this.similarityScore(transcript, card.word) >= 72) {
        correct = true
        print("[LINGO ASR] similarity override: accepting close attempt despite AI verdict")
      }
      const feedback = correct ? "" : (String(parsed.coaching || "").trim().slice(0, 180) || this.fallbackCoaching(nativeLanguage))
      print(`[LINGO ASR] OpenAI phonetic verdict correct=${correct}`)
      return {correct, heard: transcript, feedback}
    }).catch((error) => {
      print(`[LINGO ASR] coaching fallback: ${error}`)
      const correct = this.similarityScore(transcript, card.word) >= 72
      return {correct, heard: transcript, feedback: correct ? "" : this.fallbackCoaching(nativeLanguage)}
    })
  }

  /** Rough 0-100 score from ASR-vs-target sound distance; the coach verdict stays authoritative. */
  similarityScore(heard: string, target: string): number {
    const heardCore = this.removeLeadingArticle(this.normalizePhrase(heard))
    const targetCore = this.removeLeadingArticle(this.normalizePhrase(target))
    if (!heardCore || !targetCore) return 0
    const distance = this.levenshtein(heardCore, targetCore)
    return Math.round(Math.max(0, Math.min(1, 1 - distance / Math.max(heardCore.length, targetCore.length))) * 100)
  }

  speak(text: string, instructions: string): Promise<void> {
    // Each utterance owns the anchor set when it was requested, applied only
    // when its audio is ready to play.
    const anchor = this.pendingSpeechAnchor
    return OpenAI.speech({
      model: "gpt-4o-mini-tts",
      input: text,
      voice: "coral",
      instructions,
    }).then((track) => {
      this.applySpeechAnchor(anchor)
      this.voiceAudio.audioTrack = track
      this.beginSpeech()
      this.voiceAudio.play(1)
    })
  }

  speakSituationGuide(
    objectWord: string,
    targetPhrase: string,
    usageTip: string,
    targetLanguage: LanguageId,
    nativeLanguage: LanguageId,
  ): Promise<void> {
    return this.speak(
      `${objectWord}. ${targetPhrase}. ${usageTip}`,
      `Teach a real-world interaction. Pronounce the first two segments clearly in ${targetLanguage}, then explain the final segment naturally in ${nativeLanguage}. Do not translate, add, repeat, or omit anything.`,
    )
  }

  private validContexts(values?: string[]): CategoryId[] {
    if (!values) return []
    const result: CategoryId[] = []
    for (let i = 0; i < values.length; i++) {
      const value = String(values[i] ?? "").toUpperCase() as CategoryId
      if (CATEGORY_IDS.indexOf(value) >= 0 && result.indexOf(value) < 0) result.push(value)
    }
    return result
  }

  private validBounds(values: number[] | undefined, fallbackIndex: number): NormalizedBounds {
    if (!values || values.length < 4) {
      const column = fallbackIndex % 3
      const row = Math.floor(fallbackIndex / 3)
      return {x: 0.08 + column * 0.31, y: 0.14 + row * 0.42, width: 0.24, height: 0.28}
    }
    const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))
    const width = clamp(Number(values[2]) || 0.2, 0.05, 0.8)
    const height = clamp(Number(values[3]) || 0.2, 0.05, 0.8)
    return {
      x: clamp(Number(values[0]) || 0, 0, 1 - width),
      y: clamp(Number(values[1]) || 0, 0, 1 - height),
      width,
      height,
    }
  }

  private fallbackCoaching(nativeLanguage: LanguageId): string {
    switch (nativeLanguage) {
      case "Spanish": return "Escucha el modelo, separa las sílabas y repite con un ritmo uniforme."
      case "English": return "Listen to the model, separate the syllables, and repeat with an even rhythm."
      case "German": return "Höre das Vorbild, trenne die Silben und wiederhole sie in gleichmäßigem Rhythmus."
      case "French": return "Écoute le modèle, sépare les syllabes et répète avec un rythme régulier."
      case "Italian": return "Ascolta il modello, separa le sillabe e ripeti con un ritmo uniforme."
      case "Japanese": return "お手本を聞き、音節を分けて、一定のリズムでもう一度発音してください。"
    }
  }

  private fallbackUsage(nativeLanguage: LanguageId): string {
    switch (nativeLanguage) {
      case "Spanish": return "Úsala cuando quieras interactuar con este objeto en esta situación."
      case "English": return "Use it when you need to interact with this object in this situation."
      case "German": return "Verwende es, wenn du in dieser Situation mit diesem Gegenstand interagierst."
      case "French": return "Utilise-la pour interagir avec cet objet dans cette situation."
      case "Italian": return "Usala quando devi interagire con questo oggetto in questa situazione."
      case "Japanese": return "この状況でこの物を使ってやり取りするときに使います。"
    }
  }

  private fallbackSummary(nativeLanguage: LanguageId): string {
    switch (nativeLanguage) {
      case "Spanish": return "Elige un objeto para aprender qué decir en esta situación."
      case "English": return "Choose an object to learn what to say in this situation."
      case "German": return "Wähle einen Gegenstand, um passende Sätze für diese Situation zu lernen."
      case "French": return "Choisis un objet pour apprendre quoi dire dans cette situation."
      case "Italian": return "Scegli un oggetto per imparare cosa dire in questa situazione."
      case "Japanese": return "物を選んで、この場面で使える表現を学びましょう。"
    }
  }

  private stripCodeFence(value: string): string {
    return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  }

  private completeListening(transcript: string, sessionEndedNaturally: boolean): void {
    if (!this.listening) return
    this.listening = false
    this.releaseRequested = false
    this.cleanupRequired = !sessionEndedNaturally
    const resolve = this.resolveListening
    print(`[LINGO ASR] final accepted; transcript="${transcript}"`)
    if (resolve) resolve(transcript)
    this.clearListeningPromise()
  }

  cleanupListening(): void {
    if (!this.cleanupRequired) {
      print("[LINGO ASR] session ended naturally; no forced stop needed")
      return
    }
    this.cleanupRequired = false
    this.asrModule.stopTranscribing()
      .then(() => {
        print("[LINGO ASR] session cleanup complete")
      })
      .catch((error) => {
        print(`[LINGO ASR] cleanup error: ${error}`)
      })
  }

  /** Give the engine a little more time after a visible partial; stop only
   * sessions that never produced any update at all.
   */
  needsForcedCleanup(): boolean {
    return this.cleanupRequired && !this.receivedTranscription
  }

  private clearListeningPromise(): void {
    this.resolveListening = null
    this.rejectListening = null
  }

  private asrErrorMessage(code: AsrModule.AsrStatusCode): string {
    switch (code) {
      case AsrModule.AsrStatusCode.Unauthenticated: return "ASR error: Unauthenticated"
      case AsrModule.AsrStatusCode.NoInternet: return "ASR error: NoInternet"
      case AsrModule.AsrStatusCode.InternalError: return "ASR error: InternalError"
      default: return `ASR error: ${code}`
    }
  }

  private pronunciationMatches(heard: string, target: string): boolean {
    const heardFull = this.normalizePhrase(heard)
    const targetFull = this.normalizePhrase(target)
    const heardCore = this.removeLeadingArticle(heardFull)
    const targetCore = this.removeLeadingArticle(targetFull)
    if (!heardCore || !targetCore) return false
    if (heardCore === targetCore) {
      print(`[LINGO ASR] pronunciation target="${targetCore}" heard="${heardCore}" similarity=1 correct=true`)
      return true
    }
    if (targetCore.length >= 3 && (` ${heardCore} `).indexOf(` ${targetCore} `) >= 0) {
      print(`[LINGO ASR] pronunciation target="${targetCore}" heard="${heardCore}" contained=true correct=true`)
      return true
    }
    const distance = this.levenshtein(heardCore, targetCore)
    const similarity = 1 - distance / Math.max(heardCore.length, targetCore.length)
    const correct = similarity >= 0.72
    print(`[LINGO ASR] pronunciation target="${targetCore}" heard="${heardCore}" similarity=${similarity.toFixed(2)} correct=${correct}`)
    return correct
  }

  private normalizePhrase(value: string): string {
    let normalized = value.toLowerCase()
    try { normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "") } catch (_) {}
    return normalized.replace(/[.,!?;:()[\]{}"“”'’\-_/\\]+/g, " ").replace(/\s+/g, " ").trim()
  }

  private removeLeadingArticle(value: string): string {
    const articles = ["el", "la", "los", "las", "un", "una", "the", "a", "an", "der", "die", "das", "ein", "eine", "le", "les", "il", "lo", "i", "gli", "l"]
    const parts = value.split(" ")
    if (parts.length > 1 && articles.indexOf(parts[0]) >= 0) parts.shift()
    return parts.join(" ")
  }

  private levenshtein(a: string, b: string): number {
    const previous: number[] = []
    const current: number[] = []
    for (let j = 0; j <= b.length; j++) previous[j] = j
    for (let i = 1; i <= a.length; i++) {
      current[0] = i
      for (let j = 1; j <= b.length; j++) {
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1))
      }
      for (let j = 0; j <= b.length; j++) previous[j] = current[j]
    }
    return previous[b.length]
  }

}
