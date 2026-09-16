import {CategoryId, LanguageId} from "./LingoSpaceData"

export type LingoCopyKey =
  | "nativePrompt" | "nativeMascot" | "targetPrompt" | "targetMascot"
  | "modePrompt" | "imageMode" | "imageModeHint" | "scanMode" | "scanModeHint"
  | "ready" | "readyHint" | "start" | "back" | "listen" | "holdToTalk"
  | "scanAgain" | "scanPrompt" | "scanning" | "cameraUnavailable" | "internetScan"
  | "scanFailed" | "savedCards" | "illustrationsReady" | "practiceSaved"
  | "listenPhrase" | "listenThenRepeat" | "nothingReady" | "voiceNeedsInternet"
  | "voiceFailed" | "voiceBusy" | "listening" | "playing" | "releaseToStop" | "finishing" | "nothingHeard"
  | "evaluating" | "organized" | "words" | "audioXp" | "textXp" | "totalXp"
  | "complete" | "nextWords" | "changeSetup" | "guideTitle" | "usage"
  | "spatialMove" | "spatialFollow" | "spatialScanHint" | "spatialCardsReady" | "mainMenu"
  | "quizQuestion" | "quizCorrect" | "quizWrong" | "quizListen" | "quizRepeat"
  | "quizNext" | "quizPhonetic" | "quizProgress" | "scanPulseHint"
  | "scanningBase" | "scanningWait" | "scanningLook"
  | "scan" | "orderPhrase" | "phraseSolved" | "holdStill" | "skip" | "glossary" | "glossaryEmpty" | "nothingNew" | "roomReview"
  | "huntStart" | "huntPrompt" | "huntFound" | "huntTryAgain" | "huntComplete"

const COPY: Record<LanguageId, Record<LingoCopyKey, string>> = {
  Spanish: {
    nativePrompt: "¡Hola! ¿Cuál es tu\nidioma materno? ♡", nativeMascot: "TU MUNDO\nEMPIEZA AQUÍ",
    targetPrompt: "¿Qué idioma quieres\npracticar? ♡", targetMascot: "ELIGE TU\nPRÓXIMA AVENTURA",
    modePrompt: "¿Cómo quieres\npracticar hoy? ✦", imageMode: "TARJETAS CON IA", imageModeHint: "Vocabulario cotidiano ilustrado",
    scanMode: "ESCANEAR MI MUNDO", scanModeHint: "Guía para situaciones reales", ready: "LISTO PARA EXPLORAR TU MUNDO",
    readyHint: "Escucha, habla y recibe ayuda en situaciones reales.", start: "EMPEZAR", back: "VOLVER", listen: "ESCUCHAR",
    holdToTalk: "MANTÉN PARA HABLAR", scanAgain: "ESCANEAR DE NUEVO", scanPrompt: "Escanea el lugar para recibir frases útiles.",
    scanning: "ANALIZANDO EL ENTORNO…", cameraUnavailable: "CÁMARA NO DISPONIBLE", internetScan: "CONECTA INTERNET PARA ESCANEAR",
    scanFailed: "NO PUDE RECONOCER LA SITUACIÓN", savedCards: "TARJETAS GUARDADAS", illustrationsReady: "ILUSTRACIONES LISTAS",
    practiceSaved: "PRACTICAR TARJETAS GUARDADAS", listenPhrase: "Escucha la frase completa y luego practícala.",
    listenThenRepeat: "Ahora mantén el micrófono y repítela.", nothingReady: "Primero crea o muestra una tarjeta.",
    voiceNeedsInternet: "La voz necesita conexión a internet.", voiceFailed: "Falló la reproducción. Intenta de nuevo.", voiceBusy: "La voz está ocupada. Intenta de nuevo.",
    listening: "Escuchando", playing: "Reproduciendo", releaseToStop: "Escuchando… suelta para terminar", finishing: "Terminando la transcripción…",
    nothingHeard: "No escuché nada. Mantén el botón, habla y suelta.", evaluating: "evaluando…", organized: "organizadas",
    words: "palabras", audioXp: "XP AUDIO", textXp: "XP TEXTO", totalXp: "XP TOTAL", complete: "¡MISIÓN COMPLETADA!",
    nextWords: "SIGUIENTES PALABRAS", changeSetup: "CAMBIAR IDIOMAS", guideTitle: "GUÍA PARA ESTA SITUACIÓN", usage: "CÓMO USARLA",
    spatialMove: "MOVER", spatialFollow: "SEGUIR", spatialScanHint: "Camina, escanea y acércate a cada tarjeta.", spatialCardsReady: "TARJETAS ESPACIALES · ACÉRCATE PARA PRACTICAR", mainMenu: "MENÚ",
    quizQuestion: "¿Qué palabra es?", quizCorrect: "¡Correcto!", quizWrong: "Casi… mira la respuesta", quizListen: "ESCUCHAR OTRA VEZ",
    quizRepeat: "Mantén el micrófono y repite la palabra.", quizNext: "SIGUIENTE", quizPhonetic: "PRONUNCIACIÓN", quizProgress: "PALABRA",
    scanPulseHint: "¡Toca ESCANEAR para empezar!",
    scan: "ESCANEAR", skip: "SALTAR", glossary: "GLOSARIO", glossaryEmpty: "Escanea tu mundo para llenar el glosario", nothingNew: "¡Ya conocías todos esos objetos! Apunta a algo nuevo y escanea otra vez.", roomReview: "¡{count} palabras de {room} te esperan aquí! Toca PRACTICAR para repasarlas.",
    huntStart: "CAZA DE PALABRAS", huntPrompt: "¿Dónde está {word}? ¡Búscala y tócala!", huntFound: "¡La encontraste! ✦", huntTryAgain: "Mmm, esa no es. ¡Sigue buscando!", huntComplete: "¡Cacería completa! Eres increíble.", holdStill: "Quédate quieto un momento mientras escaneo…", orderPhrase: "¡Ordena la frase!", phraseSolved: "¡Frase completa!",
    scanningBase: "Analizando el entorno", scanningWait: "Un momento, la IA está mirando", scanningLook: "Quédate quieto un momento",
  },
  English: {
    nativePrompt: "Hi! What’s your\nnative language? ♡", nativeMascot: "YOUR WORLD\nSTARTS HERE",
    targetPrompt: "Which language do you\nwant to practice? ♡", targetMascot: "PICK YOUR\nNEXT ADVENTURE",
    modePrompt: "How do you want\nto practice today? ✦", imageMode: "AI IMAGE CARDS", imageModeHint: "Illustrated everyday vocabulary",
    scanMode: "SCAN MY WORLD", scanModeHint: "Guidance for real situations", ready: "READY TO EXPLORE YOUR WORLD",
    readyHint: "Listen, speak and get help in real situations.", start: "START", back: "BACK", listen: "LISTEN",
    holdToTalk: "HOLD TO TALK", scanAgain: "SCAN AGAIN", scanPrompt: "Scan the place around you to receive useful phrases.",
    scanning: "ANALYZING YOUR SURROUNDINGS…", cameraUnavailable: "CAMERA UNAVAILABLE", internetScan: "CONNECT TO THE INTERNET TO SCAN",
    scanFailed: "I COULDN’T RECOGNIZE THE SITUATION", savedCards: "OBJECT CARDS SAVED", illustrationsReady: "ILLUSTRATIONS READY",
    practiceSaved: "PRACTICE SAVED CARDS", listenPhrase: "Listen to the complete phrase, then practice it.",
    listenThenRepeat: "Now hold the mic and repeat it.", nothingReady: "Create or reveal a card first.",
    voiceNeedsInternet: "Voice playback needs internet.", voiceFailed: "Voice playback failed. Try again.", voiceBusy: "Voice is busy. Try again.",
    listening: "Listening", playing: "Playing", releaseToStop: "Listening… release to stop", finishing: "Finishing transcription…",
    nothingHeard: "Nothing heard. Hold the button, speak, then release.", evaluating: "evaluating…", organized: "organized",
    words: "words", audioXp: "AUDIO XP", textXp: "TEXT XP", totalXp: "TOTAL XP", complete: "MISSION COMPLETE!",
    nextWords: "NEXT WORDS", changeSetup: "CHANGE LANGUAGES", guideTitle: "GUIDE FOR THIS SITUATION", usage: "HOW TO USE IT",
    spatialMove: "MOVE", spatialFollow: "FOLLOW", spatialScanHint: "Walk, scan, and approach each card.", spatialCardsReady: "SPATIAL CARDS · WALK UP TO PRACTICE", mainMenu: "MENU",
    quizQuestion: "What word is this?", quizCorrect: "Correct!", quizWrong: "Not quite… watch the answer", quizListen: "LISTEN AGAIN",
    quizRepeat: "Hold the mic and repeat the word.", quizNext: "NEXT", quizPhonetic: "PRONUNCIATION", quizProgress: "WORD",
    scanPulseHint: "Tap SCAN to begin!",
    scan: "SCAN", skip: "SKIP", glossary: "GLOSSARY", glossaryEmpty: "Scan your world to fill the glossary", nothingNew: "You already know all those objects! Aim at something new and scan again.", roomReview: "{count} words from {room} are waiting here! Tap PRACTICE to review them.",
    huntStart: "WORD HUNT", huntPrompt: "Where is {word}? Find it and tap it!", huntFound: "You found it! ✦", huntTryAgain: "Hmm, not that one. Keep looking!", huntComplete: "Hunt complete! You're amazing.", holdStill: "Hold still for a moment while I scan…", orderPhrase: "Put the phrase in order!", phraseSolved: "Phrase complete!",
    scanningBase: "Analyzing your surroundings", scanningWait: "One moment, the AI is looking", scanningLook: "Hold still for a moment",
  },
  German: {
    nativePrompt: "Hallo! Was ist deine\nMuttersprache? ♡", nativeMascot: "DEINE WELT\nBEGINNT HIER",
    targetPrompt: "Welche Sprache möchtest\ndu üben? ♡", targetMascot: "WÄHLE DEIN\nNÄCHSTES ABENTEUER",
    modePrompt: "Wie möchtest du\nheute üben? ✦", imageMode: "KI-BILDKARTEN", imageModeHint: "Illustrierter Alltagswortschatz",
    scanMode: "MEINE WELT SCANNEN", scanModeHint: "Hilfe für echte Situationen", ready: "BEREIT, DEINE WELT ZU ERKUNDEN",
    readyHint: "Höre, sprich und erhalte Hilfe in echten Situationen.", start: "START", back: "ZURÜCK", listen: "ANHÖREN",
    holdToTalk: "HALTEN & SPRECHEN", scanAgain: "ERNEUT SCANNEN", scanPrompt: "Scanne den Ort für nützliche Sätze.",
    scanning: "UMGEBUNG WIRD ANALYSIERT…", cameraUnavailable: "KAMERA NICHT VERFÜGBAR", internetScan: "ZUM SCANNEN MIT INTERNET VERBINDEN",
    scanFailed: "SITUATION NICHT ERKANNT", savedCards: "KARTEN GESPEICHERT", illustrationsReady: "ILLUSTRATIONEN BEREIT",
    practiceSaved: "GESPEICHERTE KARTEN ÜBEN", listenPhrase: "Höre den ganzen Satz und übe ihn dann.", listenThenRepeat: "Halte jetzt das Mikrofon und wiederhole.",
    nothingReady: "Erstelle oder zeige zuerst eine Karte.", voiceNeedsInternet: "Sprachausgabe benötigt Internet.", voiceFailed: "Wiedergabe fehlgeschlagen. Noch einmal.", voiceBusy: "Die Stimme ist beschäftigt. Noch einmal.",
    listening: "Ich höre", playing: "Wiedergabe", releaseToStop: "Ich höre… zum Beenden loslassen", finishing: "Transkription wird beendet…", nothingHeard: "Nichts gehört. Halten, sprechen, loslassen.",
    evaluating: "wird bewertet…", organized: "sortiert", words: "Wörter", audioXp: "AUDIO-XP", textXp: "TEXT-XP", totalXp: "GESAMT-XP",
    complete: "MISSION ERFÜLLT!", nextWords: "NÄCHSTE WÖRTER", changeSetup: "SPRACHEN ÄNDERN", guideTitle: "HILFE FÜR DIESE SITUATION", usage: "SO VERWENDEST DU ES",
    spatialMove: "VERSCHIEBEN", spatialFollow: "FOLGEN", spatialScanHint: "Gehe herum, scanne und nähere dich jeder Karte.", spatialCardsReady: "RÄUMLICHE KARTEN · ZUM ÜBEN NÄHER KOMMEN", mainMenu: "MENÜ",
    quizQuestion: "Welches Wort ist das?", quizCorrect: "Richtig!", quizWrong: "Fast… sieh dir die Antwort an", quizListen: "NOCHMAL ANHÖREN",
    quizRepeat: "Halte das Mikrofon und wiederhole das Wort.", quizNext: "WEITER", quizPhonetic: "AUSSPRACHE", quizProgress: "WORT",
    scanPulseHint: "Tippe auf SCANNEN, um zu starten!",
    scan: "SCANNEN", skip: "ÜBERSPRINGEN", glossary: "GLOSSAR", glossaryEmpty: "Scanne deine Welt, um das Glossar zu füllen", nothingNew: "Diese Objekte kennst du schon! Ziele auf etwas Neues und scanne erneut.", roomReview: "{count} Wörter aus {room} warten hier! Tippe auf ÜBEN, um sie zu wiederholen.",
    huntStart: "WORTJAGD", huntPrompt: "Wo ist {word}? Finde und tippe es an!", huntFound: "Gefunden! ✦", huntTryAgain: "Hmm, das ist es nicht. Such weiter!", huntComplete: "Jagd geschafft! Du bist großartig.", holdStill: "Halte einen Moment still, während ich scanne…", orderPhrase: "Bring den Satz in Ordnung!", phraseSolved: "Satz geschafft!",
    scanningBase: "Umgebung wird analysiert", scanningWait: "Einen Moment, die KI schaut sich um", scanningLook: "Bleib kurz still stehen",
  },
  French: {
    nativePrompt: "Bonjour ! Quelle est ta\nlangue maternelle ? ♡", nativeMascot: "TON MONDE\nCOMMENCE ICI",
    targetPrompt: "Quelle langue veux-tu\npratiquer ? ♡", targetMascot: "CHOISIS TA\nPROCHAINE AVENTURE",
    modePrompt: "Comment veux-tu\nt’entraîner aujourd’hui ? ✦", imageMode: "CARTES IMAGE IA", imageModeHint: "Vocabulaire quotidien illustré",
    scanMode: "SCANNER MON MONDE", scanModeHint: "Guide pour situations réelles", ready: "PRÊT À EXPLORER TON MONDE",
    readyHint: "Écoute, parle et reçois de l’aide en situation réelle.", start: "COMMENCER", back: "RETOUR", listen: "ÉCOUTER",
    holdToTalk: "MAINTENIR POUR PARLER", scanAgain: "SCANNER ENCORE", scanPrompt: "Scanne le lieu pour obtenir des phrases utiles.",
    scanning: "ANALYSE DE L’ENVIRONNEMENT…", cameraUnavailable: "CAMÉRA INDISPONIBLE", internetScan: "CONNECTE-TOI POUR SCANNER",
    scanFailed: "SITUATION NON RECONNUE", savedCards: "CARTES ENREGISTRÉES", illustrationsReady: "ILLUSTRATIONS PRÊTES",
    practiceSaved: "PRATIQUER LES CARTES", listenPhrase: "Écoute la phrase complète, puis entraîne-toi.", listenThenRepeat: "Maintenant, maintiens le micro et répète.",
    nothingReady: "Crée ou affiche d’abord une carte.", voiceNeedsInternet: "La voix nécessite internet.", voiceFailed: "Échec de la lecture. Réessaie.", voiceBusy: "La voix est occupée. Réessaie.",
    listening: "Écoute", playing: "Lecture", releaseToStop: "Écoute… relâche pour terminer", finishing: "Fin de la transcription…", nothingHeard: "Rien entendu. Maintiens, parle, puis relâche.",
    evaluating: "évaluation…", organized: "organisées", words: "mots", audioXp: "XP AUDIO", textXp: "XP TEXTE", totalXp: "XP TOTAL",
    complete: "MISSION ACCOMPLIE !", nextWords: "MOTS SUIVANTS", changeSetup: "CHANGER LES LANGUES", guideTitle: "GUIDE POUR CETTE SITUATION", usage: "COMMENT L’UTILISER",
    spatialMove: "DÉPLACER", spatialFollow: "SUIVRE", spatialScanHint: "Marche, scanne et approche-toi de chaque carte.", spatialCardsReady: "CARTES SPATIALES · APPROCHE-TOI POUR PRATIQUER", mainMenu: "MENU",
    quizQuestion: "Quel est ce mot ?", quizCorrect: "Bravo !", quizWrong: "Presque… regarde la réponse", quizListen: "RÉÉCOUTER",
    quizRepeat: "Maintiens le micro et répète le mot.", quizNext: "SUIVANT", quizPhonetic: "PRONONCIATION", quizProgress: "MOT",
    scanPulseHint: "Appuie sur SCANNER pour commencer !",
    scan: "SCANNER", skip: "PASSER", glossary: "GLOSSAIRE", glossaryEmpty: "Scanne ton monde pour remplir le glossaire", nothingNew: "Tu connais déjà tous ces objets ! Vise quelque chose de nouveau et rescanne.", roomReview: "{count} mots de {room} t'attendent ici ! Touche PRATIQUER pour les revoir.",
    huntStart: "CHASSE AUX MOTS", huntPrompt: "Où est {word} ? Trouve-le et touche-le !", huntFound: "Trouvé ! ✦", huntTryAgain: "Hmm, ce n'est pas ça. Continue à chercher !", huntComplete: "Bravo, chasse terminée !", holdStill: "Reste immobile un instant pendant que je scanne…", orderPhrase: "Remets la phrase dans l’ordre !", phraseSolved: "Phrase complète !",
    scanningBase: "Analyse de l’environnement", scanningWait: "Un instant, l’IA observe", scanningLook: "Reste immobile un instant",
  },
  Italian: {
    nativePrompt: "Ciao! Qual è la tua\nlingua madre? ♡", nativeMascot: "IL TUO MONDO\nINIZIA QUI",
    targetPrompt: "Quale lingua vuoi\npraticare? ♡", targetMascot: "SCEGLI LA TUA\nPROSSIMA AVVENTURA",
    modePrompt: "Come vuoi esercitarti\noggi? ✦", imageMode: "CARTE IMMAGINE IA", imageModeHint: "Vocabolario quotidiano illustrato",
    scanMode: "SCANSIONA IL MIO MONDO", scanModeHint: "Guida per situazioni reali", ready: "PRONTO A ESPLORARE IL TUO MONDO",
    readyHint: "Ascolta, parla e ricevi aiuto in situazioni reali.", start: "INIZIA", back: "INDIETRO", listen: "ASCOLTA",
    holdToTalk: "PREMI E PARLA", scanAgain: "SCANSIONA ANCORA", scanPrompt: "Scansiona il luogo per ricevere frasi utili.",
    scanning: "ANALISI DELL’AMBIENTE…", cameraUnavailable: "FOTOCAMERA NON DISPONIBILE", internetScan: "CONNETTITI PER SCANSIONARE",
    scanFailed: "SITUAZIONE NON RICONOSCIUTA", savedCards: "CARTE SALVATE", illustrationsReady: "ILLUSTRAZIONI PRONTE",
    practiceSaved: "ESERCITATI CON LE CARTE", listenPhrase: "Ascolta la frase completa, poi esercitati.", listenThenRepeat: "Ora tieni premuto il microfono e ripeti.",
    nothingReady: "Prima crea o mostra una carta.", voiceNeedsInternet: "La voce richiede internet.", voiceFailed: "Riproduzione non riuscita. Riprova.", voiceBusy: "La voce è occupata. Riprova.",
    listening: "In ascolto", playing: "Riproduzione", releaseToStop: "In ascolto… rilascia per terminare", finishing: "Trascrizione in chiusura…", nothingHeard: "Non ho sentito nulla. Tieni premuto, parla e rilascia.",
    evaluating: "valutazione…", organized: "organizzate", words: "parole", audioXp: "XP AUDIO", textXp: "XP TESTO", totalXp: "XP TOTALE",
    complete: "MISSIONE COMPLETATA!", nextWords: "PAROLE SUCCESSIVE", changeSetup: "CAMBIA LINGUE", guideTitle: "GUIDA PER QUESTA SITUAZIONE", usage: "COME USARLA",
    spatialMove: "SPOSTA", spatialFollow: "SEGUI", spatialScanHint: "Cammina, scansiona e avvicinati a ogni carta.", spatialCardsReady: "CARTE SPAZIALI · AVVICINATI PER ESERCITARTI", mainMenu: "MENU",
    quizQuestion: "Che parola è?", quizCorrect: "Corretto!", quizWrong: "Quasi… guarda la risposta", quizListen: "ASCOLTA ANCORA",
    quizRepeat: "Tieni premuto il microfono e ripeti la parola.", quizNext: "AVANTI", quizPhonetic: "PRONUNCIA", quizProgress: "PAROLA",
    scanPulseHint: "Tocca SCANSIONA per iniziare!",
    scan: "SCANSIONA", skip: "SALTA", glossary: "GLOSSARIO", glossaryEmpty: "Scansiona il tuo mondo per riempire il glossario", nothingNew: "Conosci già tutti questi oggetti! Punta qualcosa di nuovo e scansiona di nuovo.", roomReview: "{count} parole di {room} ti aspettano qui! Tocca ESERCITATI per ripassarle.",
    huntStart: "CACCIA ALLE PAROLE", huntPrompt: "Dov'è {word}? Trovala e toccala!", huntFound: "Trovata! ✦", huntTryAgain: "Mmm, non è quella. Continua a cercare!", huntComplete: "Caccia completata! Grandioso.",
    holdStill: "Resta fermo un attimo mentre scansiono…", orderPhrase: "Metti la frase in ordine!", phraseSolved: "Frase completata!",
    scanningBase: "Analisi dell’ambiente", scanningWait: "Un attimo, l’IA sta guardando", scanningLook: "Resta fermo un attimo",
  },
  Japanese: {
    nativePrompt: "こんにちは！母語は\n何ですか？ ♡", nativeMascot: "あなたの世界は\nここから始まる",
    targetPrompt: "どの言語を\n練習しますか？ ♡", targetMascot: "次の冒険を\n選ぼう",
    modePrompt: "今日はどうやって\n練習しますか？ ✦", imageMode: "AI画像カード", imageModeHint: "日常単語をイラストで練習",
    scanMode: "世界をスキャン", scanModeHint: "実際の場面で使えるガイド", ready: "世界を探検する準備完了",
    readyHint: "聞いて、話して、実際の場面でサポートを受けよう。", start: "スタート", back: "戻る", listen: "聞く",
    holdToTalk: "長押しして話す", scanAgain: "もう一度スキャン", scanPrompt: "場所をスキャンして便利なフレーズを表示します。",
    scanning: "周囲を分析中…", cameraUnavailable: "カメラを使用できません", internetScan: "スキャンにはインターネットが必要です",
    scanFailed: "状況を認識できませんでした", savedCards: "カードを保存しました", illustrationsReady: "イラスト準備完了",
    practiceSaved: "保存したカードを練習", listenPhrase: "フレーズ全体を聞いてから練習しましょう。", listenThenRepeat: "マイクを長押しして繰り返してください。",
    nothingReady: "最初にカードを作成または表示してください。", voiceNeedsInternet: "音声にはインターネットが必要です。", voiceFailed: "再生できませんでした。もう一度試してください。", voiceBusy: "音声が使用中です。もう一度試してください。",
    listening: "聞き取り中", playing: "再生中", releaseToStop: "聞き取り中…離すと終了", finishing: "文字起こしを完了中…", nothingHeard: "聞き取れませんでした。長押しして話し、離してください。",
    evaluating: "評価中…", organized: "整理済み", words: "語", audioXp: "音声XP", textXp: "テキストXP", totalXp: "合計XP",
    complete: "ミッション完了！", nextWords: "次の単語", changeSetup: "言語を変更", guideTitle: "この場面のガイド", usage: "使い方",
    spatialMove: "移動", spatialFollow: "追従", spatialScanHint: "歩きながらスキャンし、各カードに近づきましょう。", spatialCardsReady: "空間カード · 近づいて練習", mainMenu: "メニュー",
    quizQuestion: "これは何かな？", quizCorrect: "せいかい！", quizWrong: "おしい！答えを見てみよう", quizListen: "もう一度聞く",
    quizRepeat: "マイクを長押しして単語を繰り返してください。", quizNext: "次へ", quizPhonetic: "はつおん", quizProgress: "単語",
    scanPulseHint: "スキャンをタップして始めよう！",
    scan: "スキャン", skip: "スキップ", glossary: "たんごちょう", glossaryEmpty: "スキャンして たんごちょう を いっぱいに しよう", nothingNew: "その アイテムは もう しっているよ！ あたらしい ものを スキャンしてね。", roomReview: "{room}の ことば {count}こが まっているよ！ 練習で ふくしゅうしてね。",
    huntStart: "ことばさがし", huntPrompt: "{word}は どこかな？ さがして タップしてね！", huntFound: "みつけた！ ✦", huntTryAgain: "うーん、ちがうよ。もっと さがしてね！", huntComplete: "ぜんぶ みつけたね！ すごい！", holdStill: "スキャンする間、少しじっとしていてね…", orderPhrase: "フレーズをならべよう！", phraseSolved: "フレーズかんせい！",
    scanningBase: "周囲を分析中", scanningWait: "ちょっと待ってね、AIが見ています", scanningLook: "少しじっとしていてね",
  },
}

const LANGUAGE_NAMES: Record<LanguageId, Record<LanguageId, string>> = {
  Spanish: {Spanish: "Español", English: "Inglés", German: "Alemán", French: "Francés", Italian: "Italiano", Japanese: "Japonés"},
  English: {Spanish: "Spanish", English: "English", German: "German", French: "French", Italian: "Italian", Japanese: "Japanese"},
  German: {Spanish: "Spanisch", English: "Englisch", German: "Deutsch", French: "Französisch", Italian: "Italienisch", Japanese: "Japanisch"},
  French: {Spanish: "Espagnol", English: "Anglais", German: "Allemand", French: "Français", Italian: "Italien", Japanese: "Japonais"},
  Italian: {Spanish: "Spagnolo", English: "Inglese", German: "Tedesco", French: "Francese", Italian: "Italiano", Japanese: "Giapponese"},
  Japanese: {Spanish: "スペイン語", English: "英語", German: "ドイツ語", French: "フランス語", Italian: "イタリア語", Japanese: "日本語"},
}

const CATEGORY_NAMES: Record<LanguageId, Record<CategoryId, string>> = {
  Spanish: {HOME: "HOGAR", FOOD: "COMIDA", WORK: "TRABAJO", TRAVEL: "VIAJES", PEOPLE: "PERSONAS", OUTSIDE: "EXTERIOR"},
  English: {HOME: "HOME", FOOD: "FOOD", WORK: "WORK", TRAVEL: "TRAVEL", PEOPLE: "PEOPLE", OUTSIDE: "OUTSIDE"},
  German: {HOME: "ZUHAUSE", FOOD: "ESSEN", WORK: "ARBEIT", TRAVEL: "REISEN", PEOPLE: "MENSCHEN", OUTSIDE: "DRAUSSEN"},
  French: {HOME: "MAISON", FOOD: "REPAS", WORK: "TRAVAIL", TRAVEL: "VOYAGE", PEOPLE: "PERSONNES", OUTSIDE: "DEHORS"},
  Italian: {HOME: "CASA", FOOD: "CIBO", WORK: "LAVORO", TRAVEL: "VIAGGI", PEOPLE: "PERSONE", OUTSIDE: "ESTERNO"},
  Japanese: {HOME: "家", FOOD: "食べ物", WORK: "仕事", TRAVEL: "旅行", PEOPLE: "人", OUTSIDE: "屋外"},
}

export function lingoCopy(language: LanguageId | null | undefined, key: LingoCopyKey): string {
  return COPY[language || "English"][key]
}

export function languageName(language: LanguageId, displayLanguage: LanguageId | null | undefined): string {
  return LANGUAGE_NAMES[displayLanguage || "English"][language]
}

export function categoryName(category: CategoryId, displayLanguage: LanguageId | null | undefined): string {
  return CATEGORY_NAMES[displayLanguage || "English"][category]
}
