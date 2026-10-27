export type ArtCategoryId =
  | 'graphit'
  | 'kohle'
  | 'buntstifte'
  | 'acryl'
  | 'oel'
  | 'skizzen'
  | 'wasserfarbe'

export type ArtToolId =
  | 'graphite'
  | 'charcoal'
  | 'colored-pencil'
  | 'flat-brush'
  | 'palette-knife'
  | 'fineliner'
  | 'round-brush'

export type ArtCategory = {
  id: ArtCategoryId
  title: string
  tool: ArtToolId
  description: string
  path: string
}

export type Artwork = {
  id: string
  category: ArtCategoryId
  title: string
  image: string
  alt: string
}

export const artCategories: ArtCategory[] = [
  {
    id: 'graphit',
    title: 'Graphit',
    tool: 'graphite',
    description: 'Zwischen einer feinen Linie und tiefem Schwarz. Zeichnungen mit Bleistift und Graphit.',
    path: '/art/graphit',
  },
  {
    id: 'kohle',
    title: 'Kohle',
    tool: 'charcoal',
    description: 'Licht, Schatten und die Spuren dazwischen. Zeichnungen mit Zeichenkohle.',
    path: '/art/kohle',
  },
  {
    id: 'buntstifte',
    title: 'Buntstifte',
    tool: 'colored-pencil',
    description: 'Farbe, die Schicht für Schicht entsteht. Zeichnungen mit Buntstiften.',
    path: '/art/buntstifte',
  },
  {
    id: 'acryl',
    title: 'Acryl',
    tool: 'flat-brush',
    description: 'Sichtbare Pinselspuren, kräftige Farben und Raum zum Experimentieren. Malerei mit Acryl.',
    path: '/art/acryl',
  },
  {
    id: 'oel',
    title: 'Öl',
    tool: 'palette-knife',
    description: 'Farbe mit Tiefe. Malerei zwischen sanften Übergängen und spürbarem Farbauftrag.',
    path: '/art/oel',
  },
  {
    id: 'skizzen',
    title: 'Skizzen',
    tool: 'fineliner',
    description: 'Erste Gedanken auf Papier. Beobachtungen, schnelle Linien und kleine Anfänge.',
    path: '/art/skizzen',
  },
  {
    id: 'wasserfarbe',
    title: 'Wasserfarbe',
    tool: 'round-brush',
    description: 'Wasser, Pigment und ein bisschen Zufall. Transparente Farbschichten und freie Verläufe.',
    path: '/art/wasserfarbe',
  },
]

// Eigene Werke hier ergänzen. Die Galerien filtern automatisch nach Kategorie.
export const artworks: Artwork[] = []
