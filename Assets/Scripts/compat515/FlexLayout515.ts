import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexItem515} from "./FlexItem515"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "./FlexTypes515"

export type FlexLayoutResult515 = {
  containerWidth: number
  containerHeight: number
}

type FlexSize515 = {width: number, height: number}
type FlexMetrics515 = {
  sizes: FlexSize515[]
  contentMain: number
  contentCross: number
  measuredWidth: number
  measuredHeight: number
}

/**
 * Lightweight compatibility layout for projects authored with UIKit 2.0.
 * It covers the row/column, spacing and alignment features used by Specslingo.
 */
@component
export class FlexLayout515 extends BaseScriptComponent {
  width: number = 20
  height: number = 20
  direction: FlexDirection = FlexDirection.Row
  alignItems: FlexAlign = FlexAlign.Stretch
  justifyContent: FlexJustify = FlexJustify.Start
  rowGap: number = 0
  columnGap: number = 0
  paddingTop: number = 0
  paddingBottom: number = 0
  paddingLeft: number = 0
  paddingRight: number = 0
  autoDiscoverItemsOnStart: boolean = true

  private layoutItems: FlexItem515[] = []
  private dirty: boolean = true
  private measuring: boolean = false
  private layoutEvent = new Event<FlexLayoutResult515>()
  readonly onLayoutComplete: PublicApi<FlexLayoutResult515> = this.layoutEvent.publicApi()

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      if (this.autoDiscoverItemsOnStart) this.discoverItems()
      this.markDirty()
    })
    this.createEvent("LateUpdateEvent").bind(() => {
      if (!this.dirty) return
      this.dirty = false
      this.applyLayout()
    })
  }

  addItems(items: FlexItem515[]): void {
    for (let i = 0; i < items.length; i++) {
      if (this.layoutItems.indexOf(items[i]) < 0) this.layoutItems.push(items[i])
    }
    this.markDirty()
  }

  removeItems(items: FlexItem515[]): void {
    for (let i = 0; i < items.length; i++) {
      const index = this.layoutItems.indexOf(items[i])
      if (index >= 0) this.layoutItems.splice(index, 1)
    }
    this.markDirty()
  }

  markDirty(): void {
    this.dirty = true
  }

  /** Returns the real size of this layout, including nested auto-sized layouts. */
  measureSize(): vec2 {
    if (this.measuring) {
      return new vec2(this.width < 0 ? 0 : this.width, this.height < 0 ? 0 : this.height)
    }
    this.measuring = true
    try {
      const metrics = this.calculateMetrics(this.validItems())
      return new vec2(
        this.width < 0 ? metrics.measuredWidth : this.width,
        this.height < 0 ? metrics.measuredHeight : this.height,
      )
    } finally {
      this.measuring = false
    }
  }

  private discoverItems(): void {
    this.layoutItems = []
    const count = this.sceneObject.getChildrenCount()
    for (let i = 0; i < count; i++) {
      const child = this.sceneObject.getChild(i)
      const item = child.getComponent(FlexItem515.getTypeName()) as FlexItem515 | null
      if (item) this.layoutItems.push(item)
    }
  }

  private applyLayout(): void {
    const items = this.validItems()
    const isRow = this.direction === FlexDirection.Row
    const baseGap = isRow ? this.columnGap : this.rowGap
    const mainPaddingStart = isRow ? this.paddingLeft : this.paddingTop
    const mainPaddingEnd = isRow ? this.paddingRight : this.paddingBottom
    const crossPaddingStart = isRow ? this.paddingTop : this.paddingLeft
    const crossPaddingEnd = isRow ? this.paddingBottom : this.paddingRight

    const metrics = this.calculateMetrics(items)
    const contentMain = metrics.contentMain
    const containerWidth = this.width < 0 ? metrics.measuredWidth : this.width
    const containerHeight = this.height < 0 ? metrics.measuredHeight : this.height
    const containerMain = isRow ? containerWidth : containerHeight
    const containerCross = isRow ? containerHeight : containerWidth
    const availableMain = Math.max(0, containerMain - mainPaddingStart - mainPaddingEnd)
    const unused = Math.max(0, availableMain - contentMain)
    let offset = 0
    let gap = baseGap
    if (this.justifyContent === FlexJustify.Center) offset = unused * 0.5
    if (this.justifyContent === FlexJustify.SpaceBetween && items.length > 1) {
      gap = baseGap + unused / (items.length - 1)
    }

    let cursor = isRow
      ? -containerMain * 0.5 + mainPaddingStart + offset
      : containerMain * 0.5 - mainPaddingStart - offset
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemMain = isRow ? metrics.sizes[i].width : metrics.sizes[i].height
      const itemCross = isRow ? metrics.sizes[i].height : metrics.sizes[i].width
      const align = item.alignSelf === FlexAlignSelf.Auto ? this.alignItems as unknown as FlexAlignSelf : item.alignSelf
      let cross = 0
      if (isRow) {
        if (align === FlexAlignSelf.Start) cross = containerCross * 0.5 - crossPaddingStart - itemCross * 0.5
        if (align === FlexAlignSelf.End) cross = -containerCross * 0.5 + crossPaddingEnd + itemCross * 0.5
      } else {
        if (align === FlexAlignSelf.Start) cross = -containerCross * 0.5 + crossPaddingStart + itemCross * 0.5
        if (align === FlexAlignSelf.End) cross = containerCross * 0.5 - crossPaddingEnd - itemCross * 0.5
      }
      const transform = item.sceneObject.getTransform()
      const current = transform.getLocalPosition()
      if (isRow) {
        transform.setLocalPosition(new vec3(cursor + itemMain * 0.5, cross, current.z))
        cursor += itemMain + gap
      } else {
        transform.setLocalPosition(new vec3(cross, cursor - itemMain * 0.5, current.z))
        cursor -= itemMain + gap
      }
    }
    this.layoutEvent.invoke({containerWidth, containerHeight})
  }

  private validItems(): FlexItem515[] {
    const result: FlexItem515[] = []
    for (let i = 0; i < this.layoutItems.length; i++) {
      const item = this.layoutItems[i]
      if (!item || isNull(item)) continue
      const itemObject = item.sceneObject
      if (!itemObject || isNull(itemObject)) continue
      result.push(item)
    }
    return result
  }

  private calculateMetrics(items: FlexItem515[]): FlexMetrics515 {
    const isRow = this.direction === FlexDirection.Row
    const gap = isRow ? this.columnGap : this.rowGap
    const sizes: FlexSize515[] = []
    let contentMain = 0
    let contentCross = 0
    for (let i = 0; i < items.length; i++) {
      const size = this.itemSize(items[i])
      sizes.push(size)
      const itemMain = isRow ? size.width : size.height
      const itemCross = isRow ? size.height : size.width
      contentMain += itemMain
      contentCross = Math.max(contentCross, itemCross)
    }
    if (items.length > 1) contentMain += gap * (items.length - 1)
    return {
      sizes,
      contentMain,
      contentCross,
      measuredWidth: isRow
        ? contentMain + this.paddingLeft + this.paddingRight
        : contentCross + this.paddingLeft + this.paddingRight,
      measuredHeight: isRow
        ? contentCross + this.paddingTop + this.paddingBottom
        : contentMain + this.paddingTop + this.paddingBottom,
    }
  }

  private itemSize(item: FlexItem515): FlexSize515 {
    let width = item.overrideWidth
    let height = item.overrideHeight
    if (width < 0 || height < 0) {
      const nested = item.sceneObject.getComponent(FlexLayout515.getTypeName()) as FlexLayout515 | null
      if (nested && !isNull(nested) && nested !== this) {
        const nestedSize = nested.measureSize()
        if (width < 0) width = nestedSize.x
        if (height < 0) height = nestedSize.y
      }
    }
    const scale = item.sceneObject.getTransform().getLocalScale()
    return {
      width: width < 0 ? Math.abs(scale.x) : width,
      height: height < 0 ? Math.abs(scale.y) : height,
    }
  }
}
