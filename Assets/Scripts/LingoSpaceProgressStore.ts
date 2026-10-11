/** Device-persistent profile, session history, XP, and learned vocabulary. */
import {
  isLanguageId,
  isSpeakingLevel,
  LanguageId,
  SpeakingLevel,
  LearningMode,
  VocabularyCard,
} from "./LingoSpaceData"

const STORAGE_KEY = "lingo-specs-progress-v1"
const MAX_SESSIONS = 60
const MAX_CARDS = 180
// Absolute ceiling across ALL language pairs (5 studied pairs x 180 is the
// theoretical max; normal use never reaches it).
const MAX_CARDS_TOTAL = 900

// Generated card art, persisted as small matted JPEG thumbnails so learners
// keep their pictures across sessions. Budgeted: oldest art is evicted first.
const ART_STORAGE_KEY = "lingo-specs-art-v1"
const ART_BUDGET_CHARS = 2400000

type PersistedArt = {label: string, base64: string, savedAt: number}

export type PersistedVocabularyCard = VocabularyCard & {
  nativeLanguage: LanguageId
  targetLanguage: LanguageId
  promptLabel?: string
  visualDescription?: string
  firstLearnedAt: number
  lastPracticedAt: number
  textMastery: number
  audioMastery: number
  /** Practice report (web "to improve" list): every attempt, not only successes. */
  audioTries?: number
  audioMisses?: number
  bestScore?: number
  lastScore?: number
  lastHeard?: string
  lastTip?: string
  textTries?: number
  textMisses?: number
}

/** One pronunciation or quiz attempt on a word. */
export type PracticeAttempt = {kind: "AUDIO" | "TEXT", correct: boolean, score?: number, heard?: string, tip?: string}

export type LingoProfileSnapshot = {
  userName: string
  nativeLanguage: LanguageId | null
  targetLanguage: LanguageId | null
  audioXp: number
  textXp: number
  sessionCount: number
}

type PersistedSession = {
  id: string
  startedAt: number
  updatedAt: number
  nativeLanguage: LanguageId
  targetLanguage: LanguageId
  mode: LearningMode
  audioXp: number
  textXp: number
  learnedCardIds: string[]
  completed: boolean
}

/** Per studied language: XP earned in it and Live Talk / Cloud Catcher stats. */
export type LanguageStats = {audioXp: number, textXp: number, talkScenes: number, catcherBest: number, lastPracticeAt: number}

type PersistedState = {
  version: 1
  userName: string
  nativeLanguage: LanguageId | null
  targetLanguage: LanguageId | null
  audioXp: number
  textXp: number
  sessions: PersistedSession[]
  cards: PersistedVocabularyCard[]
  /** Placement-test result per studied language (absent = not assessed yet). */
  levels: Partial<Record<LanguageId, SpeakingLevel>>
  /** Per-language stats (since the cloud sync); totals above stay global. */
  languageStats: Partial<Record<LanguageId, LanguageStats>>
}

type CardMetadata = {
  promptLabel?: string
  visualDescription?: string
  practice?: "SCAN" | "TEXT" | "AUDIO"
}

export class LingoSpaceProgressStore {
  private state: PersistedState
  private currentSessionId: string | null = null
  /** Called with the studied language whenever its progress changes (cloud sync). */
  onLanguageChanged: ((language: LanguageId) => void) | null = null

  constructor() {
    this.state = this.load()
  }

  getProfile(): LingoProfileSnapshot {
    return {
      userName: this.state.userName,
      nativeLanguage: this.state.nativeLanguage,
      targetLanguage: this.state.targetLanguage,
      audioXp: this.state.audioXp,
      textXp: this.state.textXp,
      sessionCount: this.state.sessions.length,
    }
  }

  setUserName(userName: string): void {
    const normalized = userName.trim()
    if (!normalized || normalized === this.state.userName) return
    this.state.userName = normalized.substring(0, 32)
    this.save()
  }

  setLanguages(nativeLanguage: LanguageId | null, targetLanguage: LanguageId | null): void {
    this.state.nativeLanguage = nativeLanguage
    this.state.targetLanguage = targetLanguage
    this.save()
  }

  beginSession(nativeLanguage: LanguageId, targetLanguage: LanguageId, mode: LearningMode): void {
    const now = this.now()
    const session: PersistedSession = {
      id: `session-${now}-${this.state.sessions.length}`,
      startedAt: now,
      updatedAt: now,
      nativeLanguage,
      targetLanguage,
      mode,
      audioXp: this.state.audioXp,
      textXp: this.state.textXp,
      learnedCardIds: [],
      completed: false,
    }
    this.currentSessionId = session.id
    this.state.sessions.unshift(session)
    if (this.state.sessions.length > MAX_SESSIONS) this.state.sessions.length = MAX_SESSIONS
    this.state.nativeLanguage = nativeLanguage
    this.state.targetLanguage = targetLanguage
    this.save()
  }

  getLevel(targetLanguage: LanguageId): SpeakingLevel | null {
    return this.state.levels[targetLanguage] || null
  }

  setLevel(targetLanguage: LanguageId, level: SpeakingLevel): void {
    this.state.levels[targetLanguage] = level
    this.save()
    this.touch(targetLanguage)
  }

  /** Languages with any progress: a level, stats or saved words. */
  studiedLanguages(): LanguageId[] {
    const seen: Partial<Record<LanguageId, boolean>> = {}
    const result: LanguageId[] = []
    const add = (language: LanguageId | null | undefined): void => {
      if (!language || seen[language]) return
      seen[language] = true
      result.push(language)
    }
    for (const key in this.state.languageStats) if (isLanguageId(key)) add(key)
    for (const key in this.state.levels) if (isLanguageId(key)) add(key)
    for (let i = 0; i < this.state.cards.length; i++) add(this.state.cards[i].targetLanguage)
    return result
  }

  getLanguageStats(targetLanguage: LanguageId): LanguageStats {
    const stats = this.state.languageStats[targetLanguage]
    return stats ? {...stats} : {audioXp: 0, textXp: 0, talkScenes: 0, catcherBest: 0, lastPracticeAt: 0}
  }

  /** Every saved word of a studied language (all native languages), newest first. */
  getCardsForTarget(targetLanguage: LanguageId): PersistedVocabularyCard[] {
    return this.state.cards
      .filter((entry) => entry.targetLanguage === targetLanguage)
      .map((entry) => ({...entry, contexts: entry.contexts.slice()}))
  }

  /** A finished Live Talk scene or speaking lesson in the studied language. */
  recordTalkScene(targetLanguage: LanguageId): void {
    const stats = this.statsFor(targetLanguage)
    stats.talkScenes += 1
    stats.lastPracticeAt = this.now()
    this.save()
    this.touch(targetLanguage)
  }

  /** A Cloud Catcher round: keeps the best score per language. */
  recordCatcher(targetLanguage: LanguageId, caught: number): void {
    const stats = this.statsFor(targetLanguage)
    stats.catcherBest = Math.max(stats.catcherBest, Math.floor(caught))
    stats.lastPracticeAt = this.now()
    this.save()
    this.touch(targetLanguage)
  }

  private statsFor(targetLanguage: LanguageId): LanguageStats {
    let stats = this.state.languageStats[targetLanguage]
    if (!stats) {
      stats = {audioXp: 0, textXp: 0, talkScenes: 0, catcherBest: 0, lastPracticeAt: 0}
      this.state.languageStats[targetLanguage] = stats
    }
    return stats
  }

  private touch(targetLanguage: LanguageId | null): void {
    if (targetLanguage && this.onLanguageChanged) this.onLanguageChanged(targetLanguage)
  }

  recordXp(audioXp: number, textXp: number): void {
    const nextAudio = Math.max(0, Math.floor(audioXp))
    const nextText = Math.max(0, Math.floor(textXp))
    // XP earned now counts for the language being studied.
    const target = this.state.targetLanguage
    if (target) {
      const stats = this.statsFor(target)
      stats.audioXp += Math.max(0, nextAudio - this.state.audioXp)
      stats.textXp += Math.max(0, nextText - this.state.textXp)
      stats.lastPracticeAt = this.now()
    }
    this.state.audioXp = nextAudio
    this.state.textXp = nextText
    const session = this.currentSession()
    if (session) {
      session.audioXp = this.state.audioXp
      session.textXp = this.state.textXp
      session.updatedAt = this.now()
    }
    this.save()
    this.touch(target)
  }

  recordCard(
    card: VocabularyCard,
    nativeLanguage: LanguageId,
    targetLanguage: LanguageId,
    metadata: CardMetadata = {},
  ): void {
    const now = this.now()
    const index = this.state.cards.findIndex((entry) =>
      entry.id === card.id &&
      entry.nativeLanguage === nativeLanguage &&
      entry.targetLanguage === targetLanguage,
    )
    const previous = index >= 0 ? this.state.cards[index] : null
    const entry: PersistedVocabularyCard = {
      id: card.id,
      imageKey: card.imageKey,
      word: card.word,
      translation: card.translation,
      phonetic: card.phonetic || "",
      phrase: card.phrase || previous?.phrase,
      phraseTranslation: card.phraseTranslation || previous?.phraseTranslation,
      phrasePhonetic: card.phrasePhonetic || previous?.phrasePhonetic,
      room: card.room || previous?.room,
      contexts: card.contexts.slice(),
      source: card.source,
      nativeLanguage,
      targetLanguage,
      promptLabel: metadata.promptLabel || previous?.promptLabel,
      visualDescription: metadata.visualDescription || previous?.visualDescription,
      firstLearnedAt: previous?.firstLearnedAt || now,
      lastPracticedAt: now,
      textMastery: (previous?.textMastery || 0) + (metadata.practice === "TEXT" ? 1 : 0),
      audioMastery: (previous?.audioMastery || 0) + (metadata.practice === "AUDIO" ? 1 : 0),
      audioTries: previous?.audioTries,
      audioMisses: previous?.audioMisses,
      bestScore: previous?.bestScore,
      lastScore: previous?.lastScore,
      lastHeard: previous?.lastHeard,
      lastTip: previous?.lastTip,
      textTries: previous?.textTries,
      textMisses: previous?.textMisses,
    }
    if (index >= 0) this.state.cards.splice(index, 1)
    this.state.cards.unshift(entry)
    // Eviction is PER LANGUAGE PAIR: filling up Italian must never silently
    // delete the French library (it did — a global cap truncated the tail,
    // which is always the least-recently-touched OTHER language).
    let pairCount = 0
    for (let i = 0; i < this.state.cards.length; i++) {
      const candidate = this.state.cards[i]
      if (candidate.nativeLanguage !== nativeLanguage || candidate.targetLanguage !== targetLanguage) continue
      pairCount += 1
      if (pairCount > MAX_CARDS) {
        this.state.cards.splice(i, 1)
        i -= 1
        pairCount -= 1
      }
    }
    // Storage-safety ceiling across everything: far above normal use.
    if (this.state.cards.length > MAX_CARDS_TOTAL) this.state.cards.length = MAX_CARDS_TOTAL

    const session = this.currentSession()
    if (session && session.learnedCardIds.indexOf(card.id) < 0) {
      session.learnedCardIds.push(card.id)
      session.updatedAt = now
    }
    this.save()
    this.touch(targetLanguage)
  }

  /** Counts a pronunciation / quiz attempt (right or wrong) on the word, so the
   * web can report what needs more practice. Unknown words are saved first. */
  recordAttempt(card: VocabularyCard, nativeLanguage: LanguageId, targetLanguage: LanguageId, attempt: PracticeAttempt): void {
    const find = () => this.state.cards.find((entry) =>
      entry.id === card.id && entry.nativeLanguage === nativeLanguage && entry.targetLanguage === targetLanguage)
    let entry = find()
    if (!entry) {
      this.recordCard(card, nativeLanguage, targetLanguage)
      entry = find()
      if (!entry) return
    }
    if (attempt.kind === "AUDIO") {
      entry.audioTries = (entry.audioTries || 0) + 1
      if (!attempt.correct) entry.audioMisses = (entry.audioMisses || 0) + 1
      if (attempt.score !== undefined) {
        const score = Math.max(0, Math.min(100, Math.round(attempt.score)))
        entry.lastScore = score
        entry.bestScore = Math.max(entry.bestScore || 0, score)
      }
      if (attempt.heard !== undefined) entry.lastHeard = attempt.heard.slice(0, 80)
      entry.lastTip = attempt.correct ? "" : (attempt.tip || "").slice(0, 180)
    } else {
      entry.textTries = (entry.textTries || 0) + 1
      if (!attempt.correct) entry.textMisses = (entry.textMisses || 0) + 1
    }
    entry.lastPracticedAt = this.now()
    this.save()
    this.touch(targetLanguage)
  }

  completeSession(): void {
    const session = this.currentSession()
    if (session) {
      session.completed = true
      session.updatedAt = this.now()
      session.audioXp = this.state.audioXp
      session.textXp = this.state.textXp
    }
    this.currentSessionId = null
    this.save()
  }

  getCards(nativeLanguage: LanguageId, targetLanguage: LanguageId): PersistedVocabularyCard[] {
    return this.state.cards
      .filter((entry) => entry.nativeLanguage === nativeLanguage && entry.targetLanguage === targetLanguage)
      .map((entry) => ({...entry, contexts: entry.contexts.slice()}))
  }

  private currentSession(): PersistedSession | null {
    if (!this.currentSessionId) return null
    return this.state.sessions.find((session) => session.id === this.currentSessionId) || null
  }

  private artCache: PersistedArt[] | null = null

  /** Persisted thumbnail for this English object label, if any survives the budget. */
  getArtwork(label: string): string | null {
    const key = label.trim().toLowerCase()
    if (!key) return null
    const cache = this.ensureArtCache()
    const index = cache.findIndex((art) => art.label === key)
    if (index < 0) return null
    const hit = cache[index]
    hit.savedAt = Date.now()
    cache.splice(index, 1)
    cache.push(hit)
    return hit.base64
  }

  saveArtwork(label: string, base64: string): void {
    const key = label.trim().toLowerCase()
    if (!key || !base64) return
    const cache = this.ensureArtCache().filter((art) => art.label !== key)
    cache.push({label: key, base64, savedAt: Date.now()})
    this.artCache = cache
    this.trimAndPersistArt()
  }

  private ensureArtCache(): PersistedArt[] {
    if (this.artCache) return this.artCache
    try {
      const raw = global.persistentStorageSystem.store.getString(ART_STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as PersistedArt[]) : []
      this.artCache = Array.isArray(parsed)
        ? parsed.filter((art) => art && typeof art.label === "string" && typeof art.base64 === "string")
        : []
    } catch (error) {
      console.error(`LINGO SPACE could not load saved artwork: ${error}`)
      this.artCache = []
    }
    return this.artCache
  }

  private trimAndPersistArt(): void {
    const cache = this.ensureArtCache()
    let totalChars = cache.reduce((sum, art) => sum + art.base64.length, 0)
    while (cache.length > 1 && totalChars > ART_BUDGET_CHARS) totalChars -= (cache.shift() as PersistedArt).base64.length
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        global.persistentStorageSystem.store.putString(ART_STORAGE_KEY, JSON.stringify(cache))
        return
      } catch (error) {
        // Store refused the write (likely full): drop the oldest half and retry.
        cache.splice(0, Math.max(1, Math.floor(cache.length / 2)))
        if (cache.length === 0) {
          try {
            global.persistentStorageSystem.store.putString(ART_STORAGE_KEY, "[]")
          } catch (ignored) {}
          return
        }
      }
    }
  }

  private load(): PersistedState {
    const fallback = this.emptyState()
    try {
      const raw = global.persistentStorageSystem.store.getString(STORAGE_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      const nativeLanguage = parsed.nativeLanguage && isLanguageId(parsed.nativeLanguage) ? parsed.nativeLanguage : null
      const targetLanguage = parsed.targetLanguage && isLanguageId(parsed.targetLanguage) ? parsed.targetLanguage : null
      return {
        version: 1,
        userName: typeof parsed.userName === "string" ? parsed.userName : "",
        nativeLanguage,
        targetLanguage,
        audioXp: typeof parsed.audioXp === "number" ? Math.max(0, parsed.audioXp) : 0,
        textXp: typeof parsed.textXp === "number" ? Math.max(0, parsed.textXp) : 0,
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, MAX_SESSIONS) as PersistedSession[] : [],
        cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, MAX_CARDS_TOTAL) as PersistedVocabularyCard[] : [],
        levels: this.loadLevels(parsed.levels),
        languageStats: this.loadLanguageStats(parsed.languageStats),
      }
    } catch (error) {
      console.error(`LINGO SPACE could not load progress: ${error}`)
      return fallback
    }
  }

  private loadLevels(raw: unknown): Partial<Record<LanguageId, SpeakingLevel>> {
    const levels: Partial<Record<LanguageId, SpeakingLevel>> = {}
    if (!raw || typeof raw !== "object") return levels
    const entries = raw as Record<string, unknown>
    for (const key in entries) {
      if (isLanguageId(key) && isSpeakingLevel(entries[key])) levels[key] = entries[key] as SpeakingLevel
    }
    return levels
  }

  private loadLanguageStats(raw: unknown): Partial<Record<LanguageId, LanguageStats>> {
    const result: Partial<Record<LanguageId, LanguageStats>> = {}
    if (!raw || typeof raw !== "object") return result
    const entries = raw as Record<string, Partial<LanguageStats>>
    const num = (value: unknown): number => typeof value === "number" && isFinite(value) ? Math.max(0, value) : 0
    for (const key in entries) {
      const entry = entries[key]
      if (!isLanguageId(key) || !entry || typeof entry !== "object") continue
      result[key] = {
        audioXp: num(entry.audioXp),
        textXp: num(entry.textXp),
        talkScenes: num(entry.talkScenes),
        catcherBest: num(entry.catcherBest),
        lastPracticeAt: num(entry.lastPracticeAt),
      }
    }
    return result
  }

  private save(): void {
    try {
      global.persistentStorageSystem.store.putString(STORAGE_KEY, JSON.stringify(this.state))
    } catch (error) {
      console.error(`LINGO SPACE could not save progress: ${error}`)
    }
  }

  private emptyState(): PersistedState {
    return {
      version: 1,
      userName: "",
      nativeLanguage: null,
      targetLanguage: null,
      audioXp: 0,
      textXp: 0,
      sessions: [],
      cards: [],
      levels: {},
      languageStats: {},
    }
  }

  private now(): number {
    return new Date().getTime()
  }
}
