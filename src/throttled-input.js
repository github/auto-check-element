// Throttled Input event
//
// Delays firing `input` event until user is done typing.
//
// Details
//
// * Never fires while a key is down, waits for the next keyup.
//     NOTE: Native OSX text fields won't repeat keys. FF will repeat key while
//           held down.
// * Never fires for selection changes
//     (pressing left or right keys to move the cursor)
//

const throttledInputEvents = new WeakMap()

function schedule(element) {
  const events = throttledInputEvents.get(element)
  if (events.timer != null) clearTimeout(events.timer)

  events.timer = setTimeout(() => {
    if (events.timer != null) events.timer = null
    events.inputed = false
    events.listener.call(null, element)
  }, events.wait)
}

function onKeydownInput(event) {
  const events = throttledInputEvents.get(event.currentTarget)
  events.keypressed = true
  if (events.timer != null) {
    clearTimeout(events.timer)
  }
}

function onKeyupInput(event) {
  const events = throttledInputEvents.get(event.currentTarget)
  events.keypressed = false
  if (events.inputed) {
    schedule(event.currentTarget)
  }
}

function onInputInput(event) {
  const events = throttledInputEvents.get(event.currentTarget)
  events.inputed = true
  if (!events.keypressed) {
    schedule(event.currentTarget)
  }
}

export function addThrottledInputEventListener(target, listener, options = {}) {
  throttledInputEvents.set(target, {
    keypressed: false,
    inputed: false,
    timer: undefined,
    listener,
    wait: options.wait != null ? options.wait : 100
  })

  target.addEventListener('keydown', onKeydownInput)
  target.addEventListener('keyup', onKeyupInput)
  target.addEventListener('input', onInputInput)
}

export function removeThrottledInputEventListener(target, listener) {
  target.removeEventListener('keydown', onKeydownInput)
  target.removeEventListener('keyup', onKeyupInput)
  target.removeEventListener('input', onInputInput)

  const events = throttledInputEvents.get(target)
  if (events) {
    if (events.timer != null && events.listener === listener) {
      clearTimeout(events.timer)
    }
    throttledInputEvents.delete(target)
  }
}

export function dispatchThrottledInputEvent(target) {
  const events = throttledInputEvents.get(target)
  if (events) events.listener.call(null, target)
}
