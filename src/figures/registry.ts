import type { FigureCategory, FigureDefinition } from '../types';

/**
 * Single source of truth for every figure type the Scenery Library can
 * offer — mirrors src/devices/registry.ts. Adding a new figure means adding
 * one entry here, never touching a React component. Dimensions are realistic
 * average human/instrument sizes so figures read at true stage scale.
 */
export const FIGURE_DEFINITIONS: FigureDefinition[] = [
  {
    id: 'figure-dancer',
    name: 'Dancer',
    category: 'DANCER',
    icon: 'dancer',
    footprint: { width: 0.5, depth: 0.5 },
    heightMeters: 1.7,
    namePrefix: 'Dancer',
  },
  {
    id: 'figure-band-member',
    name: 'Band Member',
    category: 'BAND_MEMBER',
    icon: 'dancer',
    footprint: { width: 0.6, depth: 0.6 },
    heightMeters: 1.75,
    namePrefix: 'Band Member',
  },
  {
    id: 'figure-drummer-seated',
    name: 'Drummer (Seated)',
    category: 'BAND_MEMBER',
    icon: 'dancer',
    footprint: { width: 0.7, depth: 0.7 },
    heightMeters: 1.2,
    namePrefix: 'Drummer',
  },
  {
    id: 'figure-guitar',
    name: 'Guitar Stand',
    category: 'INSTRUMENT',
    icon: 'instrument',
    footprint: { width: 0.3, depth: 0.15 },
    heightMeters: 1.0,
    namePrefix: 'Guitar',
  },
  {
    id: 'figure-drum-kit',
    name: 'Drum Kit',
    category: 'INSTRUMENT',
    icon: 'instrument',
    footprint: { width: 1.4, depth: 1.4 },
    heightMeters: 1.1,
    namePrefix: 'Drum Kit',
  },
  {
    id: 'figure-keyboard',
    name: 'Keyboard Stand',
    category: 'INSTRUMENT',
    icon: 'instrument',
    footprint: { width: 1.2, depth: 0.5 },
    heightMeters: 0.9,
    namePrefix: 'Keyboard',
  },
  {
    id: 'figure-mic-stand',
    name: 'Mic Stand',
    category: 'INSTRUMENT',
    icon: 'instrument',
    footprint: { width: 0.3, depth: 0.3 },
    heightMeters: 1.4,
    namePrefix: 'Mic Stand',
  },
];

const definitionById = new Map(FIGURE_DEFINITIONS.map((d) => [d.id, d]));

export function getFigureDefinition(id: string): FigureDefinition | undefined {
  return definitionById.get(id);
}

export const FIGURE_CATEGORY_ORDER: FigureCategory[] = ['DANCER', 'BAND_MEMBER', 'INSTRUMENT'];

export const FIGURE_CATEGORY_LABELS: Record<FigureCategory, string> = {
  DANCER: 'Dancers',
  BAND_MEMBER: 'Band',
  INSTRUMENT: 'Instruments',
};

export function getFigureDefinitionsByCategory(category: FigureCategory): FigureDefinition[] {
  return FIGURE_DEFINITIONS.filter((d) => d.category === category);
}
