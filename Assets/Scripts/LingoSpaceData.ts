/** Pure vocabulary data and types. No scene access or UI decisions. */
export type CategoryId = "HOME" | "FOOD" | "WORK" | "TRAVEL" | "PEOPLE" | "OUTSIDE"

export const SUPPORTED_LANGUAGES = ["Spanish", "English", "German", "French", "Italian", "Japanese"] as const
export type LanguageId = (typeof SUPPORTED_LANGUAGES)[number]
export type LearningMode = "IMAGE" | "SCAN"
export type CardSource = "REFERENCE" | "SCAN"

export type VocabularyCard = {
  id: string
  imageKey: string
  word: string
  translation: string
  phonetic: string
  /** Situational example phrase (scanned cards) — fuels the phrase-ordering game. */
  phrase?: string
  phraseTranslation?: string
  /** How the phrase sounds, spelled for the learner's native alphabet (scanned cards). */
  phrasePhonetic?: string
  /** Native-language name of the environment where the word was scanned ("Living", "Dormitorio"). */
  room?: string
  contexts: CategoryId[]
  source: CardSource
}

/** Languages written in non-Latin symbols: learners cannot read the script yet,
 * so every word display must pair the symbols with romanized pronunciation. */
export function usesNonLatinScript(language: LanguageId): boolean {
  return language === "Japanese"
}

/** True when the text is written in dense CJK symbols (kana, kanji): those
 * glyph shapes carry strokes Latin letters never have, so they need a larger
 * point size in the same layout box to stay legible. */
export function hasDenseScript(value: string): boolean {
  return /[　-ヿ㐀-䶿一-鿿＀-￯]/.test(value)
}

/** Phonetic for a reference word in the given language, or "" when unknown. */
export function getWordPhonetic(language: LanguageId, word: string): string {
  const key = word.trim().toLowerCase()
  for (let i = 0; i < CONCEPTS.length; i++) {
    if (CONCEPTS[i].words[language].trim().toLowerCase() === key) return CONCEPTS[i].phonetics[language]
  }
  return ""
}

export type NormalizedBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type ScanObjectCard = {
  objectName: string
  visualDescription: string
  word: string
  translation: string
  phonetic: string
  contexts: CategoryId[]
  bounds: NormalizedBounds
  /** AI-estimated camera-to-object distance in meters; 0 when unknown. */
  distanceMeters: number
}

export type SituationPhrase = {
  objectIndex: number
  intent: string
  target: string
  translation: string
  pronunciationHint: string
  usageTip: string
}

export type ScanSituation = {
  situation: string
  situationTranslation: string
  summary: string
  objects: ScanObjectCard[]
  phrases: SituationPhrase[]
}

type Concept = {
  id: string
  imageKey: string
  contexts: CategoryId[]
  words: Record<LanguageId, string>
  phonetics: Record<LanguageId, string>
  /** Short example sentence per language (3-7 space-separated tokens) for the phrase-order game. */
  phrases: Record<LanguageId, string>
  /** Romanized phrase pronunciation, only for languages whose script beginners cannot read. */
  phrasePhonetics?: Partial<Record<LanguageId, string>>
}

const CONCEPTS: Concept[] = [
  {
    id: "cup",
    imageKey: "cup",
    contexts: ["HOME", "FOOD"],
    words: {Spanish: "la taza", English: "cup", German: "die Tasse", French: "la tasse", Italian: "la tazza", Japanese: "カップ"},
    phonetics: {Spanish: "la TA-sa", English: "KUP", German: "dee TA-sse", French: "la TAS", Italian: "la TAT-tsa", Japanese: "kap-pu"},
    phrases: {Spanish: "Quiero una taza de café", English: "I want a cup of tea", German: "Ich möchte eine Tasse Tee", French: "Je veux une tasse de thé", Italian: "Vorrei una tazza di tè", Japanese: "カップ に コーヒー を いれます"},
    phrasePhonetics: {Japanese: "kap-pu ni koh-hee o i-re-mas"},
  },
  {
    id: "bed",
    imageKey: "bed",
    contexts: ["HOME"],
    words: {Spanish: "la cama", English: "bed", German: "das Bett", French: "le lit", Italian: "il letto", Japanese: "ベッド"},
    phonetics: {Spanish: "la KA-ma", English: "BED", German: "das BET", French: "luh LEE", Italian: "eel LET-to", Japanese: "bed-do"},
    phrases: {Spanish: "La cama es muy cómoda", English: "The bed is very comfortable", German: "Das Bett ist sehr bequem", French: "Le lit est très confortable", Italian: "Il letto è molto comodo", Japanese: "ベッド で ねます"},
    phrasePhonetics: {Japanese: "bed-do de ne-mas"},
  },
  {
    id: "train",
    imageKey: "train",
    contexts: ["TRAVEL"],
    words: {Spanish: "el tren", English: "train", German: "der Zug", French: "le train", Italian: "il treno", Japanese: "でんしゃ"},
    phonetics: {Spanish: "el TREN", English: "TRAYN", German: "dair TSOOK", French: "luh TRAN", Italian: "eel TREH-no", Japanese: "den-sha"},
    phrases: {Spanish: "El tren llega a las dos", English: "The train arrives at two", German: "Der Zug kommt um zwei", French: "Le train arrive à deux heures", Italian: "Il treno arriva alle due", Japanese: "でんしゃ に のります"},
    phrasePhonetics: {Japanese: "den-sha ni no-ri-mas"},
  },
  {
    id: "coworker",
    imageKey: "coworker",
    contexts: ["WORK", "PEOPLE"],
    words: {Spanish: "el colega", English: "coworker", German: "der Kollege", French: "le collègue", Italian: "il collega", Japanese: "どうりょう"},
    phonetics: {Spanish: "el ko-LE-ga", English: "KO-wur-ker", German: "dair ko-LEH-ge", French: "luh ko-LEG", Italian: "eel kol-LE-ga", Japanese: "doh-ryoh"},
    phrases: {Spanish: "Mi colega trabaja mucho hoy", English: "My coworker works a lot", German: "Mein Kollege arbeitet sehr viel", French: "Mon collègue travaille beaucoup aujourd'hui", Italian: "Il mio collega lavora molto", Japanese: "どうりょう と はたらきます"},
    phrasePhonetics: {Japanese: "doh-ryoh to ha-ta-ra-ki-mas"},
  },
  {
    id: "apple",
    imageKey: "apple",
    contexts: ["FOOD"],
    words: {Spanish: "la manzana", English: "apple", German: "der Apfel", French: "la pomme", Italian: "la mela", Japanese: "りんご"},
    phonetics: {Spanish: "la man-SA-na", English: "A-pl", German: "dair AP-fel", French: "la POM", Italian: "la ME-la", Japanese: "rin-go"},
    phrases: {Spanish: "Como una manzana cada día", English: "I eat an apple daily", German: "Ich esse einen Apfel täglich", French: "Je mange une pomme rouge", Italian: "Mangio una mela ogni giorno", Japanese: "りんご を たべます"},
    phrasePhonetics: {Japanese: "rin-go o ta-be-mas"},
  },
  {
    id: "tree",
    imageKey: "tree",
    contexts: ["OUTSIDE"],
    words: {Spanish: "el árbol", English: "tree", German: "der Baum", French: "l’arbre", Italian: "l’albero", Japanese: "き"},
    phonetics: {Spanish: "el AR-bol", English: "TREE", German: "dair BOWM", French: "LAR-bruh", Italian: "LAL-be-ro", Japanese: "ki"},
    phrases: {Spanish: "El árbol es muy alto", English: "The tree is very tall", German: "Der Baum ist sehr hoch", French: "L'arbre est très grand", Italian: "L'albero è molto alto", Japanese: "き が たかい です"},
    phrasePhonetics: {Japanese: "ki ga ta-kai des"},
  },
  {
    id: "chair",
    imageKey: "chair",
    contexts: ["HOME", "WORK"],
    words: {Spanish: "la silla", English: "chair", German: "der Stuhl", French: "la chaise", Italian: "la sedia", Japanese: "いす"},
    phonetics: {Spanish: "la SEE-ya", English: "CHAIR", German: "dair SHTOOL", French: "la SHEZ", Italian: "la SE-dya", Japanese: "i-su"},
    phrases: {Spanish: "La silla está en casa", English: "The chair is over there", German: "Der Stuhl ist sehr alt", French: "La chaise est très jolie", Italian: "La sedia è molto comoda", Japanese: "いす に すわります"},
    phrasePhonetics: {Japanese: "i-su ni su-wa-ri-mas"},
  },
  {
    id: "lamp",
    imageKey: "lamp",
    contexts: ["HOME", "WORK"],
    words: {Spanish: "la lámpara", English: "lamp", German: "die Lampe", French: "la lampe", Italian: "la lampada", Japanese: "ランプ"},
    phonetics: {Spanish: "la LAM-pa-ra", English: "LAMP", German: "dee LAM-pe", French: "la LAHMP", Italian: "la LAM-pa-da", Japanese: "ran-pu"},
    phrases: {Spanish: "Enciende la lámpara por favor", English: "Please turn on the lamp", German: "Mach bitte die Lampe an", French: "Allume la lampe s'il te plaît", Italian: "Accendi la lampada per favore", Japanese: "ランプ を つけます"},
    phrasePhonetics: {Japanese: "ran-pu o tsu-ke-mas"},
  },
  {
    id: "bread",
    imageKey: "bread",
    contexts: ["FOOD", "HOME"],
    words: {Spanish: "el pan", English: "bread", German: "das Brot", French: "le pain", Italian: "il pane", Japanese: "パン"},
    phonetics: {Spanish: "el PAN", English: "BRED", German: "das BROHT", French: "luh PAN", Italian: "eel PA-ne", Japanese: "pan"},
    phrases: {Spanish: "El pan está muy rico", English: "The bread is very fresh", German: "Das Brot schmeckt sehr gut", French: "Le pain est très bon", Italian: "Il pane è molto buono", Japanese: "パン を かいます"},
    phrasePhonetics: {Japanese: "pan o kai-mas"},
  },
  {
    id: "banana",
    imageKey: "banana",
    contexts: ["FOOD"],
    words: {Spanish: "la banana", English: "banana", German: "die Banane", French: "la banane", Italian: "la banana", Japanese: "バナナ"},
    phonetics: {Spanish: "la ba-NA-na", English: "ba-NA-na", German: "dee ba-NA-ne", French: "la ba-NAN", Italian: "la ba-NA-na", Japanese: "ba-na-na"},
    phrases: {Spanish: "La banana es muy dulce", English: "The banana is very sweet", German: "Die Banane ist sehr süß", French: "La banane est très sucrée", Italian: "La banana è molto dolce", Japanese: "バナナ が すき です"},
    phrasePhonetics: {Japanese: "ba-na-na ga su-ki des"},
  },
  {
    id: "bicycle",
    imageKey: "bicycle",
    contexts: ["TRAVEL", "OUTSIDE"],
    words: {Spanish: "la bicicleta", English: "bicycle", German: "das Fahrrad", French: "le vélo", Italian: "la bicicletta", Japanese: "じてんしゃ"},
    phonetics: {Spanish: "la bee-see-KLE-ta", English: "BY-si-kl", German: "das FAR-rat", French: "luh vay-LO", Italian: "la bee-chee-KLET-ta", Japanese: "ji-ten-sha"},
    phrases: {Spanish: "Voy al parque en bicicleta", English: "I ride my bicycle daily", German: "Ich fahre gern mit dem Fahrrad", French: "Je vais au parc à vélo", Italian: "Vado al parco in bicicletta", Japanese: "じてんしゃ で いきます"},
    phrasePhonetics: {Japanese: "ji-ten-sha de i-ki-mas"},
  },
  {
    id: "suitcase",
    imageKey: "suitcase",
    contexts: ["TRAVEL"],
    words: {Spanish: "la maleta", English: "suitcase", German: "der Koffer", French: "la valise", Italian: "la valigia", Japanese: "スーツケース"},
    phonetics: {Spanish: "la ma-LE-ta", English: "SOOT-kays", German: "dair KO-fer", French: "la va-LEEZ", Italian: "la va-LEE-ja", Japanese: "soo-tsu-keh-su"},
    phrases: {Spanish: "Mi maleta es muy grande", English: "My suitcase is very heavy", German: "Mein Koffer ist sehr schwer", French: "Ma valise est très lourde", Italian: "La mia valigia è grande", Japanese: "スーツケース を もちます"},
    phrasePhonetics: {Japanese: "soo-tsu-keh-su o mo-chi-mas"},
  },
  {
    id: "laptop",
    imageKey: "laptop",
    contexts: ["WORK", "HOME"],
    words: {Spanish: "la laptop", English: "laptop", German: "der Laptop", French: "l’ordinateur portable", Italian: "il portatile", Japanese: "ノートパソコン"},
    phonetics: {Spanish: "la LAP-top", English: "LAP-top", German: "dair LAP-top", French: "lor-dee-na-TUR por-TABL", Italian: "eel por-TA-tee-le", Japanese: "nō-to pa-so-kon"},
    phrases: {Spanish: "Trabajo con mi laptop nueva", English: "I work on my laptop", German: "Ich arbeite mit dem Laptop", French: "Je travaille sur mon ordinateur", Italian: "Lavoro con il mio portatile", Japanese: "ノートパソコン で はたらきます"},
    phrasePhonetics: {Japanese: "noh-to pa-so-kon de ha-ta-ra-ki-mas"},
  },
  {
    id: "book",
    imageKey: "book",
    contexts: ["WORK", "HOME"],
    words: {Spanish: "el libro", English: "book", German: "das Buch", French: "le livre", Italian: "il libro", Japanese: "ほん"},
    phonetics: {Spanish: "el LEE-bro", English: "BUUK", German: "das BOOKH", French: "luh LEE-vruh", Italian: "eel LEE-bro", Japanese: "hon"},
    phrases: {Spanish: "Leo un libro cada noche", English: "I read a good book", German: "Ich lese ein gutes Buch", French: "Je lis un bon livre", Italian: "Leggo un libro ogni sera", Japanese: "ほん を よみます"},
    phrasePhonetics: {Japanese: "hon o yo-mi-mas"},
  },
  {
    id: "flower",
    imageKey: "flower",
    contexts: ["OUTSIDE", "HOME"],
    words: {Spanish: "la flor", English: "flower", German: "die Blume", French: "la fleur", Italian: "il fiore", Japanese: "はな"},
    phonetics: {Spanish: "la FLOR", English: "FLAU-er", German: "dee BLOO-me", French: "la FLUR", Italian: "eel FYO-re", Japanese: "ha-na"},
    phrases: {Spanish: "La flor es muy bonita", English: "The flower is very pretty", German: "Die Blume ist sehr schön", French: "La fleur est très belle", Italian: "Il fiore è molto bello", Japanese: "はな が きれい です"},
    phrasePhonetics: {Japanese: "ha-na ga ki-reh des"},
  },
  {
    id: "dog",
    imageKey: "dog",
    contexts: ["HOME", "OUTSIDE"],
    words: {Spanish: "el perro", English: "dog", German: "der Hund", French: "le chien", Italian: "il cane", Japanese: "いぬ"},
    phonetics: {Spanish: "el PE-rro", English: "DOG", German: "dair HOONT", French: "luh SHYAN", Italian: "eel KA-ne", Japanese: "i-nu"},
    phrases: {Spanish: "El perro juega en casa", English: "The dog plays outside today", German: "Der Hund spielt im Garten", French: "Le chien joue dans le jardin", Italian: "Il cane gioca in giardino", Japanese: "いぬ と あそびます"},
    phrasePhonetics: {Japanese: "i-nu to a-so-bi-mas"},
  },
  {
    id: "teacher",
    imageKey: "teacher",
    contexts: ["WORK", "PEOPLE"],
    words: {Spanish: "la profesora", English: "teacher", German: "die Lehrerin", French: "la professeure", Italian: "l’insegnante", Japanese: "せんせい"},
    phonetics: {Spanish: "la pro-fe-SO-ra", English: "TEE-cher", German: "dee LEH-re-rin", French: "la pro-fe-SUR", Italian: "leen-sen-YAN-te", Japanese: "sen-seh"},
    phrases: {Spanish: "La profesora explica muy bien", English: "The teacher explains very well", German: "Die Lehrerin erklärt sehr gut", French: "La professeure explique très bien", Italian: "L'insegnante spiega molto bene", Japanese: "せんせい に ききます"},
    phrasePhonetics: {Japanese: "sen-seh ni ki-ki-mas"},
  },
  {
    id: "doctor",
    imageKey: "doctor",
    contexts: ["WORK", "PEOPLE"],
    words: {Spanish: "el médico", English: "doctor", German: "der Arzt", French: "le médecin", Italian: "il medico", Japanese: "いしゃ"},
    phonetics: {Spanish: "el ME-dee-ko", English: "DOK-tor", German: "dair ARTST", French: "luh mayd-SAN", Italian: "eel ME-dee-ko", Japanese: "i-sha"},
    phrases: {Spanish: "El médico trabaja en el hospital", English: "The doctor works at the hospital", German: "Der Arzt arbeitet im Krankenhaus", French: "Le médecin travaille à l'hôpital", Italian: "Il medico lavora in ospedale", Japanese: "いしゃ に いきます"},
    phrasePhonetics: {Japanese: "i-sha ni i-ki-mas"},
  },
]

const REFERENCE_BATCH_SIZE = 6

export function isLanguageId(value: string): value is LanguageId {
  return (SUPPORTED_LANGUAGES as readonly string[]).indexOf(value) >= 0
}

export function getReferenceCards(targetLanguage: LanguageId, nativeLanguage: LanguageId, batchIndex: number = 0): VocabularyCard[] {
  const batchCount = Math.ceil(CONCEPTS.length / REFERENCE_BATCH_SIZE)
  const normalizedBatch = ((batchIndex % batchCount) + batchCount) % batchCount
  const start = normalizedBatch * REFERENCE_BATCH_SIZE
  return CONCEPTS.slice(start, start + REFERENCE_BATCH_SIZE).map((concept) => ({
    id: concept.id,
    imageKey: concept.imageKey,
    word: concept.words[targetLanguage],
    translation: concept.words[nativeLanguage],
    phonetic: concept.phonetics[targetLanguage],
    phrase: concept.phrases[targetLanguage],
    phraseTranslation: concept.phrases[nativeLanguage],
    phrasePhonetic: concept.phrasePhonetics ? concept.phrasePhonetics[targetLanguage] : undefined,
    contexts: concept.contexts.slice(),
    source: "REFERENCE",
  }))
}

export function getReferenceBatchCount(): number {
  return Math.ceil(CONCEPTS.length / REFERENCE_BATCH_SIZE)
}

export const CATEGORY_IDS: CategoryId[] = ["HOME", "FOOD", "WORK", "TRAVEL", "PEOPLE", "OUTSIDE"]

/** Every reference word in one language — the quiz distractor pool. */
export function getAllWords(language: LanguageId): string[] {
  return CONCEPTS.map((concept) => concept.words[language])
}
