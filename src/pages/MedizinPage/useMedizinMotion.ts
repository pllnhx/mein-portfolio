import { useEffect } from 'react'
import type { RefObject } from 'react'

const motionProperties = ['--scroll-y', '--pointer-x', '--pointer-y'] as const
const clamp = (value: number) => Math.max(-1, Math.min(1, value))
const amplitude = (value: string | undefined) => Number.isFinite(Number(value)) ? Number(value) : 0

/** One sleeping frame loop for the page; transforms stay outside React renders. */
export default function useMedizinMotion(ref: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const page = ref.current
    if (!page) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const previousMode = page.getAttribute('data-motion')
    const previousProgress = page.style.getPropertyValue('--scroll-progress')
    const reveals = [...page.querySelectorAll<HTMLElement>('[data-reveal]')]
      .map(node => ({ node, previous: node.getAttribute('data-revealed') }))
    const items = [...page.querySelectorAll<HTMLElement>('[data-parallax], [data-pointer]')].map(node => ({
      node,
      scrollAmplitude: amplitude(node.dataset.parallax),
      pointerAmplitude: amplitude(node.dataset.pointer),
      current: [0, 0, 0],
      target: [0, 0, 0],
      previous: motionProperties.map(property => ({
        value: node.style.getPropertyValue(property),
        priority: node.style.getPropertyPriority(property),
      })),
    }))

    let frame: number | null = null
    let lastFrame: number | null = null
    let scrollDirty = true
    let disposeActive = () => {}

    const cancelFrame = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      lastFrame = null
    }

    const reset = () => {
      page.style.setProperty('--scroll-progress', '0')
      items.forEach(item => {
        item.current.fill(0)
        item.target.fill(0)
        motionProperties.forEach(property => item.node.style.setProperty(property, '0px'))
      })
    }

    const render = (time: number) => {
      frame = null
      if (scrollDirty) {
        const viewportHeight = Math.max(1, window.innerHeight)
        const scrollDistance = Math.max(1, document.documentElement.scrollHeight - viewportHeight)
        page.style.setProperty('--scroll-progress', Math.max(0, Math.min(1, window.scrollY / scrollDistance)).toFixed(4))
        // Read every anchor before writing transforms to avoid layout feedback.
        items.forEach(item => {
          if (!item.scrollAmplitude) return
          const box = item.node.parentElement!.getBoundingClientRect()
          const distance = viewportHeight / 2 - (box.top + box.height / 2)
          item.target[0] = clamp(distance / ((viewportHeight + box.height) / 2)) * item.scrollAmplitude
        })
        scrollDirty = false
      }

      const delta = lastFrame === null ? 16 : Math.min(64, Math.max(0, time - lastFrame))
      const smoothing = 1 - Math.exp(-delta / 75)
      let unsettled = false
      items.forEach(item => {
        motionProperties.forEach((property, index) => {
          const difference = item.target[index] - item.current[index]
          item.current[index] = Math.abs(difference) < .1
            ? item.target[index]
            : item.current[index] + difference * smoothing
          if (Math.abs(item.target[index] - item.current[index]) < .1) item.current[index] = item.target[index]
          else unsettled = true
          item.node.style.setProperty(property, `${item.current[index].toFixed(3)}px`)
        })
      })
      if (unsettled) {
        lastFrame = time
        frame = requestAnimationFrame(render)
      } else lastFrame = null
    }

    const wake = () => {
      if (frame === null) frame = requestAnimationFrame(render)
    }
    const updateScroll = () => {
      scrollDirty = true
      wake()
    }
    const movePointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !finePointer.matches) return
      const x = clamp(event.clientX / Math.max(1, window.innerWidth) * 2 - 1)
      const y = clamp(event.clientY / Math.max(1, window.innerHeight) * 2 - 1)
      items.forEach(item => {
        item.target[1] = x * item.pointerAmplitude
        item.target[2] = y * item.pointerAmplitude
      })
      wake()
    }
    const leavePointer = () => {
      items.forEach(item => {
        item.target[1] = 0
        item.target[2] = 0
      })
      wake()
    }

    const sync = () => {
      disposeActive()
      cancelFrame()
      reset()
      if (reduced.matches || document.hidden) {
        page.dataset.motion = reduced.matches ? 'reduced' : 'paused'
        if (reduced.matches) reveals.forEach(({ node }) => { node.dataset.revealed = 'true' })
        disposeActive = () => {}
        return
      }

      page.dataset.motion = 'active'
      let observer: IntersectionObserver | null = null
      let observing = true
      if (typeof IntersectionObserver === 'undefined') {
        reveals.forEach(({ node }) => { node.dataset.revealed = 'true' })
      } else {
        observer = new IntersectionObserver(entries => {
          if (!observing) return
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const node = entry.target as HTMLElement
              node.dataset.revealed = 'true'
              observer?.unobserve(node)
            }
          })
        }, { threshold: .12, rootMargin: '0px 0px -24px 0px' })
        reveals.forEach(({ node }) => {
          if (node.dataset.revealed !== 'true') observer!.observe(node)
        })
      }

      window.addEventListener('scroll', updateScroll, { passive: true })
      window.addEventListener('resize', updateScroll, { passive: true })
      page.addEventListener('load', updateScroll, true)
      if (finePointer.matches) {
        page.addEventListener('pointermove', movePointer, { passive: true })
        page.addEventListener('pointerleave', leavePointer)
      }
      disposeActive = () => {
        observing = false
        window.removeEventListener('scroll', updateScroll)
        window.removeEventListener('resize', updateScroll)
        page.removeEventListener('load', updateScroll, true)
        page.removeEventListener('pointermove', movePointer)
        page.removeEventListener('pointerleave', leavePointer)
        observer?.disconnect()
      }
      updateScroll()
    }

    reduced.addEventListener('change', sync)
    finePointer.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    sync()

    return () => {
      disposeActive()
      cancelFrame()
      reduced.removeEventListener('change', sync)
      finePointer.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      if (previousMode === null) page.removeAttribute('data-motion')
      else page.setAttribute('data-motion', previousMode)
      if (previousProgress) page.style.setProperty('--scroll-progress', previousProgress)
      else page.style.removeProperty('--scroll-progress')
      reveals.forEach(({ node, previous }) => {
        if (previous === null) node.removeAttribute('data-revealed')
        else node.setAttribute('data-revealed', previous)
      })
      items.forEach(item => motionProperties.forEach((property, index) => {
        const previous = item.previous[index]
        if (previous.value) item.node.style.setProperty(property, previous.value, previous.priority)
        else item.node.style.removeProperty(property)
      }))
    }
  }, [ref])
}
