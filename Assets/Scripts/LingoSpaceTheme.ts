/**
 * Shared visual language for the Lingo Specs UI.
 * Owns palette, rounded-font asset, and UIKit button styling only.
 */
import {Button515 as Button} from "./compat515/Button515"
import {StateName} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {GradientParameters} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

export const LINGO_FONT: Font = requireAsset("../Fonts/Fredoka.ttf") as Font

export const LINGO_COLORS = {
  white: new vec4(1, 1, 1, 1),
  softWhite: new vec4(1, 0.97, 1, 0.9),
  lavender: new vec4(0.78, 0.66, 1, 1),
  purple: new vec4(0.61, 0.42, 1, 1),
  aqua: new vec4(0.35, 0.94, 0.9, 1),
  yellow: new vec4(1, 0.76, 0.2, 1),
  coral: new vec4(1, 0.52, 0.58, 1),
  mint: new vec4(0.43, 0.96, 0.72, 1),
  sky: new vec4(0.42, 0.78, 1, 1),
  ink: new vec4(0.19, 0.12, 0.48, 1),
  cream: new vec4(1, 0.96, 0.89, 1),
}

export type LingoTone =
  | "primary"
  | "neutral"
  | "home"
  | "food"
  | "people"
  | "work"
  | "outside"
  | "travel"
  | "success"
  | "warning"
  | "card"

type Tone = {
  base: vec4
  hover: vec4
  pressed: vec4
  border: vec4
  gradient?: GradientParameters
  hoverGradient?: GradientParameters
}

const PRIMARY_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Linear",
  start: new vec2(-1, 1),
  end: new vec2(1, -1),
  stop0: {enabled: true, percent: 0, color: new vec4(0.48, 0.2, 0.96, 1)},
  stop1: {enabled: true, percent: 0.52, color: new vec4(0.34, 0.24, 0.82, 1)},
  stop2: {enabled: true, percent: 1, color: new vec4(0.08, 0.58, 0.68, 1)},
}

const PRIMARY_HOVER_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Linear",
  start: new vec2(-1, 1),
  end: new vec2(1, -1),
  stop0: {enabled: true, percent: 0, color: new vec4(0.65, 0.38, 1, 1)},
  stop1: {enabled: true, percent: 0.55, color: new vec4(0.48, 0.4, 0.94, 1)},
  stop2: {enabled: true, percent: 1, color: new vec4(0.16, 0.76, 0.76, 1)},
}

const TONES: Record<LingoTone, Tone> = {
  primary: {
    base: new vec4(0.61, 0.42, 1, 0.94),
    hover: new vec4(0.75, 0.62, 1, 1),
    pressed: new vec4(0.43, 0.3, 0.82, 1),
    border: new vec4(0.92, 0.84, 1, 0.95),
    gradient: PRIMARY_GRADIENT,
    hoverGradient: PRIMARY_HOVER_GRADIENT,
  },
  neutral: {
    base: new vec4(0.22, 0.14, 0.43, 0.96),
    hover: new vec4(0.38, 0.28, 0.61, 1),
    pressed: new vec4(0.14, 0.09, 0.29, 1),
    border: new vec4(0.82, 0.74, 1, 0.72),
  },
  home: {
    base: new vec4(0.06, 0.5, 0.48, 0.98),
    hover: new vec4(0.1, 0.68, 0.63, 1),
    pressed: new vec4(0.03, 0.34, 0.35, 1),
    border: new vec4(0.63, 1, 0.93, 0.96),
  },
  food: {
    base: new vec4(0.94, 0.43, 0.48, 0.88),
    hover: new vec4(1, 0.61, 0.65, 0.98),
    pressed: new vec4(0.75, 0.28, 0.34, 1),
    border: new vec4(1, 0.78, 0.8, 0.96),
  },
  people: {
    base: new vec4(0.72, 0.49, 0.91, 0.88),
    hover: new vec4(0.86, 0.67, 1, 0.98),
    pressed: new vec4(0.53, 0.34, 0.72, 1),
    border: new vec4(0.92, 0.8, 1, 0.96),
  },
  work: {
    base: new vec4(0.31, 0.66, 0.94, 0.88),
    hover: new vec4(0.49, 0.82, 1, 0.98),
    pressed: new vec4(0.19, 0.47, 0.73, 1),
    border: new vec4(0.74, 0.92, 1, 0.96),
  },
  outside: {
    base: new vec4(0.31, 0.79, 0.5, 0.88),
    hover: new vec4(0.48, 0.96, 0.68, 0.98),
    pressed: new vec4(0.2, 0.6, 0.37, 1),
    border: new vec4(0.72, 1, 0.81, 0.96),
  },
  travel: {
    base: new vec4(0.58, 0.46, 0.96, 0.88),
    hover: new vec4(0.75, 0.64, 1, 0.98),
    pressed: new vec4(0.42, 0.31, 0.77, 1),
    border: new vec4(0.88, 0.81, 1, 0.96),
  },
  success: {
    base: new vec4(0.06, 0.5, 0.38, 0.98),
    hover: new vec4(0.12, 0.68, 0.5, 1),
    pressed: new vec4(0.03, 0.34, 0.25, 1),
    border: new vec4(0.72, 1, 0.85, 0.96),
  },
  warning: {
    base: new vec4(0.95, 0.58, 0.2, 0.9),
    hover: new vec4(1, 0.74, 0.35, 1),
    pressed: new vec4(0.76, 0.4, 0.1, 1),
    border: new vec4(1, 0.88, 0.59, 0.96),
  },
  card: {
    base: new vec4(1, 0.96, 0.89, 0.98),
    hover: new vec4(1, 0.99, 0.96, 1),
    pressed: new vec4(0.94, 0.88, 1, 1),
    border: new vec4(0.68, 0.45, 1, 1),
    gradient: {
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {enabled: true, percent: 0, color: new vec4(1, 0.98, 0.92, 1)},
      stop1: {enabled: true, percent: 0.58, color: new vec4(1, 0.95, 0.89, 1)},
      stop2: {enabled: true, percent: 1, color: new vec4(0.92, 0.88, 1, 0.98)},
    },
  },
}

function solidGradient(color: vec4): GradientParameters {
  return {
    enabled: true,
    type: "Linear",
    start: new vec2(-1, 1),
    end: new vec2(1, -1),
    stop0: {enabled: true, percent: 0, color},
    stop1: {enabled: true, percent: 1, color},
  }
}

export function styleLingoButton(button: Button, toneName: LingoTone): void {
  const tone = TONES[toneName]
  button.onInitialized.add(() => {
    const visual = button.visual as RoundedRectangleVisual
    if (!(visual instanceof RoundedRectangleVisual)) return
    const defaultGradient = tone.gradient || solidGradient(tone.base)
    const hoveredGradient = tone.hoverGradient || solidGradient(tone.hover)
    const triggeredGradient = tone.gradient || solidGradient(tone.pressed)
    visual.defaultBaseType = "Gradient"
    visual.hoveredBaseType = "Gradient"
    visual.triggeredBaseType = "Gradient"
    visual.defaultGradient = defaultGradient
    visual.hoveredGradient = hoveredGradient
    visual.triggeredGradient = triggeredGradient
    visual.baseDefaultColor = tone.base
    visual.baseHoveredColor = tone.hover
    visual.baseTriggeredColor = tone.pressed
    visual.baseToggledDefaultColor = tone.hover
    visual.baseToggledHoveredColor = LINGO_COLORS.white
    visual.baseToggledTriggeredColor = tone.pressed

    visual.defaultHasBorder = true
    visual.hoveredHasBorder = true
    visual.triggeredHasBorder = true
    visual.defaultBorderType = "Color"
    visual.hoveredBorderType = "Color"
    visual.triggeredBorderType = "Color"
    visual.defaultBorderSize = 0.08
    visual.hoveredBorderSize = 0.11
    visual.triggeredBorderSize = 0.08
    visual.borderDefaultColor = tone.border
    visual.borderHoveredColor = LINGO_COLORS.white
    visual.borderTriggeredColor = tone.border

    // Every button shares the marshmallow silhouette: full pill on compact
    // buttons, softly rounded 3.2 corners on large panels — never a hard edge.
    const applyMarshmallow = (): void => {
      const size = button.size
      visual.cornerRadius = Math.min(3.2, Math.min(size.x, size.y) * 0.5)
    }
    applyMarshmallow()
    const refresh = button.createEvent("DelayedCallbackEvent")
    refresh.bind(() => {
      applyMarshmallow()
      visual.setState(StateName.default)
    })
    refresh.reset(0.08)
  })
}

export function categoryTone(id: string): LingoTone {
  if (id === "HOME") return "home"
  if (id === "FOOD") return "food"
  if (id === "PEOPLE") return "people"
  if (id === "WORK") return "work"
  if (id === "OUTSIDE") return "outside"
  return "travel"
}
