# ☁️ Lingo Specs — learn the language of the world around you

An AI-powered spatial language coach for **SPECS**, built in Lens Studio with CLAD.

Lingo Specs helps people learn vocabulary, improve pronunciation, and communicate in real situations. Users can practice with illustrated AI cards or scan the environment to receive useful phrases grounded in the place and objects around them.

Built for the [CLAD Summer Hackathon](https://lenslist.co/clad-summer-hackathon), **Week 2: Guide**.

![Lingo Specs logo](Assets/LingoDesign/LOGO.png)

## Why it fits “Guide”

Week 2 asks for a spatial experience that guides people to learn, complete, or improve a real-world task. Lingo Specs guides the user through a complete language-learning loop:

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
- Hackathon RSG gateway credentials bundled in the scene for evaluator access, as explicitly authorized by the project owner.

## Built with CLAD

Lingo Specs was co-created by **Florencia Raffa** (concept, experience direction, UI system, and illustrated assets) and **Codex/OpenAI** working through the CLAD workflow and Lens Studio MCP server.

CLAD was used to:

- inspect and modify the live Lens Studio project;
- author and iterate on TypeScript components;
- integrate Spectacles UIKit, camera, ASR, and Remote Service Gateway;
- compile, collect runtime logs, inspect scene state, and verify the preview;
- refine layout, localization, pronunciation coaching, persistence, and scan behavior in repeated closed loops.

The development history and representative prompts are documented in [CLAD-LOG.md](CLAD-LOG.md).

## Tech

- Lens Studio **5.23.1** — SPECS target
- Spectacles Interaction Kit + Spectacles UIKit
- Remote Service Gateway
- OpenAI `gpt-4.1-mini`, `gpt-image-1-mini`, and `gpt-4o-mini-tts`
- SPECS ASR Module and Camera Module
- `persistentStorageSystem` for on-device learning progress
- TypeScript

## Run it

1. Clone this repository.
2. Open `Specslingo 4.esproj` in Lens Studio 5.23.1 or later.
3. Sign in to Lens Studio.
4. The hackathon build includes the three RSG gateway credentials used by the experience. If they are expired, regenerate OpenAI, Google, and Snap tokens from the Lens Studio RSG token panel.
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
Specslingo 4.esproj       Lens Studio project
CLAD-LOG.md               AI-assisted prompt and iteration log
SUBMISSION.md             Paste-ready hackathon submission copy
DEMO-SCRIPT.md            Demo-video recording plan
```

## Hackathon materials

- [Public project repository](https://github.com/floraraffa/specslingo)
- [CLAD prompt log](CLAD-LOG.md)
- [Project description](SUBMISSION.md)
- [Demo video script](DEMO-SCRIPT.md)

## Credits

- Concept, product direction, design, and illustrated assets: **Florencia Raffa**
- Lens development: Florencia Raffa + Codex/OpenAI through CLAD
- Built for SPECS with Lens Studio

All original Lingo Specs artwork remains © Florencia Raffa.
