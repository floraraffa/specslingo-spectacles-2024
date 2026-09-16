import {FlexAlignSelf} from "./FlexTypes515"

/** Per-child dimensions consumed by FlexLayout515. */
@component
export class FlexItem515 extends BaseScriptComponent {
  overrideWidth: number = -1
  overrideHeight: number = -1
  flexShrink: number = 1
  alignSelf: FlexAlignSelf = FlexAlignSelf.Auto
}
