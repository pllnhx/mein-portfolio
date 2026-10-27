
export type Project = {
  id: string
  title: string
  category: string
  description: string
  status: string
  image?: string
  path?: string
}

export const projects: Project[] = [
  {
    id: 'mouseglow',
    title: 'MouseGlow Background',
    category: 'IT / Web Development',
    description: 'Mein erster interaktiver Hintergrund mit Mausverfolgung.',
    status: 'Fertig',
     image: '/images/mouseglow.png',
     path: '/it/mouseglow'
  },
  {
    id: 'fotoprojekt',
    title: 'Fotoprojekt',
    category: 'Fotografie',
    description: 'Hier entsteht später meine persönliche Fotogalerie.',
    status: 'Fertig',
    image: '/images/Falling.png'
  },
  {
    id: 'kunstprojekt',
    title: 'Kunstprojekt',
    category: 'Kunst',
    description: 'Hier zeige ich später eigene Zeichnungen und Kunstwerke.',
    status: 'In Arbeit',
    path: '/art',
  },
  {
    id: '3d-experiment',
    title: '3D Experiment',
    category: 'IT / Creative Coding',
    description: 'Mein zukünftiges Experiment mit interaktiven 3D-Animationen.',
    status: 'Geplant',
  },
  {
  id: 'videoprojekt',
  title: 'Mein erstes Video',
  category: 'Videografie',
  description: 'Meine ersten Experimente mit Videoschnitt und Motion Graphics.',
  status: 'In Entwicklung',
}
]
