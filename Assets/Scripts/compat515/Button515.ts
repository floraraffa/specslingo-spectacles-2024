import {RectangleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RectangleButton"

type ButtonVariant515 = {
  theme?: string
  shape?: string
  style?: string
}

/** Generic UIKit 2.0 Button facade backed by the 5.15 RectangleButton. */
@component
export class Button515 extends RectangleButton {
  private compatOpacity: number = 1

  /** UIKit 5.15 resolves theme styles by this exact component name. */
  public get typeString(): string {
    return "RectangleButton"
  }

  setVariant(variant: ButtonVariant515): void {
    if (!variant || !variant.style) return
    this._style = variant.style === "Ghost" ? "Ghost" : variant.style === "Secondary" ? "Secondary" : "Primary"
  }

  get opacity(): number {
    return this.compatOpacity
  }

  set opacity(value: number) {
    this.compatOpacity = Math.max(0, Math.min(1, value))
    if (this.compatOpacity <= 0.02 && !this._initialized) this._style = "Ghost"
  }
}
