/** Live Talk brain: role-play scenes with a gentle per-turn language coach.
 * Turn-based over Chat Completions (proven on device with the ASR + TTS stack);
 * the voice transport stays in the caller so a Realtime session can replace it. */
import {OpenAI} from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI"
import {OpenAITypes} from "RemoteServiceGateway.lspkg/HostedExternal/OpenAITypes"
import {isSpeakingLevel, LanguageId, SpeakingLevel, usesNonLatinScript} from "./LingoSpaceData"
import {isObjectIconKey, OBJECT_ICON_KEYS, ObjectIconKey} from "./LingoSpaceTalkArt"

export type TalkScene = "CAFE" | "AIRPORT" | "FRIEND" | "ROOM" | "CUSTOM"
export type TalkTurn = {role: "partner" | "learner", text: string}
/** `icon`: the closest object-pack picture for the row, when the AI found one. */
export type TalkLine = {text: string, translation: string, phonetic: string, icon?: ObjectIconKey}
export type TalkOpening = {role: string, goals: string[], goalIcons: (ObjectIconKey | null)[], line: TalkLine}

/** Shared instruction: the model tags rows with a picture from the fixed object pack. */
const ICON_RULE = `"icon": the ONE key from this list that best illustrates it, or "" if none fits: ${OBJECT_ICON_KEYS.join(", ")}.`
/** `coach` is the spoken version: one short sentence in the native language. */
export type TalkCorrection = {ok: boolean, better: string, why: string, coach: string}
export type TalkReply = {correction: TalkCorrection, goalsMet: number[], finished: boolean, line: TalkLine}
/** `xp`: shown on its own line when the activity earned XP (speaking practice). */
export type TalkSummary = {stars: number, praise: string, tip: string, phrases: TalkLine[], xp?: number}
/** Guided speaking: what the other person says (cue) and the learner's line to master. */
/** `known`: words of the learner's own scans that this line uses (celebrated in the UI). */
export type DrillItem = {cue: TalkLine, line: TalkLine, known: string[]}
export type DrillPlan = {role: string, items: DrillItem[]}
/** Spoken coaching of one practiced sentence. */
export type SentenceCoach = {correct: boolean, coach: string}

const MODEL = "gpt-4.1-mini"

/** How each level shapes what the AI says and asks for. */
const LEVEL_GUIDES: Record<SpeakingLevel, {talk: string, drill: string, coach: string}> = {
  A0: {
    talk: "Learner level: TOTAL beginner (CEFR A0). Use 2-5 word sentences, the most common words, present tense only, one very simple question at a time.",
    drill: "Learner lines: the first one 2 words, the last one at most 6 words. Only the most frequent everyday words, present tense.",
    coach: "Be very lenient: correct when the main words are recognizable.",
  },
  A1: {
    talk: "Learner level: beginner (CEFR A1). Use short sentences up to 7 words, everyday vocabulary, mostly present tense, one question at a time.",
    drill: "Learner lines grow from 3 words to at most 8 words. Everyday words, mostly present tense.",
    coach: "Be lenient: correct when a patient native listener would understand the whole sentence.",
  },
  A2: {
    talk: "Learner level: elementary (CEFR A2). Use sentences up to 10 words, common past and future forms, everyday topics.",
    drill: "Learner lines grow from 4 words to at most 11 words, including some past or future forms.",
    coach: "Correct when the sentence is understandable and its key words are right.",
  },
  B1: {
    talk: "Learner level: intermediate (CEFR B1). Speak naturally in sentences up to 14 words, varied tenses, ask for opinions and reasons.",
    drill: "Learner lines grow from 5 words to at most 14 words, natural phrasing, varied tenses, linking words.",
    coach: "Correct when it is clear and natural; mention one grammar or pronunciation point if useful.",
  },
  B2: {
    talk: "Learner level: upper intermediate (CEFR B2). Speak naturally and fluently, occasional idioms, nuanced follow-up questions.",
    drill: "Learner lines from 6 to 16 words: natural, idiomatic, nuanced, varied structures.",
    coach: "Be demanding: correct only when natural and accurate; point out the most useful refinement.",
  },
}

/** One step of the adaptive placement test: the next question, or the verdict. */
export type PlacementStep = {done: boolean, level: SpeakingLevel, instruction: string, question: TalkLine, message: string}
export type PlacementAnswer = {question: string, answer: string}

const SCENE_BRIEFS: Record<TalkScene, string> = {
  CAFE: "a cozy café. You are the friendly barista taking the learner's order (drinks, size, something to eat, paying).",
  AIRPORT: "an airport check-in desk. You are the airline agent (passport, destination, luggage, seat, boarding gate).",
  FRIEND: "a relaxed meetup where the learner meets a new friend. You are that new friend (names, where you are from, hobbies, making plans).",
  ROOM: "the learner's own room. You are a curious, cheerful visitor asking about the objects in the room and what the learner does with them.",
  CUSTOM: "",
}

export class LingoSpaceTalkService {
  private scene: TalkScene = "CAFE"
  private nativeLanguage: LanguageId = "English"
  private targetLanguage: LanguageId = "Spanish"
  private roomWords: string[] = []
  private role = ""
  private goals: string[] = []
  private history: TalkTurn[] = []
  private customPlace = ""
  private level: SpeakingLevel = "A1"

  /** Every lesson, conversation and coaching adapts to this level. */
  setLevel(level: SpeakingLevel): void { this.level = level }
  getLevel(): SpeakingLevel { return this.level }

  getHistory(): TalkTurn[] { return this.history.slice() }
  getGoals(): string[] { return this.goals.slice() }
  lastPartnerLine(): string {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === "partner") return this.history[i].text
    }
    return ""
  }

  /** Starts a fresh scene: the partner's role, three mission goals and the first line. */
  open(scene: TalkScene, nativeLanguage: LanguageId, targetLanguage: LanguageId, roomWords: string[], customPlace: string = ""): Promise<TalkOpening> {
    this.scene = scene
    this.customPlace = this.clean(customPlace, 120)
    this.role = ""
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.roomWords = roomWords.slice(0, 24)
    this.history = []
    this.goals = []
    const instructions = [
      this.persona(),
      "Create the opening of this conversation.",
      `Return JSON only: {"role": string, "goals": [string, string, string], "goalIcons": [string, string, string], "line": string, "translation": string${this.phoneticSchema()}}.`,
      `"goalIcons": for each goal, ${ICON_RULE.replace('"icon": ', "")}`,
      `"role": your role in 1-3 words, written in ${nativeLanguage}.`,
      `"goals": exactly three small missions for the learner, in ${nativeLanguage}, imperative, max 7 words each, in the natural order of the conversation (for example: order a drink, ask the price, say goodbye).`,
      `"line": your first friendly line in ${targetLanguage}, max 14 words, ending with a simple question.`,
      `"translation": that line translated into ${nativeLanguage}.`,
      this.phoneticRule(),
    ].join(" ")
    return this.ask(instructions, "Start the scene now.", 320, 0.7).then((parsed) => {
      const goals = Array.isArray(parsed.goals) ? parsed.goals.map((goal: unknown) => this.clean(goal, 60)).filter((goal: string) => goal.length > 0).slice(0, 3) : []
      this.role = this.clean(parsed.role, 40)
      this.goals = goals
      const line = this.readLine(parsed)
      if (!line.text) throw new Error("Live Talk opening returned no line")
      this.history.push({role: "partner", text: line.text})
      const icons = Array.isArray(parsed.goalIcons) ? parsed.goalIcons : []
      const goalIcons = this.goals.map((_goal, i) => isObjectIconKey(icons[i]) ? icons[i] as ObjectIconKey : null)
      return {role: this.role, goals: this.goals, goalIcons, line}
    })
  }

  /** Coaches what the learner just said and continues the role-play. */
  reply(learnerText: string): Promise<TalkReply> {
    this.history.push({role: "learner", text: learnerText})
    const instructions = [
      this.persona(),
      `Mission goals for the learner (0-based indices): ${JSON.stringify(this.goals)}.`,
      "First coach the learner's LAST message, then continue the role-play.",
      "The learner's text comes from speech recognition, which may write the sounds in the wrong alphabet (Cyrillic, Devanagari…) or as near-miss words: read it by how it sounds, ignore punctuation, capitalization and spelling quirks, and judge meaning, grammar, word choice and naturalness.",
      "Be warm and lenient: if a native speaker would find it correct and natural, it is ok.",
      `If the learner spoke ${this.nativeLanguage} instead of ${this.targetLanguage}, it is not ok: "better" shows how to say it in ${this.targetLanguage} and "why" kindly invites them to try it in ${this.targetLanguage}.`,
      `Return JSON only: {"ok": boolean, "better": string, "why": string, "coach": string, "goalsMet": number[], "finished": boolean, "line": string, "translation": string${this.phoneticSchema()}}.`,
      `"better": when not ok, the natural ${this.targetLanguage} version of what the learner meant (max 16 words); empty string when ok.`,
      `"why": when not ok, ONE short kind explanation in ${this.nativeLanguage}, max 16 words; empty string when ok.`,
      `"coach": when not ok, what a friendly teacher SAYS ALOUD in ${this.nativeLanguage}, max 14 words, quoting the better ${this.targetLanguage} phrase (for example: "Casi, se dice: je voudrais un café"); empty string when ok.`,
      "\"goalsMet\": indices of ALL goals achieved so far in the whole conversation.",
      "\"finished\": true only when every goal is met AND your line naturally closes the conversation.",
      `"line": your next reply in ${this.targetLanguage}, max 14 words, in character; unless closing, end with a simple question that steers toward the next unmet goal.`,
      `"translation": that line in ${this.nativeLanguage}.`,
      this.phoneticRule(),
    ].join(" ")
    return this.ask(instructions, this.transcript(), 380, 0.5).then((parsed) => {
      const line = this.readLine(parsed)
      if (!line.text) throw new Error("Live Talk reply returned no line")
      this.history.push({role: "partner", text: line.text})
      const goalsMet = Array.isArray(parsed.goalsMet)
        ? parsed.goalsMet.map((value: unknown) => Number(value)).filter((value: number) => value >= 0 && value < this.goals.length)
        : []
      const ok = parsed.ok === true
      return {
        correction: {ok, better: ok ? "" : this.clean(parsed.better, 140), why: ok ? "" : this.clean(parsed.why, 160), coach: ok ? "" : this.clean(parsed.coach, 160)},
        goalsMet,
        finished: parsed.finished === true,
        line,
      }
    }).catch((error) => {
      // The learner's turn stays in the transcript only when the partner answered.
      this.history.pop()
      throw error
    })
  }

  /** "What do I say?": three replies to the partner's last line, simplest first. */
  suggest(): Promise<TalkLine[]> {
    const instructions = [
      this.persona(),
      `Mission goals for the learner: ${JSON.stringify(this.goals)}.`,
      `Suggest three different replies the LEARNER could say next, in ${this.targetLanguage}, from simplest (3-5 words) to richer (max 12 words). Each must answer your last line and move toward the next unmet goal.`,
      `Return JSON only: {"options": [{"text": string, "translation": string${this.phoneticSchema()}}]}.`,
      `"translation" is in ${this.nativeLanguage}.`,
      this.phoneticRule(),
    ].join(" ")
    return this.ask(instructions, this.transcript(), 320, 0.6).then((parsed) => {
      const options = Array.isArray(parsed.options) ? parsed.options : []
      return options.map((option: unknown) => this.readLine(option)).filter((line: TalkLine) => line.text.length > 0).slice(0, 3)
    })
  }

  /** End-of-scene report card. */
  summarize(): Promise<TalkSummary> {
    const instructions = [
      `You are a warm ${this.targetLanguage} teacher reviewing a beginner's role-play (scene: ${this.sceneBrief()}).`,
      `Mission goals: ${JSON.stringify(this.goals)}.`,
      `Return JSON only: {"stars": 1|2|3, "praise": string, "tip": string, "phrases": [{"text": string, "translation": string${this.phoneticSchema()}, "icon": string}]}.`,
      `For each phrase, ${ICON_RULE}`,
      "\"stars\": 3 = goals met with mostly natural language, 2 = goals mostly met, 1 = needs more practice.",
      `"praise": one specific encouraging sentence in ${this.nativeLanguage}, max 18 words.`,
      `"tip": the single most useful thing to improve, in ${this.nativeLanguage}, max 20 words.`,
      `"phrases": up to three useful ${this.targetLanguage} phrases from this scene worth remembering, translated into ${this.nativeLanguage}.`,
      this.phoneticRule(),
    ].join(" ")
    return this.ask(instructions, this.transcript(), 380, 0.4).then((parsed) => {
      const stars = Math.max(1, Math.min(3, Math.round(Number(parsed.stars) || 1)))
      const phrases = Array.isArray(parsed.phrases) ? parsed.phrases.map((phrase: unknown) => this.readLine(phrase)).filter((line: TalkLine) => line.text.length > 0).slice(0, 3) : []
      return {stars, praise: this.clean(parsed.praise, 160), tip: this.clean(parsed.tip, 180), phrases}
    })
  }

  private persona(): string {
    // The learner's own scanned vocabulary: the room scene is built around it,
    // every other scene weaves it in wherever it fits naturally.
    const known = this.roomWords.length === 0 ? ""
      : this.scene === "ROOM"
        ? ` Objects the learner has in this room (in ${this.targetLanguage}): ${this.roomWords.join(", ")}. Ask about them.`
        : ` Words the learner already scanned and is learning (in ${this.targetLanguage}): ${this.roomWords.join(", ")}. Reuse some of them whenever they fit the scene naturally; never force one that makes no sense here.`
    return [
      `You role-play a scene for a language learner whose native language is ${this.nativeLanguage} and who is learning ${this.targetLanguage}.`,
      `Scene: ${this.sceneBrief()}${known}`,
      this.role ? `Your role: ${this.role}.` : "",
      LEVEL_GUIDES[this.level].talk,
      `You always speak ${this.targetLanguage} in character. Never break character inside "line".`,
    ].join(" ")
  }

  /** Scanned words that appear in a line (case-insensitive, punctuation ignored). */
  private knownWordsIn(text: string): string[] {
    const fold = (value: string) => ` ${value.toLowerCase().replace(/[.,;:!?¿¡"'’()«»\-–—…。、！？「」]+/g, " ").replace(/\s+/g, " ").trim()} `
    const haystack = fold(text)
    const found: string[] = []
    for (let i = 0; i < this.roomWords.length; i++) {
      // Articles ("la tasse") are dropped so the noun alone still matches.
      const word = this.roomWords[i]
      const core = fold(word).trim().replace(/^(el|la|los|las|un|una|le|les|l|une|des|the|a|an|der|die|das|ein|eine|il|lo|gli|uno) /, "")
      if (core && haystack.indexOf(` ${core} `) >= 0 && found.indexOf(word) < 0) found.push(word)
    }
    return found
  }

  private sceneBrief(): string {
    if (this.scene !== "CUSTOM") return SCENE_BRIEFS[this.scene]
    return `this place, named by the learner (maybe in ${this.nativeLanguage}): "${this.customPlace}". You play the person the learner would most naturally talk to there (for example the pharmacist in a pharmacy, the guide in a museum), and the conversation is what typically happens in that place.`
  }

  /** PRACTICA HABLAR: five learner lines forming a short dialogue for the scene,
   * simplest first, each with the line the other person says before it. */
  buildDrill(scene: TalkScene, nativeLanguage: LanguageId, targetLanguage: LanguageId, roomWords: string[], customPlace: string = ""): Promise<DrillPlan> {
    this.scene = scene
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    this.roomWords = roomWords.slice(0, 24)
    this.customPlace = this.clean(customPlace, 120)
    this.role = ""
    this.history = []
    const lineSchema = `{"text": string, "translation": string${this.phoneticSchema()}, "icon": string}`
    const instructions = [
      this.persona(),
      ICON_RULE,
      "Write a guided speaking lesson for a TOTAL beginner: a short realistic dialogue in this scene.",
      `Return JSON only: {"role": string, "items": [{"cue": ${lineSchema}, "line": ${lineSchema}}]}.`,
      `"role": your role in 1-3 words, in ${nativeLanguage}.`,
      `"items": exactly 5, in conversation order. "cue" is what YOU (the other person) say, in ${targetLanguage}. "line" is what the LEARNER answers, in ${targetLanguage}: the most useful, natural phrase for that moment.`,
      LEVEL_GUIDES[this.level].drill,
      `Every "translation" is in ${nativeLanguage}.`,
      targetLanguage === "Japanese" ? "Separate Japanese words in \"text\" with single spaces so they can be practiced word by word." : "",
      this.phoneticRule(),
    ].join(" ")
    return this.ask(instructions, "Write the lesson now.", 900, 0.6).then((parsed) => {
      this.role = this.clean(parsed.role, 40)
      const items: DrillItem[] = []
      const raw = Array.isArray(parsed.items) ? parsed.items : []
      for (let i = 0; i < raw.length && items.length < 5; i++) {
        const cue = this.readLine(raw[i]?.cue)
        const line = this.readLine(raw[i]?.line)
        if (line.text) items.push({cue, line, known: this.knownWordsIn(line.text)})
      }
      if (items.length === 0) throw new Error("Speaking drill returned no sentences")
      return {role: this.role, items}
    })
  }

  /** Adaptive placement test, fully spoken: each call returns the next question
   * (harder or easier depending on the answers so far) or, after 3-5 answers,
   * the CEFR verdict. `selfReport` is what the learner said they know. */
  placementStep(nativeLanguage: LanguageId, targetLanguage: LanguageId, selfReport: SpeakingLevel, answers: PlacementAnswer[]): Promise<PlacementStep> {
    this.nativeLanguage = nativeLanguage
    this.targetLanguage = targetLanguage
    const lineSchema = `{"text": string, "translation": string${this.phoneticSchema()}}`
    const transcript = answers.length === 0 ? "(no questions asked yet)"
      : answers.map((entry, i) => `Q${i + 1}: ${entry.question}\nLearner answer (speech recognition, "" = said nothing / skipped): "${entry.answer}"`).join("\n")
    const instructions = [
      `You run a short SPOKEN placement test of ${targetLanguage} for a speaker of ${nativeLanguage}.`,
      `The learner says their level is about ${selfReport} (CEFR, A0 = knows nothing). Start one level below what they claim, then adapt: after a good answer ask something harder, after a weak or empty answer ask something easier.`,
      "Questions must be answerable aloud in one or two sentences, about the learner's own life (name, origin, routine, food, yesterday, plans, opinions).",
      "Speech recognition may write accented speech in the wrong alphabet or as a neighbor language: judge by how it sounds and by meaning.",
      "Ask between 3 and 5 questions in total. Stop early (done) only after 3 questions when the level is clear: e.g. 3 empty answers means A0.",
      `Return JSON only: {"done": boolean, "level": "A0"|"A1"|"A2"|"B1"|"B2", "instruction": string, "question": ${lineSchema}, "message": string}.`,
      `"level": your current best estimate. "instruction": when not done, a short hint in ${nativeLanguage} of what to answer (max 10 words).`,
      `"question": when not done, the question you ask aloud in ${targetLanguage}, with its ${nativeLanguage} translation; empty when done.`,
      `"message": when done, a warm sentence in ${nativeLanguage} (max 22 words) telling the level and how practice will feel; empty otherwise.`,
      this.phoneticRule(),
    ].join(" ")
    return this.ask(instructions, `Answers so far:\n${transcript}`, 320, 0.3).then((parsed) => {
      const level = isSpeakingLevel(parsed.level) ? parsed.level : selfReport
      const question = this.readLine(parsed.question)
      // Never more than 5 questions, never a "next question" without text.
      const done = parsed.done === true || answers.length >= 5 || !question.text
      return {done, level, instruction: this.clean(parsed.instruction, 120), question, message: this.clean(parsed.message, 220)}
    })
  }

  /** Lenient spoken coaching of one practiced sentence (ASR text vs the model line). */
  coachSentence(heard: string, target: TalkLine): Promise<SentenceCoach> {
    const instructions = [
      `You are a warm pronunciation coach for a total beginner (native ${this.nativeLanguage}) learning ${this.targetLanguage}.`,
      `They tried to say: "${target.text}" (${target.translation}). You receive what speech recognition heard.`,
      "Recognition guesses the language on its own: accented speech may appear in the wrong alphabet or as a neighbor language. Judge by how it SOUNDS; ignore punctuation and spelling.",
      LEVEL_GUIDES[this.level].coach,
      `Return JSON only: {"correct": boolean, "coach": string}.`,
      `"coach" is what you SAY ALOUD in ${this.nativeLanguage}, max 18 words, warm and specific: if correct, a short praise; if not, the one sound or word to fix and how (lips, tongue, rhythm), without repeating the whole sentence.`,
    ].join(" ")
    return this.ask(instructions, `Speech recognition heard: "${heard}"`, 160, 0.3).then((parsed) => ({
      correct: parsed.correct === true,
      coach: this.clean(parsed.coach, 180),
    }))
  }

  private phoneticSchema(): string {
    return usesNonLatinScript(this.targetLanguage) ? ", \"phonetic\": string" : ""
  }

  private phoneticRule(): string {
    return usesNonLatinScript(this.targetLanguage)
      ? `Every "phonetic" is the romanized pronunciation (for example Hepburn romaji) of its ${this.targetLanguage} text.`
      : ""
  }

  private transcript(): string {
    const lines = this.history.map((turn) => `${turn.role === "partner" ? "YOU" : "LEARNER"}: ${turn.text}`)
    return `Conversation so far:\n${lines.join("\n")}`
  }

  private readLine(source: any): TalkLine {
    if (!source || typeof source !== "object") return {text: "", translation: "", phonetic: ""}
    return {
      text: this.clean(source.line ?? source.text, 180),
      translation: this.clean(source.translation, 200),
      phonetic: this.clean(source.phonetic, 200),
      icon: isObjectIconKey(source.icon) ? source.icon : undefined,
    }
  }

  private clean(value: unknown, max: number): string {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)
  }

  private ask(system: string, user: string, maxTokens: number, temperature: number): Promise<any> {
    const messages: OpenAITypes.ChatCompletions.Message[] = [
      {role: "system", content: system},
      {role: "user", content: user},
    ]
    return OpenAI.chatCompletions({
      model: MODEL,
      messages,
      response_format: {type: "json_object"},
      temperature,
      max_completion_tokens: maxTokens,
    }).then((response) => {
      const content = response.choices?.[0]?.message?.content
      if (!content) throw new Error("Live Talk returned no content")
      return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""))
    })
  }
}
