export const abortError = () => new DOMException('Transition cancelled', 'AbortError')

export function guarded<T>(promise: Promise<T>, signal: AbortSignal, timeout = 0): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError())
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); reject(abortError()) }
    signal.addEventListener('abort', abort, { once: true })
    if (timeout) timer = setTimeout(() => { cleanup(); reject(new Error('Transition stage timed out')) }, timeout)
    promise.then((value) => { cleanup(); resolve(value) }, (error: unknown) => { cleanup(); reject(error) })
  })
}

export function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(abortError()); return }
    const abort = () => { clearTimeout(timer); reject(abortError()) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })
}

export async function afterPaint(signal: AbortSignal) {
  for (let index = 0; index < 2; index++) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(abortError()); return }
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        cancelAnimationFrame(frame)
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        resolve()
      }
      const abort = () => {
        if (settled) return
        settled = true
        cancelAnimationFrame(frame)
        clearTimeout(timer)
        reject(abortError())
      }
      const frame = requestAnimationFrame(finish)
      const timer = setTimeout(finish, 80)
      signal.addEventListener('abort', abort, { once: true })
    })
  }
}
