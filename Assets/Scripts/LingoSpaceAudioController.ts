/** Owns UI sounds plus an optional user-selected background track. */
const CLICK: AudioTrackAsset = requireAsset("../GeneratedSFX/ButtonClick.wav") as AudioTrackAsset
const SAVED: AudioTrackAsset = requireAsset("../GeneratedSFX/SavedToCollection.wav") as AudioTrackAsset
const SOFT_RETURN: AudioTrackAsset = requireAsset("../GeneratedSFX/SoftReturn.wav") as AudioTrackAsset

export class LingoSpaceAudioController {
  private click: AudioComponent
  private saved: AudioComponent
  private softReturn: AudioComponent
  private music: AudioComponent | null = null
  private baseMusicVolume = 0
  private duckCount = 0

  constructor(owner: SceneObject) {
    this.click = this.create(owner, CLICK, 0.55)
    this.saved = this.create(owner, SAVED, 0.22)
    this.softReturn = this.create(owner, SOFT_RETURN, 0.4)
  }

  initializeForSpecs(backgroundMusic?: AudioTrackAsset, backgroundMusicVolume: number = 0.06): void {
    this.click.playbackMode = Audio.PlaybackMode.LowLatency
    this.saved.playbackMode = Audio.PlaybackMode.LowLatency
    this.softReturn.playbackMode = Audio.PlaybackMode.LowLatency
    if (!backgroundMusic) {
      console.log("LINGO SPACE background music: none selected")
      return
    }
    const quietBackgroundVolume = Math.max(0, Math.min(0.06, backgroundMusicVolume))
    this.baseMusicVolume = quietBackgroundVolume
    this.music = this.create(this.click.getSceneObject().getParent(), backgroundMusic, quietBackgroundVolume)
    this.music.playbackMode = Audio.PlaybackMode.LowPower
    this.music.play(-1)
    console.log(`LINGO SPACE background music: ${backgroundMusic.name}`)
  }

  playClick(): void { this.click.play(1) }
  playSaved(): void { this.saved.play(1) }
  playSoftReturn(): void { this.softReturn.play(1) }

  /** Reference-counted so the mic and the AI voice can overlap without fighting. */
  duckMusic(): void {
    this.duckCount += 1
    this.applyMusicVolume()
  }

  restoreMusic(): void {
    this.duckCount = Math.max(0, this.duckCount - 1)
    this.applyMusicVolume()
  }

  private musicEnabled = true
  private quietMode = false

  isMusicEnabled(): boolean {
    return this.musicEnabled
  }

  /** Whisper mode: everything the Lens emits drops to library volume. */
  setQuietMode(on: boolean): void {
    if (this.quietMode === on) return
    this.quietMode = on
    const scale = on ? 0.35 : 1
    this.click.volume = 0.55 * scale
    this.saved.volume = 0.22 * scale
    this.softReturn.volume = 0.4 * scale
    this.applyMusicVolume()
  }

  isQuietMode(): boolean {
    return this.quietMode
  }

  hasMusic(): boolean {
    return !!this.music
  }

  /** Palm switch: silences or revives the background track; returns the new state. */
  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled
    this.applyMusicVolume()
    return this.musicEnabled
  }

  private applyMusicVolume(): void {
    if (!this.music) return
    if (!this.musicEnabled) {
      this.music.volume = 0
      return
    }
    const base = this.baseMusicVolume * (this.quietMode ? 0.4 : 1)
    this.music.volume = this.duckCount > 0 ? Math.min(base, 0.008) : base
  }

  private create(owner: SceneObject, track: AudioTrackAsset, volume: number): AudioComponent {
    const audioObject = global.scene.createSceneObject(`Audio-${track.name}`)
    audioObject.setParent(owner)
    const component = audioObject.createComponent("Component.AudioComponent") as AudioComponent
    component.audioTrack = track
    component.volume = volume
    return component
  }
}
