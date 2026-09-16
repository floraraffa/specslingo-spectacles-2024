# CLAD Log — Lingo Specs (Week 2 “Guide”)

Development log and representative prompt transcript for the AI-assisted creation of Lingo Specs in Lens Studio 5.23.1. The project was developed collaboratively by Florencia Raffa and Codex/OpenAI through CLAD and the Lens Studio MCP server.

## Human + AI collaboration

- **Florencia:** concept, learning flow, design direction, original UI/mascot/card artwork, UX review, and acceptance decisions.
- **Codex/OpenAI:** Lens Studio project inspection, TypeScript implementation, UIKit layout, localization, RSG/OpenAI integration, camera and ASR flows, debugging, persistence, preview verification, and repository preparation.

Remote Service Gateway credentials are configured on the Lens Studio credentials component. For the hackathon repository, the project owner explicitly authorized bundling the OpenAI, Google, and Snap gateway tokens so evaluators can run the submitted scene directly.

## Aug 12 — independent project and learning concept

**Representative prompt:** “We are starting a new independent project called Specslingo in Lens Studio for SPECS. Use CLAD, starting with lens-studio-router.”

- CLAD verified Lens Studio, the open project, MCP connectivity, target platform, and sign-in state.
- The experience was defined as a spatial language-learning guide rather than a reuse of an earlier fluid experiment.
- The first structure used vocabulary cards that the learner could listen to, pronounce, and organize by context.

## Aug 12 — native language, two learning paths, and voice assistant

**Representative prompt:** “First the person should choose their native language. I want two learning options: AI images and a Scan button that turns objects from the house into cards. Add the OpenAI voice assistant to help with pronunciation and listening.”

- Added native-language selection before target-language selection.
- Designed two modes: AI Image Cards and Scan My World.
- Integrated OpenAI through Remote Service Gateway instead of embedding an API key.
- Added listening, microphone practice, ASR transcription, and pronunciation scoring.
- Exposed background audio as a manual Inspector input so the creator controls the music.
- Expanded vocabulary rotation so “more words” does not repeat the same small set.

## Aug 12–16 — microphone and pronunciation coaching loop

**Representative prompts:**

- “The microphone is not working; it never listens and should tell me if pronunciation is right or wrong.”
- “Everything should follow the user's head.”
- “If pronunciation is wrong, the AI should instruct and teach.”
- “Correct/incorrect and the explanation must be in the selected native language, not always Spanish.”

- Debugged microphone ownership, ASR start/release timing, final-transcript timeout, and sensor handoff.
- Added localized feedback for six native languages.
- Replaced feedback that repeated or mispronounced the target phrase with short verdicts such as “Correct, understood” or “Incorrect, try again.”
- Added model-assisted phonetic comparison that evaluates sound plausibility rather than spelling alone.
- Added language-specific teaching tips when the learner needs another attempt.
- Added TTS model playback, Audio XP, Text XP, and total XP.
- Converted the primary panels to a head-following spatial presentation.

## Aug 16–17 — scan redesign: guide the real situation

**Representative prompt:** “Scanning should not be the same as practicing cards. The AI should understand the situation, label objects, help the person speak in public, and give phrases for the environment—for example ordering coffee in a café. Every scanned object must be saved for AI Image Cards.”

- Reframed Scan My World from an organization task into a situational communication guide.
- Added camera capture, scene interpretation, multiple object labels, setting title, and practical phrases.
- Added phrase selection, Listen, Hold to Talk, pronunciation coaching, and saved-object counts.
- Saved scanned vocabulary into the persistent card library for later practice.
- Added a strict illustration prompt so generated cards use the same isolated, soft 3D kawaii style and correspond to the detected object.

## Aug 17–20 — visual system and multilingual art direction

**Representative prompts:**

- “Use this background on screens 1, 2, and 3 without deforming it.”
- “Use the selected and unselected AI Image Cards / Scan My World artwork.”
- “The card screen must follow the supplied design with category containers and a central card.”
- “Use the previous images and expose fields in the script so I can place the corresponding artwork manually for each language.”

- Integrated Florencia's backgrounds, logo, country mascots, buttons, category art, speech bubbles, and central-card frame.
- Preserved PNG aspect ratios and cloned image materials per texture to prevent card breakage.
- Added per-native-language Inspector inputs for selected/unselected mode artwork.
- Localized setup prompts, buttons, scan guidance, completion copy, and learning feedback.
- Iterated on contrast, font weight, padding, card spacing, scan-preview size, back buttons, plus/minus controls, and bottom safe areas using preview screenshots.

## Aug 20–21 — persistence, user identity, and final layout

**Representative prompts:**

- “Show the country cloud on the first and second screens.”
- “Show the user's name and a welcome message, and save each session so learned cards remain available.”
- “Make the logo larger but proportional, and move all content slightly upward.”
- “Only on the mode-selection screen, make the logo a little smaller so it does not overflow.”

- Added country-specific cloud mascots for the native- and target-language screens.
- Added localized welcome copy with the user's name.
- Persisted profile, selections, card collection, category progress, and XP.
- Separated the logo's layout slot from its square texture scale so it can resize without distortion.
- Applied shared safe-area positioning across the setup flow.
- Added a dedicated, smaller mode-screen logo width to keep it inside the rounded panel.

## Closed-loop verification

CLAD repeatedly ran the same verification loop:

1. Inspect the live Lens Studio project and runtime scene.
2. Make a small TypeScript/UI change.
3. Force TypeScript compilation.
4. Refresh Preview and collect new runtime logs.
5. Inspect the rendered result or user-provided screenshot.
6. Refine sizing, copy, interaction, or error handling.

Final repository-preparation pass:

- Lens Studio 5.23.1 project confirmed open and authorized.
- TypeScript compilation: **succeeded**.
- Preview boot: **succeeded**.
- New runtime errors: **0**.
- Repository credential decision: OpenAI, Google, and Snap RSG gateway tokens intentionally included by explicit project-owner authorization; local MCP configuration and signing keys remain excluded.
- Lens Studio caches, local MCP configuration, lock files, and signing keys excluded from Git.

## CLAD capabilities used

- `lens-studio-router` environment and project gate
- Spectacles UIKit layout and interaction patterns
- Lens Studio MCP project/runtime inspection
- TypeScript recompilation and runtime-log collection
- Remote Service Gateway + OpenAI integration
- SPECS Camera Module and ASR Module
- Preview-driven UI iteration
- Persistent on-device data design
- GitHub delivery and submission documentation
