/** Destroying a SceneObject that holds hovered Interactables crashes SIK's
 * cursor cache on device ("Object is null" in ColliderUtils). Disabling first
 * removes it from targeting immediately; the actual destroy runs a beat later,
 * when no interactor can still be holding a reference. */
export function deferDestroy(host: BaseScriptComponent, object: SceneObject, delaySeconds: number = 0.5): void {
  if (!object || isNull(object)) return
  object.enabled = false
  const event = host.createEvent("DelayedCallbackEvent")
  event.bind(() => {
    if (!isNull(object)) object.destroy()
    host.removeEvent(event)
  })
  event.reset(delaySeconds)
}
