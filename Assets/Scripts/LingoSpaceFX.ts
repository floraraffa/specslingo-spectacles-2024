/** Tiny tween engine for kawaii show/hide transitions: pop-in, pop-out, pulse. */

type FXKind = "in" | "out" | "pulse"

type FXRecord = {
  target: SceneObject
  kind: FXKind
  baseScale: vec3
  baseRotation: quat
  elapsed: number
  delay: number
  duration: number
  degrees: number
  amplitude: number
  hz: number
  onDone: (() => void) | null
}

const DEG_TO_RAD = Math.PI / 180
// Back-out cubic tuned for a soft ~1.06 overshoot instead of the classic ~1.10.
const BACK = 1.05

function backOut(t: number): number {
  const inv = t - 1
  return 1 + (BACK + 1) * inv * inv * inv + BACK * inv * inv
}

export class LingoFX {
  private records: FXRecord[] = []

  constructor(host: BaseScriptComponent) {
    const update = host.createEvent("UpdateEvent")
    update.bind(() => this.step(getDeltaTime()))
  }

  popIn(target: SceneObject, opts?: {delay?: number, duration?: number, rotateDegrees?: number}): void {
    const record = this.begin(target, "in")
    if (!record) return
    record.delay = Math.max(0, opts?.delay ?? 0)
    record.duration = Math.max(0.01, opts?.duration ?? 0.42)
    record.degrees = opts?.rotateDegrees ?? -10
    target.enabled = true
    this.applyIn(record, 0)
  }

  popOut(target: SceneObject, onDone?: () => void, opts?: {duration?: number}): void {
    const record = this.begin(target, "out")
    if (!record) {
      if (onDone) onDone()
      return
    }
    record.duration = Math.max(0.01, opts?.duration ?? 0.28)
    record.degrees = 8
    record.onDone = onDone || null
  }

  pulse(target: SceneObject, opts?: {amplitude?: number, hz?: number}): () => void {
    const record = this.begin(target, "pulse")
    if (!record) return () => {}
    record.amplitude = opts?.amplitude ?? 0.06
    record.hz = opts?.hz ?? 1.4
    return () => {
      const index = this.records.indexOf(record)
      if (index < 0) return
      this.records.splice(index, 1)
      if (!isNull(record.target)) record.target.getTransform().setLocalScale(record.baseScale)
    }
  }

  /** Replaces any running tween on this target, reusing its captured base transform. */
  private begin(target: SceneObject, kind: FXKind): FXRecord | null {
    if (isNull(target)) return null
    let baseScale: vec3 | null = null
    let baseRotation: quat | null = null
    for (let i = this.records.length - 1; i >= 0; i--) {
      if (this.records[i].target !== target) continue
      baseScale = this.records[i].baseScale
      baseRotation = this.records[i].baseRotation
      this.records.splice(i, 1)
    }
    const transform = target.getTransform()
    const record: FXRecord = {
      target,
      kind,
      baseScale: baseScale || transform.getLocalScale(),
      baseRotation: baseRotation || transform.getLocalRotation(),
      elapsed: 0,
      delay: 0,
      duration: 0.3,
      degrees: 0,
      amplitude: 0,
      hz: 0,
      onDone: null,
    }
    this.records.push(record)
    return record
  }

  private step(deltaTime: number): void {
    for (let i = this.records.length - 1; i >= 0; i--) {
      const record = this.records[i]
      if (isNull(record.target)) {
        this.records.splice(i, 1)
        continue
      }
      record.elapsed += deltaTime
      if (record.kind === "pulse") {
        const factor = 1 + record.amplitude * Math.sin(record.elapsed * record.hz * Math.PI * 2)
        record.target.getTransform().setLocalScale(record.baseScale.uniformScale(factor))
        continue
      }
      const active = record.elapsed - record.delay
      if (active < 0) continue
      const t = Math.min(1, active / record.duration)
      if (record.kind === "in") {
        this.applyIn(record, t)
        if (t >= 1) this.records.splice(i, 1)
        continue
      }
      const eased = t * t * t
      this.applyPose(record, 1 - 0.4 * eased, record.degrees * eased)
      if (t >= 1) {
        this.records.splice(i, 1)
        record.target.enabled = false
        record.target.getTransform().setLocalScale(record.baseScale)
        record.target.getTransform().setLocalRotation(record.baseRotation)
        if (record.onDone) record.onDone()
      }
    }
  }

  private applyIn(record: FXRecord, t: number): void {
    const eased = backOut(t)
    this.applyPose(record, 0.55 + 0.45 * eased, record.degrees * (1 - eased))
  }

  private applyPose(record: FXRecord, scaleFactor: number, degrees: number): void {
    const transform = record.target.getTransform()
    transform.setLocalScale(record.baseScale.uniformScale(scaleFactor))
    const spin = quat.angleAxis(degrees * DEG_TO_RAD, vec3.up())
    transform.setLocalRotation(record.baseRotation.multiply(spin))
  }
}
