/** Snap Cloud sync: the Lens signs in with the wearer's Snapchat identity, gets
 * the NUBE-XXXX-XXXX web code, uploads the Bitmoji, and saves progress per
 * studied language (level, XP, words with their drawings, talks, game record,
 * practice days) a few seconds after it changes. Offline or not yet signed in,
 * nothing breaks: changes wait and go up on the next flush.
 * Tables: supabase/lingo-schema.sql (lingo_*).
 * Credentials: the "Cloud Messages" project imported with the Supabase plugin
 * (Import Credentials) — Snap Cloud only accepts projects imported into the Lens.
 * That asset is git-ignored; without it the Lens simply stays offline. */
import {createClient} from "SupabaseClient.lspkg/supabase-snapcloud"
import {LanguageId} from "./LingoSpaceData"
import {LingoSpaceProgressStore} from "./LingoSpaceProgressStore"

const BUCKET = "lingo-media"
/** Wait this long after the last change before writing (bursts become one write). */
const FLUSH_DELAY = 4
const AUTH_RETRIES = 4
/** Drawings already uploaded (per word image path), so each goes up once. */
const UPLOADED_KEY = "lingo-cloud-uploaded-v1"
const MAX_UPLOADS_PER_FLUSH = 6

export class LingoSpaceCloudSync {
  private client: any = null
  private uid = ""
  private code = ""
  private signedIn = false
  private starting = false
  private flushing = false
  private dirty: Partial<Record<LanguageId, boolean>> = {}
  private flushEvent: DelayedCallbackEvent
  private uploaded: Record<string, boolean> = {}
  private bitmojiModule: BitmojiModule | null = null
  private remoteMediaModule: RemoteMediaModule | null = null
  private codeListeners: ((code: string) => void)[] = []

  constructor(private host: BaseScriptComponent, private progress: LingoSpaceProgressStore, private artworkFor: (label: string) => string | null) {
    this.flushEvent = host.createEvent("DelayedCallbackEvent")
    this.flushEvent.bind(() => this.flush())
    this.uploaded = this.loadUploaded()
    try {
      this.bitmojiModule = require("LensStudio:BitmojiModule") as BitmojiModule
      this.remoteMediaModule = require("LensStudio:RemoteMediaModule") as RemoteMediaModule
    } catch (error) {
      print(`LINGO CLOUD Bitmoji modules unavailable: ${error}`)
    }
    progress.onLanguageChanged = (language) => this.markDirty(language)
  }

  /** The web link code, once known ("" before sign-in). */
  getCode(): string {
    return this.code
  }

  /** Called with the code as soon as it exists (and right away if it already does). */
  onCode(listener: (code: string) => void): void {
    this.codeListeners.push(listener)
    if (this.code) listener(this.code)
  }

  start(): void {
    if (this.starting || this.signedIn) return
    let project: SupabaseProject | null = null
    try {
      // Literal path: Lens Studio only bundles assets named literally in requireAsset.
      project = requireAsset("../SupabaseProject Cloud Messages.supabaseProject") as SupabaseProject
    } catch (error) {
      print(`LINGO CLOUD project asset not loaded: ${error}`)
      project = null
    }
    if (!project || !project.url) {
      print(`LINGO CLOUD no Snap Cloud project imported (url: ${project ? "empty" : "no asset"}) — offline only`)
      return
    }
    if (!global.deviceInfoSystem.isInternetAvailable()) {
      print("LINGO CLOUD no internet — progress stays on the device for now")
      return
    }
    this.starting = true
    try {
      this.client = createClient(project.url, project.publicToken)
    } catch (error) {
      print(`LINGO CLOUD client error: ${error}`)
      this.starting = false
      return
    }
    this.authenticate(0)
  }

  markDirty(language: LanguageId): void {
    this.dirty[language] = true
    this.flushEvent.reset(FLUSH_DELAY)
  }

  // ---------- sign-in ----------

  private authenticate(attempt: number): void {
    this.client.auth.signInWithIdToken({provider: "snapchat", token: ""})
      .then((result: any) => {
        const user = result && result.data && result.data.user
        if (user && user.id) {
          this.onSignedIn(String(user.id))
          return
        }
        // The Snapchat token can lag right after boot: retry a few times.
        return this.client.auth.getSession().then((session: any) => {
          const existing = session && session.data && session.data.session && session.data.session.user
          if (existing && existing.id) {
            this.onSignedIn(String(existing.id))
            return
          }
          this.retryAuth(attempt, result && result.error ? JSON.stringify(result.error) : "no user")
        })
      })
      .catch((error: unknown) => this.retryAuth(attempt, String(error)))
  }

  private retryAuth(attempt: number, reason: string): void {
    if (attempt + 1 >= AUTH_RETRIES) {
      print(`LINGO CLOUD sign-in failed: ${reason}`)
      this.starting = false
      return
    }
    this.after(1 + attempt, () => this.authenticate(attempt + 1))
  }

  private onSignedIn(uid: string): void {
    this.uid = uid
    this.signedIn = true
    this.starting = false
    print("LINGO CLOUD signed in")
    this.client.rpc("lingo_issue_code", {p_rotate: false})
      .then((result: any) => {
        if (result && result.error) {
          print(`LINGO CLOUD code error: ${JSON.stringify(result.error)}`)
          return
        }
        this.code = String(result && result.data || "")
        // The code is shown in the Lens, never printed to the log.
        for (let i = 0; i < this.codeListeners.length; i++) this.codeListeners[i](this.code)
      })
      .catch((error: unknown) => print(`LINGO CLOUD code error: ${error}`))
    this.saveProfile(null)
    this.uploadBitmoji()
    // Everything studied so far goes up once.
    const languages = this.progress.studiedLanguages()
    for (let i = 0; i < languages.length; i++) this.dirty[languages[i]] = true
    this.flushEvent.reset(1)
  }

  // ---------- profile + Bitmoji ----------

  private saveProfile(avatarPath: string | null): void {
    const profile = this.progress.getProfile()
    const row: Record<string, unknown> = {
      user_id: this.uid,
      display_name: profile.userName || null,
      native_language: profile.nativeLanguage,
      updated_at: new Date().toISOString(),
    }
    if (avatarPath) row.avatar_path = avatarPath
    this.client.from("lingo_profiles").upsert(row, {onConflict: "user_id"})
      .then((result: any) => {
        if (result && result.error) print(`LINGO CLOUD profile error: ${JSON.stringify(result.error)}`)
      })
      .catch((error: unknown) => print(`LINGO CLOUD profile error: ${error}`))
  }

  /** The wearer's 2D Bitmoji (device only) → lingo-media/<uid>/avatar.png. */
  private uploadBitmoji(): void {
    if (!this.bitmojiModule || !this.remoteMediaModule || global.deviceInfoSystem.isEditor()) return
    const remote = this.remoteMediaModule
    try {
      global.userContextSystem.getCurrentUser((user: SnapchatUser) => {
        const options = Bitmoji2DOptions.create()
        options.user = user
        this.bitmojiModule!.requestBitmoji2DResource(options, (resource: DynamicResource) => {
          remote.loadResourceAsBytes(resource, (bytes: Uint8Array) => {
            const path = `${this.uid}/avatar.png`
            this.client.storage.from(BUCKET).upload(path, bytes, {contentType: "image/png", upsert: true})
              .then((result: any) => {
                if (result && result.error) {
                  print(`LINGO CLOUD bitmoji upload error: ${JSON.stringify(result.error)}`)
                  return
                }
                this.saveProfile(path)
                print("LINGO CLOUD bitmoji uploaded")
              })
              .catch((error: unknown) => print(`LINGO CLOUD bitmoji upload error: ${error}`))
          }, (error: string) => print(`LINGO CLOUD bitmoji bytes failed: ${error}`))
        })
      })
    } catch (error) {
      print(`LINGO CLOUD bitmoji unavailable: ${error}`)
    }
  }

  // ---------- progress ----------

  private flush(): void {
    if (!this.signedIn) {
      if (!this.starting) this.start()
      return
    }
    if (this.flushing) {
      this.flushEvent.reset(FLUSH_DELAY)
      return
    }
    const languages: LanguageId[] = []
    for (const key in this.dirty) languages.push(key as LanguageId)
    if (languages.length === 0) return
    this.dirty = {}
    this.flushing = true
    const jobs: Promise<void>[] = []
    for (let i = 0; i < languages.length; i++) jobs.push(this.syncLanguage(languages[i]))
    Promise.all(jobs)
      .catch((error: unknown) => print(`LINGO CLOUD sync error: ${error}`))
      .then(() => {
        this.flushing = false
      })
  }

  private syncLanguage(language: LanguageId): Promise<void> {
    const stats = this.progress.getLanguageStats(language)
    const cards = this.progress.getCardsForTarget(language)
    const profile = this.progress.getProfile()
    const native = cards.length > 0 ? cards[0].nativeLanguage : profile.nativeLanguage
    const lastCard = cards.length > 0 ? cards[0].lastPracticedAt : 0
    const lastPractice = Math.max(stats.lastPracticeAt, lastCard)
    // One row per word (the same word from two native languages counts once).
    const byKey: Record<string, Record<string, unknown>> = {}
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const key = card.word.trim().toLowerCase()
      if (!key || byKey[key]) continue
      byKey[key] = {
        user_id: this.uid,
        target_language: language,
        word_key: key,
        word: card.word,
        translation: card.translation || null,
        phonetic: card.phonetic || null,
        room: card.room || null,
        phrase: card.phrase || null,
        phrase_translation: card.phraseTranslation || null,
        image_path: this.imagePathIfUploaded(language, key),
        audio_tries: card.audioTries || 0,
        audio_misses: card.audioMisses || 0,
        best_score: card.bestScore === undefined ? null : card.bestScore,
        last_score: card.lastScore === undefined ? null : card.lastScore,
        last_heard: card.lastHeard || null,
        last_tip: card.lastTip || null,
        text_tries: card.textTries || 0,
        text_misses: card.textMisses || 0,
        updated_at: new Date(card.lastPracticedAt || Date.now()).toISOString(),
      }
    }
    const words: Record<string, unknown>[] = []
    for (const key in byKey) words.push(byKey[key])
    const progressRow = {
      user_id: this.uid,
      target_language: language,
      native_language: native,
      level: this.progress.getLevel(language),
      audio_xp: stats.audioXp,
      text_xp: stats.textXp,
      words_count: words.length,
      talk_scenes: stats.talkScenes,
      catcher_best: stats.catcherBest,
      last_practice_at: lastPractice > 0 ? new Date(lastPractice).toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const writes: Promise<unknown>[] = [
      this.client.from("lingo_progress").upsert(progressRow, {onConflict: "user_id,target_language"}).then((r: any) => this.report("progress", r)),
    ]
    if (words.length > 0) {
      writes.push(this.client.from("lingo_words").upsert(words, {onConflict: "user_id,target_language,word_key"}).then((r: any) => this.report("words", r)))
    }
    if (lastPractice > 0) {
      const day = this.localDay(lastPractice)
      writes.push(this.client.from("lingo_practice_days").upsert(
        {user_id: this.uid, target_language: language, day},
        {onConflict: "user_id,target_language,day", ignoreDuplicates: true},
      ).then((r: any) => this.report("practice day", r)))
    }
    return Promise.all(writes).then(() => this.uploadDrawings(language, cards))
  }

  /** Card drawings saved on the device go up a few per flush, once each. */
  private uploadDrawings(language: LanguageId, cards: {word: string, promptLabel?: string}[]): Promise<void> {
    const pending: {key: string, path: string, base64: string}[] = []
    for (let i = 0; i < cards.length && pending.length < MAX_UPLOADS_PER_FLUSH; i++) {
      const key = cards[i].word.trim().toLowerCase()
      const path = this.imagePath(language, key)
      if (!key || this.uploaded[path] || !cards[i].promptLabel) continue
      const base64 = this.artworkFor(cards[i].promptLabel!)
      if (base64) pending.push({key, path, base64})
    }
    if (pending.length === 0) return Promise.resolve()
    const uploads = pending.map((item) => {
      const bytes = Base64.decode(item.base64)
      return this.client.storage.from(BUCKET).upload(item.path, bytes, {contentType: "image/png", upsert: true})
        .then((result: any) => {
          if (result && result.error) {
            print(`LINGO CLOUD drawing upload error: ${JSON.stringify(result.error)}`)
            return
          }
          this.uploaded[item.path] = true
          return this.client.from("lingo_words").update({image_path: item.path})
            .eq("user_id", this.uid).eq("target_language", language).eq("word_key", item.key)
        })
    })
    return Promise.all(uploads).then(() => {
      this.saveUploaded()
      // More drawings left: keep going on the next flush.
      if (pending.length === MAX_UPLOADS_PER_FLUSH) this.markDirty(language)
    })
  }

  // ---------- helpers ----------

  private imagePath(language: LanguageId, key: string): string {
    return `${this.uid}/words/${language}/${this.hash(key)}.png`
  }

  private imagePathIfUploaded(language: LanguageId, key: string): string | null {
    const path = this.imagePath(language, key)
    return this.uploaded[path] ? path : null
  }

  /** Short, URL-safe file name for any script (Japanese, accents…). */
  private hash(value: string): string {
    let h1 = 0x811c9dc5
    let h2 = 0x01000193
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i)
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
      h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
    }
    return h1.toString(16) + h2.toString(16)
  }

  private localDay(time: number): string {
    const date = new Date(time)
    const pad = (n: number): string => (n < 10 ? "0" : "") + n
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  private report(what: string, result: any): void {
    if (result && result.error) print(`LINGO CLOUD ${what} error: ${JSON.stringify(result.error)}`)
  }

  private after(seconds: number, action: () => void): void {
    const event = this.host.createEvent("DelayedCallbackEvent")
    event.bind(action)
    event.reset(seconds)
  }

  private loadUploaded(): Record<string, boolean> {
    try {
      const raw = global.persistentStorageSystem.store.getString(UPLOADED_KEY)
      return raw ? JSON.parse(raw) as Record<string, boolean> : {}
    } catch (error) {
      return {}
    }
  }

  private saveUploaded(): void {
    try {
      global.persistentStorageSystem.store.putString(UPLOADED_KEY, JSON.stringify(this.uploaded))
    } catch (error) {
      print(`LINGO CLOUD could not remember uploads: ${error}`)
    }
  }
}
