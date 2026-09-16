/** Circular flag icons shared by the menu, the wrist chip and the language pop-up. */
import {LanguageId} from "./LingoSpaceData"

const FLAGS: Record<LanguageId, Texture> = {
  Spanish: requireAsset("../Flags/spanish_256x256.png") as Texture,
  English: requireAsset("../Flags/english_256x256.png") as Texture,
  German: requireAsset("../Flags/german_256x256.png") as Texture,
  French: requireAsset("../Flags/french_256x256.png") as Texture,
  Italian: requireAsset("../Flags/italian_256x256.png") as Texture,
  Japanese: requireAsset("../Flags/japanese_256x256.png") as Texture,
}

export function flagTexture(language: LanguageId): Texture {
  return FLAGS[language]
}
