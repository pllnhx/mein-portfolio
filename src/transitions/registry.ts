import { TransitionRegistry } from './TransitionRegistry'

export const transitionRegistry = new TransitionRegistry().register({
  id: 'it', match: '/it', priority: 0,
  duration: 2.4,
  settings: { density: .85, speed: 1, glitchStrength: .45, revealDuration: 1.15, showSuccess: true },
  load: () => import('./effects/ITTransition').then(({ ITTransition }) => ITTransition),
})
