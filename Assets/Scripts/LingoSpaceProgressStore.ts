/** Device-persistent profile, session history, XP, and learned vocabulary. */
import {
  isLanguageId,
  LanguageId,
  LearningMode,
  VocabularyCard,
} from "./LingoSpaceData"

const STORAGE_KEY = "lingo-specs-progress-v1"
const MAX_SESSIONS = 60
const MAX_CARDS = 180

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
}

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

type PersistedState = {
  version: 1
  userName: string
  nativeLanguage: LanguageId | null
  targetLanguage: LanguageId | null
  audioXp: number
  textXp: number
  sessions: PersistedSession[]
  cards: PersistedVocabularyCard[]
}

type CardMetadata = {
  promptLabel?: string
  visualDescription?: string
  practice?: "SCAN" | "TEXT" | "AUDIO"
}

export class LingoSpaceProgressStore {
  private state: PersistedState
  private currentSessionId: string | null = null

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

  recordXp(audioXp: number, textXp: number): void {
    this.state.audioXp = Math.max(0, Math.floor(audioXp))
    this.state.textXp = Math.max(0, Math.floor(textXp))
    const session = this.currentSession()
    if (session) {
      session.audioXp = this.state.audioXp
      session.textXp = this.state.textXp
      session.updatedAt = this.now()
    }
    this.save()
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
    }
    if (index >= 0) this.state.cards.splice(index, 1)
    this.state.cards.unshift(entry)
    if (this.state.cards.length > MAX_CARDS) this.state.cards.length = MAX_CARDS

    const session = this.currentSession()
    if (session && session.learnedCardIds.indexOf(card.id) < 0) {
      session.learnedCardIds.push(card.id)
      session.updatedAt = now
    }
    this.save()
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
        cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, MAX_CARDS) as PersistedVocabularyCard[] : [],
      }
    } catch (error) {
      console.error(`LINGO SPACE could not load progress: ${error}`)
      return fallback
    }
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
    }
  }

  private now(): number {
    return new Date().getTime()
  }
}
