/** Runs visual adjustments after components that initialize on OnStartEvent. */
export function afterComponentStart(host: BaseScriptComponent, action: () => void): void {
  const delayed = host.createEvent("DelayedCallbackEvent")
  delayed.bind(action)
  delayed.reset(0.01)
}
