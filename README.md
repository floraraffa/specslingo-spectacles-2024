# ☁️ Lingo Specs — learn the language of the world around you

An AI-powered spatial language coach for **Snap Spectacles**, built in Lens Studio.

Lingo Specs helps people learn vocabulary, improve pronunciation, and communicate in real situations. Users can practice with illustrated AI cards, scan the environment to receive useful phrases grounded in the place and objects around them, hold live conversations with an AI partner, and play a pronunciation game.

![Lingo Specs logo](Assets/LingoDesign/LOGO.png)

## 🌐 Web: follow your progress

**[lingospecs.netlify.app](https://lingospecs.netlify.app)**

Tap **CONNECT** in the glasses to see your code (`NUBE-XXXX-XXXX`), then type it on the website to see your progress in every language, your words, and a pronunciation report. You can also do exercises there.

## How it works

Lingo Specs guides the user through a complete language-learning loop:

1. Choose a native language.
2. Choose the language to practice.
3. Learn vocabulary through visual cards or scan a real environment.
4. Listen to a native model, speak, and receive pronunciation coaching.
5. Earn audio and text XP and keep learned cards for later sessions.
6. Use situational phrases immediately—for example, ordering coffee in a café.

## Learning modes

### AI Image Cards

- Illustrated everyday vocabulary in a consistent soft 3D kawaii style.
- Six spatial collections: Home, Food, People, Work, Outside, and Travel.
- Listen, speak, translate, and organize each card.
- Pronunciation verdicts and coaching are localized to the selected native language.
- Audio XP, text XP, progress tracking, and session persistence.

### Scan My World

- Captures the current environment with the Spectacles camera.
- OpenAI identifies the setting and multiple visible objects.
- The experience labels objects and produces practical, situation-aware phrases.
- Users can listen to a phrase, practice it aloud, and receive pronunciation help.
- Detected objects are saved as reusable cards for AI Image Cards practice.

### Live Talk

- A spoken placement test sets the level (A0–B1) for each language.
- Real-life scenes (café, airport, new friend…) with an AI conversation partner.
- The AI corrects out loud in the learner's native language and always waits until it has finished speaking before moving on.

### Cloud Catcher

- A 60-second pronunciation game: say the words on the floating clouds to catch them.
- Streaks, golden clouds, star goals and a list of words to practice afterwards.

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
- Spectacles ASR for speech-to-text and phonetic pronunciation evaluation.
- Kawaii visual system with original illustrated UI, country mascots and landmarks.
- Guided tutorial (shown again whenever it is updated), sun/moon brightness toggle, right-wrist language cloud.
- Persistent user name, language choices, learned cards, and XP.
- Snap Cloud sync: progress per language, words, drawings and Bitmoji, linked to the website with a private code.

## Tech

- Lens Studio **5.15** — Spectacles target
- Spectacles Interaction Kit + Spectacles UIKit
- Remote Service Gateway
- OpenAI `gpt-4.1-mini`, `gpt-image-1-mini`, and `gpt-4o-mini-tts`
- Spectacles ASR Module and Camera Module
- Snap Cloud (Supabase) — schema in [`supabase/`](supabase)
- `persistentStorageSystem` for on-device learning progress
- TypeScript

## Run it

1. Clone this repository.
2. Open `Specslingo 5.15.esproj` in Lens Studio 5.15.
3. Sign in to Lens Studio.
4. Configure the Remote Service Gateway tokens (OpenAI, Google, Snap) from the Lens Studio RSG token panel.
5. Optional, for the cloud sync and the website: import a Snap Cloud project with the Supabase plugin (*Import Credentials*) and run the SQL files in `supabase/`. Without it the Lens works offline.
6. Run the Preview, or push the Lens to Spectacles.
7. Select a native language, a target language, and a learning mode.

The curated vocabulary flow remains available without generated scan results. AI vision, generated illustrations, TTS, Live Talk, and model-assisted pronunciation coaching require the configured Remote Service Gateway and internet access.

## Project structure

```text
Assets/
  AIImages/              Curated vocabulary images
  AIImagesKawaii/        Kawaii card artwork
  Flags/                 Language flags
  LingoDesign/           Logo, mascots, and visual assets
  ScreenDesign/          Screen and button artwork
  Scripts/               Experience, UI, AI, camera, cloud and persistence code
Packages/                 Lens Studio packages
Plugins/                  Lens Studio RSG token-panel plugin code
supabase/                 Snap Cloud database schema
Specslingo 5.15.esproj    Lens Studio project
```

## Credits

- Concept, product direction, design, and illustrated assets: **Florencia Raffa**
- Lens development: Florencia Raffa, with AI-assisted development
- Built for Snap Spectacles with Lens Studio

All original Lingo Specs artwork remains © Florencia Raffa.
