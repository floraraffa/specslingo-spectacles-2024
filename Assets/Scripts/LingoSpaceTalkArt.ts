/** Illustrations for the Live Talk screens. Each slot fills in when its PNG is
 * added (one requireAsset line per image); an empty slot simply isn't drawn,
 * or falls back to art the project already has. */
import {LanguageId} from "./LingoSpaceData"
import {TalkScene} from "./LingoSpaceTalkService"

/** Objects the AI may tag a sentence or mission with (it picks the closest key). */
export const OBJECT_ICON_KEYS = [
  "cup", "coins", "wave", "book", "lamp", "bulb", "notebook", "clock",
  "menu", "suitcase", "ticket", "passport", "bed", "phone", "gift",
] as const
export type ObjectIconKey = typeof OBJECT_ICON_KEYS[number]

export function isObjectIconKey(value: unknown): value is ObjectIconKey {
  return typeof value === "string" && (OBJECT_ICON_KEYS as readonly string[]).indexOf(value) >= 0
}

/** A landmark of the studied language, on clouds (right side of the big screens). */
export const LANDMARKS: Partial<Record<LanguageId, Texture>> = {
  Spanish: requireAsset("../ScreenDesign/talk/landmark-es.png") as Texture,
  English: requireAsset("../ScreenDesign/talk/landmark-en.png") as Texture,
  German: requireAsset("../ScreenDesign/talk/landmark-de.png") as Texture,
  French: requireAsset("../ScreenDesign/talk/landmark-fr.png") as Texture,
  Italian: requireAsset("../ScreenDesign/talk/landmark-it.png") as Texture,
  Japanese: requireAsset("../ScreenDesign/talk/landmark-jp.png") as Texture,
}

/** Scene illustration: right half of each scene button and the conversation header. */
export const SCENE_ART: Partial<Record<TalkScene, Texture>> = {}

export type TalkIconKey =
  | "speakerCircle" | "chevron" | "finishFlag" | "bulb" | "sprout" | "headphones"
  | "move" | "footsteps" | "chat" | "cc" | "flag" | "swap" | "starBadge"
  | "cloudConfused" | "booksCloud"

/** Interface icons. */
export const TALK_ICONS: Partial<Record<TalkIconKey, Texture>> = {
  finishFlag: requireAsset("../ScreenDesign/talk/ic-finish-flag.png") as Texture,
}

/** Object pack for sentence and mission rows. */
export const OBJECT_ICONS: Partial<Record<ObjectIconKey, Texture>> = {}
