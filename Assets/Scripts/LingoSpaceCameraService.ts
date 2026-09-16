/** Camera stream and freeze-frame capture for the SCAN learning mode. */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

export type LingoSpaceCapture = {
  texture: Texture
  base64Jpeg: string
  /** Device-reference pose at the instant the analyzed frame was captured. */
  deviceWorldTransform: mat4
}

export class LingoSpaceCameraService {
  private cameraModule: CameraModule = require("LensStudio:CameraModule")
  private cameraTexture: Texture | null = null
  private provider: CameraTextureProvider | null = null
  private starting: Promise<Texture> | null = null
  /** Bumped by invalidateForVoice so a frame from a superseded request can
   * never resurrect the live-stream handles ASR needed released. */
  private startGeneration = 0
  private worldCamera = WorldCameraFinderProvider.getInstance()

  /** Host component for DelayedCallbackEvent-based retry pacing. */
  constructor(private host: BaseScriptComponent) {}

  ensureStarted(): Promise<Texture> {
    if (this.cameraTexture) return Promise.resolve(this.cameraTexture)
    if (this.starting) return this.starting

    const generation = ++this.startGeneration
    this.starting = new Promise<Texture>((resolve, reject) => {
      try {
        const request = CameraModule.createCameraRequest()
        request.cameraId = CameraModule.CameraId.Default_Color
        // Full sensor height: when the still capture is unavailable and this
        // stream is the fallback, the AI still gets a legible room photo.
        request.imageSmallerDimension = 756
        const texture = this.cameraModule.requestCamera(request)
        const provider = texture.control as CameraTextureProvider
        // A camera request can hang without ever throwing (no onNewFrame): the
        // watchdog turns that silence into a rejection so callers can fall back.
        const watchdog = this.host.createEvent("DelayedCallbackEvent")
        const registration = provider.onNewFrame.add(() => {
          provider.onNewFrame.remove(registration)
          this.host.removeEvent(watchdog)
          if (generation !== this.startGeneration) return
          this.cameraTexture = texture
          this.provider = provider
          resolve(texture)
        })
        watchdog.bind(() => {
          provider.onNewFrame.remove(registration)
          this.host.removeEvent(watchdog)
          if (generation !== this.startGeneration) return
          this.starting = null
          reject(new Error("Camera stream delivered no frame within 6s"))
        })
        watchdog.reset(6)
      } catch (error) {
        if (generation === this.startGeneration) this.starting = null
        reject(error)
      }
    })
    return this.starting
  }

  capture(): Promise<LingoSpaceCapture> {
    // On Spectacles a LIVE camera stream owns the sensitive-sensor pipeline and
    // silences the microphone for ASR. A still-image request holds no stream:
    // the mic stays free, and the 3200x2400 frame gives the AI far sharper
    // bounding boxes than the 512px stream ever did. The editor preview keeps
    // the stream path (still requests are Spectacles-only).
    if (global.deviceInfoSystem.isEditor()) return this.captureFromStream()
    // Right after Lens start the camera pipeline can still be busy
    // ("Last trigger of unfinished task is lost"), so the still capture gets
    // three paced attempts before surrendering to the stream fallback.
    return this.captureStillWithRetry(0).catch((error) => {
      print(`[LINGO CAMERA] still capture unavailable (${String(error)}); using live stream fallback`)
      return this.captureFromStream()
    })
  }

  private captureStillWithRetry(attempt: number): Promise<LingoSpaceCapture> {
    return this.captureStill().catch((error) => {
      if (attempt >= 2) throw error
      print(`[LINGO CAMERA] still capture attempt ${attempt + 1} failed (${String(error)}); retrying`)
      return this.delay(0.6).then(() => this.captureStillWithRetry(attempt + 1))
    })
  }

  private delay(seconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const event = this.host.createEvent("DelayedCallbackEvent")
      event.bind(() => {
        resolve()
        this.host.removeEvent(event)
      })
      event.reset(seconds)
    })
  }

  private captureStill(): Promise<LingoSpaceCapture> {
    let request: CameraModule.ImageRequest
    try {
      request = CameraModule.createImageRequest()
    } catch (error) {
      return Promise.reject(error)
    }
    // The wearer was just asked to hold still, so the pose at request time
    // matches the exposure closely.
    const deviceWorldTransform = this.worldCamera.getWorldTransform()
    return this.cameraModule.requestImage(request).then((frame) => {
      print("[LINGO CAMERA] still image captured; no live stream held")
      // The still frame is already a stable texture: encode it for the AI but
      // never round-trip it through Base64 decode (3200x2400 decodes fail on
      // device with "Captured frame decoding failed").
      return this.encode(frame.texture).then((base64Jpeg) => ({texture: frame.texture, base64Jpeg, deviceWorldTransform}))
    })
  }

  private captureFromStream(): Promise<LingoSpaceCapture> {
    // Keep the capture pose with the pixels. AI returns later, after the wearer may
    // have moved, so current-head projection would put every card in the wrong room area.
    // The pose is sampled AFTER the stream is confirmed live, in the same frame the
    // texture is encoded — a cold stream start can no longer desync pose and pixels.
    return this.ensureStarted()
      .then((texture) => {
        const deviceWorldTransform = this.worldCamera.getWorldTransform()
        return this.encode(texture)
          .then((base64Jpeg) => this.decode(base64Jpeg).then((decoded) => ({texture: decoded, base64Jpeg, deviceWorldTransform})))
      })
  }

  /** ASR takes ownership of the sensitive sensor pipeline on Specs.
   * Drop the live camera handles after a frozen card has been created so the
   * next scanner screen requests a fresh stream instead of reusing a stalled one.
   */
  invalidateForVoice(): void {
    this.startGeneration += 1
    this.cameraTexture = null
    this.provider = null
    this.starting = null
    print("[LINGO CAMERA] live stream invalidated before voice practice")
  }

  private encode(texture: Texture): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      Base64.encodeTextureAsync(
        texture,
        (encoded) => resolve(encoded),
        () => reject(new Error("Camera frame encoding failed")),
        CompressionQuality.IntermediateQuality,
        EncodingType.Jpg,
      )
    })
  }

  private decode(base64Jpeg: string): Promise<Texture> {
    return new Promise<Texture>((resolve, reject) => {
      Base64.decodeTextureAsync(
        base64Jpeg,
        (texture) => resolve(texture),
        () => reject(new Error("Captured frame decoding failed")),
      )
    })
  }
}
