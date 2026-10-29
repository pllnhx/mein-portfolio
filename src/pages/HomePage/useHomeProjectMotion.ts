import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { PROJECT_MOBILE_SCROLL_RATE, PROJECT_SCROLL_RATE, projectScrollLayout } from './homeProjectMath'

export function useHomeProjectMotion(
  sectionRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  onPortraitActive: (active: boolean) => void,
) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const content = contentRef.current
    if (!section || !content) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let revealObserver: IntersectionObserver | null = null
    let lastPortraitActive: boolean | null = null
    let extraSpace = 0
    let rate = 0
    const tracked = new Set<HTMLElement>()
    const write = (name: string, value: number) => {
      const next = `${value.toFixed(3)}px`
      if (section.style.getPropertyValue(name) !== next) section.style.setProperty(name, next)
    }
    const scroll = () => {
      const top = section.getBoundingClientRect().top
      // Apply before the backdrop's queued rAF reads card rectangles.
      write('--project-drift', Math.min(extraSpace, Math.max(0, -top) * rate))
      const active = top > 40
      if (active !== lastPortraitActive) { lastPortraitActive = active; onPortraitActive(active) }
    }
    const measure = () => {
      rate = media.matches ? 0 : window.innerWidth <= 650 ? PROJECT_MOBILE_SCROLL_RATE : PROJECT_SCROLL_RATE
      const layout = projectScrollLayout(content.offsetTop + content.offsetHeight, window.innerHeight, section.getBoundingClientRect().top, rate)
      extraSpace = layout.extraSpace
      write('--project-scroll-space', extraSpace)
      scroll()
      // Resize/filter changes can also change lens positions without a scroll.
      section.dispatchEvent(new window.Event('project-layout'))
    }
    const observeContent = () => {
      for (const node of tracked) if (!section.contains(node)) { revealObserver?.unobserve(node); tracked.delete(node) }
      section.querySelectorAll<HTMLElement>('[data-project-reveal]').forEach((node) => {
        if (tracked.has(node)) return
        tracked.add(node)
        if (revealObserver && node.dataset.projectVisible !== 'true') revealObserver.observe(node)
        else node.dataset.projectVisible = 'true'
      })
    }
    const configure = () => {
      revealObserver?.disconnect()
      tracked.clear()
      revealObserver = !media.matches && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            const node = entry.target as HTMLElement
            node.dataset.projectVisible = 'true'
            revealObserver?.unobserve(node)
          })
        }, { threshold: .12, rootMargin: '0px 0px -36px 0px' })
        : null
      if (revealObserver) section.dataset.projectMotion = 'on'
      else delete section.dataset.projectMotion
      observeContent()
      measure()
    }
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    resizeObserver?.observe(content)
    const mutations = new MutationObserver(() => { observeContent(); measure() })
    mutations.observe(content, { childList: true, subtree: true })
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('resize', measure)
    media.addEventListener('change', configure)
    configure()
    return () => {
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('resize', measure)
      media.removeEventListener('change', configure)
      resizeObserver?.disconnect()
      mutations.disconnect()
      revealObserver?.disconnect()
      delete section.dataset.projectMotion
      section.style.removeProperty('--project-drift')
      section.style.removeProperty('--project-scroll-space')
      tracked.forEach((node) => { delete node.dataset.projectVisible })
    }
  }, [sectionRef, contentRef, onPortraitActive])
}
