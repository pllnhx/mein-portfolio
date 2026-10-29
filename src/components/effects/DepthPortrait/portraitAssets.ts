export interface PortraitAssets { photo: string; depth: string; roughness: string; alpha: string }

export const PORTRAIT_ASSETS: PortraitAssets = {
  photo: '/images/Dudi.png',
  depth: '/images/Depthmap.png',
  roughness: '/images/roughness.webp',
  alpha: '/images/alphamaske.png',
}

export const PORTRAIT_SETTINGS = { parallax: .018, reflection: .85, maxDpr: 1.75, gutter: .04, maxPointer: .85 } as const
