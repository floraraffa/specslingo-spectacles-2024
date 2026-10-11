# ☁️ Lingo Specs — learn the language of the world around you

An AI-powered spatial language coach for **Snap Spectacles (2024)**. Scan your room, learn its words where they live.

![Lingo Specs logo](Assets/LingoDesign/LOGO.png)

## 🌐 Web: follow your progress

**[lingospecs.netlify.app](https://lingospecs.netlify.app)**

Tap **CONNECT** in the glasses to see your code (`NUBE-XXXX-XXXX`), then type it on the website to see your progress in every language, your words, and a pronunciation report. You can also do exercises there.

## What it is

Lingo Specs is an AI-powered spatial language coach for Spectacles. Scan any room and the Lens understands the environment, anchors kawaii vocabulary cards onto the real objects around you, and generates situational phrases you can immediately listen to and practice. Cards speak with **spatial audio from the object itself**, hide behind real walls when you leave the room, and remember which room each word belongs to — returning to your kitchen brings back your kitchen's vocabulary for review right where you stand.

Beyond scanning: a **Word Hunt** game asks "where is…?" and makes you physically find the right card in your space; a wrist-worn glossary keeps every discovered word with AI-illustrated thumbnails, per-room labels and pronunciation playback; and a three-phase quiz (recognition, pronunciation with lenient ASR coaching, phrase ordering) turns everything you scanned into a daily practice loop with persistent XP.

**Live Talk** lets you hold real conversations with an AI partner (ordering a coffee, checking in at the airport, meeting a new friend) after a short spoken level test, and **Cloud Catcher** is a 60-second pronunciation game: say the words on the floating clouds to catch them.

Six languages are fully supported — Spanish, English, German, French, Italian and Japanese — including romanization, phrase phonetics and CJK-aware layout for Japanese learners. Everything adapts to the learner's native language: coaching, UI copy, mascot dialogue, tutorial and spoken feedback.

Built for travelers and everyday learners who want vocabulary to live where the objects live.

## Feature highlights

- Environment-aware scanning: AI room classification, per-word + proximity + room dedupe, world-anchored cards via calibrated ray consensus
- Spatial audio TTS: objects speak from their real position
- Software occlusion: cards hide behind real walls (WorldQuery raycasts)
- Word Hunt: find-the-word game across your anchored cards
- Room-aware review: your saved words resurface in the room where you found them
- Wrist glossary, three-phase quiz, phrase puzzles, XP and full persistence
- Live Talk: spoken placement test (A0–B1) and AI conversation scenes with spoken corrections
- Cloud Catcher pronunciation game with streaks and star goals
- Still-image capture pipeline that keeps the microphone free for ASR
- Guided tutorial in the learner's native language, sun/moon brightness toggle, right-wrist language cloud
- Snap Cloud sync: progress per language, words, drawings and Bitmoji, linked to the website with a private code

## Tech

- Lens Studio **5.15** — Spectacles (2024)
- Spectacles Interaction Kit + Spectacles UIKit
- Remote Service Gateway: OpenAI chat, image generation and text-to-speech
- Spectacles ASR Module, Camera Module and World Query
- Snap Cloud (Supabase) — schema in [`supabase/`](supabase)
- `persistentStorageSystem` for on-device learning progress
- TypeScript

## Run it

1. Clone this repository.
2. Open `Specslingo 5.15.esproj` in Lens Studio 5.15.
3. Sign in to Lens Studio and configure the Remote Service Gateway tokens from the RSG token panel.
4. Optional, for the cloud sync and the website: import a Snap Cloud project with the Supabase plugin (*Import Credentials*) and run the SQL files in `supabase/`. Without it the Lens works offline.
5. Push the Lens to Spectacles, choose your native language, the language to practice, and a mode.

## Credits

Concept, product direction, design and illustrated assets: **Florencia Raffa**.
All original Lingo Specs artwork remains © Florencia Raffa.
