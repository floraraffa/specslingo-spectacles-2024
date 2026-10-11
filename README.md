# ☁️ Lingo Specs — learn the language of the world around you

An AI-powered spatial language coach for **SPECS**, built in Lens Studio.

Lingo Specs helps people learn vocabulary, improve pronunciation, and communicate in real situations. Users can practice with illustrated AI cards or scan the environment to receive useful phrases grounded in the place and objects around them.

![Lingo Specs logo](Assets/LingoDesign/LOGO.png)

## 🌐 Web: follow your progress

**[lingospecs.netlify.app](https://lingospecs.netlify.app)**

Tap **CONNECT** in the glasses to see your code (`NUBE-XXXX-XXXX`), then type it on the website to see your progress in every language, your words, and a pronunciation report. You can also do exercises there.

## How it guides you

Lingo Specs guides the user through a complete language-learning loop:

1. Choose a native language.
2. Choose the language to practice.
3. Learn vocabulary through visual cards or scan a real environment.
4. Listen to a native model, speak, and receive pronunciation coaching.
5. Earn audio and text XP and keep learned cards for later sessions.
6. Use situational phrases immediately—for example, ordering coffee in a café.

## Two learning modes

### AI Image Cards

- Illustrated everyday vocabulary in a consistent soft 3D kawaii style.
- Six spatial collections: Home, Food, People, Work, Outside, and Travel.
- Listen, speak, translate, and organize each card.
- Pronunciation verdicts and coaching are localized to the selected native language.
- Audio XP, text XP, progress tracking, and session persistence.

### Scan My World

- Captures the current environment with the SPECS camera.
- OpenAI identifies the setting and multiple visible objects.
- The experience labels objects and produces practical, situation-aware phrases.
- Users can listen to a phrase, practice it aloud, and receive pronunciation help.
- Detected objects are saved as reusable cards for AI Image Cards practice.

## Every section, explained

### 1. Start: name, native language, language to practice
- The first screen is in English; once the native language is chosen, the whole Lens (UI, voice, coaching, tutorial) switches to it.
- A language-confirmation screen shows both flags and the chosen mode before starting.
- The studied language can be changed anytime from the wrist (flag + language-cloud pop-up), and each language keeps its own cards and progress.

### 2. Modes screen
- Three cards with single selection: **QUIZ PRACTICE**, **SCAN MY WORLD** and **LIVE TALK**, plus the **CLOUD CATCHER** game button and a shared BACK button.

### 3. Scan My World — the room becomes vocabulary
- The Lens asks you (out loud, in your language) to stay still, then takes a **still photo** with the Spectacles camera (a live stream would block the microphone).
- AI classifies the room (kitchen, living room, bathroom…) and finds several objects with their bounding boxes.
- **World-anchored cards**: each object gets a kawaii card placed right above it, with a leader line. Placement uses the frozen capture pose, a 3×3 grid of World Query rays per object, distance clusters and the AI's distance estimate as a referee.
- **No duplicates**: one card per word (fuzzy matching), plus proximity and room checks, so scanning the same place twice does not repeat objects.
- **Objects talk**: each card speaks its word and phrase with **spatial audio from where the object is**.
- **Software occlusion**: cards hide behind real walls when you leave the room.
- **Room memory**: words remember the room where they were found and come back for review when you return there.
- Each card has the word, the translation, the phonetics of the studied language and a short situational phrase (3–8 words).
- A well-pronounced word opens its **phrase puzzle** (order the words of the sentence) right on the card.
- AI draws a kawaii illustration (transparent background) for every new word; drawings are saved as small thumbnails so they don't have to be generated again.
- Scan HUD: SCAN, practice actions in a 2×2 grid, XP, and the scanned-words summary.

### 4. Word Hunt
- "Where is…?": the Lens says a word and you physically find and touch the right card in your space. Three different words per round, from different rooms.

### 5. AI Image Cards
- Illustrated everyday vocabulary in six collections (Home, Food, People, Work, Outside, Travel), plus every word you scanned.
- Listen, speak, translate and drag each card to its category.

### 6. Quiz Practice (three phases)
- **A — Recognition**: picture + four answers (lilac / gold), with a SKIP button.
- **B — Pronunciation**: say the word; lenient ASR coaching (accents and articles are fine) with a score and one concrete tip in your language.
- **C — Order the phrase**: always reached, even after two missed pronunciation tries.
- Cloudy, the cloud coach, gives every message; the AI always finishes speaking before the next word.
- Final screen: "Mission complete!" with audio XP, text XP and totals.

### 7. Live Talk
- **Placement test**: 3–5 spoken questions set your level (A0–B2) per language; the level adapts content and voice speed.
- **Speaking Practice**: five sentences per scene ("they tell you…"), LISTEN / SAY IT, three tries, spoken correction, then a memory round.
- **AI Practice**: free conversation with three missions, "What do I say?" help and subtitles.
- Scenes: Café, Airport, New friend, My room and Your place (dictated); your scanned words appear in every scene.
- Country landmarks for each language in the headers and summaries.

### 8. Cloud Catcher
- A 60-second pronunciation game in your room: say the words on the floating clouds to catch them.
- +5 seconds per catch, streak multipliers, golden clouds, star goals (6 / 12 words) and a results screen with the words to practice.

### 9. Wrist controls
- **Left wrist**: glossary book, music on/off, language switcher and the "?" tutorial chip (they appear with the palm facing you; without hands they float next to the panel).
- **Right wrist**: a cloud in the studied language that opens Live Talk.
- **Glossary**: alphabetical dictionary without repeated words, with thumbnails, translation, phonetics, play buttons and circular pages; it can be moved or set to follow you.

### 10. Top bar
- **CONNECT** (web code), **MOVE** and **FOLLOW** (place the panel or let it follow you) and the **sun / moon** brightness toggle (the moon dims the Lens by 50%).
- Night / focus mode with a darker sky and stars.

### 11. Guided tutorial
- 13 steps in the learner's native language, with voice and live demos of the real UI (scan, card, phrase, games, quiz, Live Talk, Cloud Catcher, glossary, wrists, top bar).
- SKIP, NEXT and DON'T SHOW AGAIN (the user decides); the "?" on the wrist replays it. When the tutorial is updated, everyone sees it again once.

### 12. Japanese and other scripts
- Romanized pronunciation for every word and phrase in languages with non-Latin scripts, larger CJK text and phrase puzzles that work without spaces.

### 13. Music, voice and sound
- Background music that lowers while the AI speaks or the microphone listens, sound effects for every action, and a coach voice in the learner's language.

### 14. Progress, cloud and website
- Progress is saved on the device: name, languages, cards, drawings, XP, levels and stats per language.
- **Snap Cloud** (Supabase) syncs each language's progress, words, drawings, practice days and the Snapchat **Bitmoji**.
- Every pronunciation and quiz attempt is recorded (score, what was heard, coach tip) for the website's practice report.
- **CONNECT** shows a private code (`NUBE-XXXX-XXXX`) to open [lingospecs.netlify.app](https://lingospecs.netlify.app): progress per language, streaks, your words with their drawings, a "words to improve" report and exercises (picture quiz, listen & choose, say it, order the phrase).

## Supported languages

- Spanish
- English
- German
- French
- Italian
- Japanese

The interface, prompts, feedback, coaching, and language mascot change with the user's native-language selection.

## Highlights

- Head-following spatial interface designed for optical see-through display.
- Multi-object environmental scan and contextual phrase generation.
- OpenAI chat, image generation, and text-to-speech through Remote Service Gateway.
- SPECS ASR for speech-to-text and phonetic pronunciation evaluation.
- Kawaii visual system with original illustrated UI and country mascots.
- Manual per-language artwork slots exposed in the Lens Studio Inspector.
- Persistent user name, language choices, learned cards, and XP.
- RSG gateway credentials bundled in the scene, as explicitly authorized by the project owner.

## How it was built

Lingo Specs was co-created by **Florencia Raffa** (concept, experience direction, UI system, and illustrated assets) with AI coding assistants working through the Lens Studio MCP server: **Codex/OpenAI** built the first version, and **Claude (Anthropic)** built the spatial scanning and card placement, the UI/UX redesign, the glossary and wrist controls, the quiz, Word Hunt, the tutorial, Live Talk, Cloud Catcher, the Snap Cloud sync and the website.

The AI-assisted workflow was used to:

- inspect and modify the live Lens Studio project;
- author and iterate on TypeScript components;
- integrate Spectacles UIKit, camera, ASR, and Remote Service Gateway;
- compile, collect runtime logs, inspect scene state, and verify the preview;
- refine layout, localization, pronunciation coaching, persistence, and scan behavior in repeated closed loops.

## Tech

- Lens Studio **5.15** — SPECS target
- Spectacles Interaction Kit + Spectacles UIKit
- Remote Service Gateway
- OpenAI `gpt-4.1-mini`, `gpt-image-1-mini`, and `gpt-4o-mini-tts`
- SPECS ASR Module, Camera Module (still images) and World Query
- Snap Cloud (Supabase) and Bitmoji — schema in [`supabase/`](supabase)
- `persistentStorageSystem` for on-device learning progress
- TypeScript

## Run it

1. Clone this repository.
2. Open `Specslingo 5.15.esproj` in Lens Studio 5.15.
3. Sign in to Lens Studio.
4. This build includes the three RSG gateway credentials used by the experience. If they are expired, regenerate OpenAI, Google, and Snap tokens from the Lens Studio RSG token panel.
5. Run the Preview, or push the Lens to SPECS.
6. Select a native language, a target language, and one of the two learning modes.

The curated vocabulary flow remains available without generated scan results. AI vision, generated illustrations, TTS, and model-assisted pronunciation coaching require the configured Remote Service Gateway and internet access.

## Project structure

```text
Assets/
  AIImages/              Curated vocabulary images
  AIImagesKawaii/        Kawaii card artwork
  Flags/                 Language flags
  LingoDesign/           Logo, mascots, and visual assets
  ScreenDesign/          Screen and button artwork
  Scripts/               Experience, UI, AI, camera, and persistence code
Packages/                 Lens Studio packages
Plugins/                  Lens Studio RSG token-panel plugin code
supabase/                 Snap Cloud database schema
Specslingo 5.15.esproj    Lens Studio project
SUBMISSION.md             Project description
DEMO-SCRIPT.md            Demo-video recording plan
```

## Project materials

- [Public project repository](https://github.com/floraraffa/specslingo-spectacles-2024)
- [Project description](SUBMISSION.md)
- [Demo video script](DEMO-SCRIPT.md)

## Credits

- Concept, product direction, design, and illustrated assets: **Florencia Raffa**
- Lens development: Florencia Raffa + Codex/OpenAI + Claude (Anthropic)
- Built for SPECS with Lens Studio

All original Lingo Specs artwork remains © Florencia Raffa.
