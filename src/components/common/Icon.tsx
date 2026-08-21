/**
 * Small inline icon set. Kept as simple stroke-based glyphs so the app has
 * no external icon-font/CDN dependency. Referenced by DeviceDefinition.icon
 * strings and by UI chrome — never inline SVG scattered across components.
 */
export type IconName =
  | 'flame'
  | 'co2'
  | 'spark'
  | 'pyro'
  | 'smoke'
  | 'fog'
  | 'confetti'
  | 'undo'
  | 'redo'
  | 'play'
  | 'stop'
  | 'save'
  | 'folder-open'
  | 'file-plus'
  | 'settings'
  | 'download'
  | 'view-2d'
  | 'view-3d'
  | 'lock'
  | 'unlock'
  | 'group'
  | 'trash'
  | 'duplicate'
  | 'align-left'
  | 'align-center-x'
  | 'align-right'
  | 'distribute-h'
  | 'distribute-v'
  | 'ruler'
  | 'cursor'
  | 'chevron-down'
  | 'chevron-right'
  | 'grid'
  | 'music'
  | 'cue'
  | 'keyboard'
  | 'record'
  | 'scissors'
  | 'dancer'
  | 'instrument'
  | 'platform'
  | 'hand'
  | 'record-clip'
  | 'playlist'
  | 'shape-open'
  | 'shape-cone'
  | 'shape-inverted-cone'
  | 'auto-render'
  | 'drag-handle';

const PATHS: Record<IconName, string> = {
  flame: 'M12 2c1 3-3 4-3 7a3 3 0 1 0 6 0c0-1-.5-2-1-2 1 3-1 4-2 4a2 2 0 0 1-2-2c0-2 2-3 2-7Z',
  co2: 'M4 16a4 4 0 0 1 1-7.9A5 5 0 0 1 14.5 7 4.5 4.5 0 0 1 19 16H4Z M8 19v2 M12 19v2 M16 19v2',
  spark: 'M12 2v6 M12 16v6 M2 12h6 M16 12h6 M5 5l4 4 M15 15l4 4 M5 19l4-4 M15 9l4-4',
  pyro: 'M12 2 5 20h14L12 2Z M12 9v6 M9 20 12 14 15 20',
  smoke: 'M6 20c-2 0-3-1.5-3-3s1.5-3 3-2c0-2 2-3 4-2 1-2 4-2 5 0 2-.5 4 1 3 3 2 0 3 2 1.5 3.5C18 20 6 20 6 20Z',
  fog: 'M3 9h18 M3 13h18 M3 17h14',
  confetti: 'M5 19 12 5 19 19 M9 19v-6 M15 19v-6 M12 5v6',
  undo: 'M9 7 4 12l5 5 M4 12h11a5 5 0 0 1 0 10h-2',
  redo: 'M15 7l5 5-5 5 M20 12H9a5 5 0 0 0 0 10h2',
  play: 'M6 4l14 8-14 8V4Z',
  stop: 'M5 5h14v14H5z',
  save: 'M5 4h11l3 3v13H5V4Z M8 4v6h8V4 M8 15h8',
  'folder-open': 'M3 7h5l2 2h11v10H3V7Z',
  'file-plus': 'M6 3h8l4 4v14H6V3Z M12 10v6 M9 13h6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6 6l1.5 1.5 M16.5 16.5 18 18 M18 6l-1.5 1.5 M7.5 16.5 6 18',
  download: 'M12 3v12 M7 10l5 5 5-5 M5 19h14',
  'view-2d': 'M4 5h16v14H4z M4 12h16',
  'view-3d': 'M12 3 4 7v10l8 4 8-4V7l-8-4Z M4 7l8 4 8-4 M12 11v10',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3 M4 11h16v10H4z',
  unlock: 'M6 11V8a6 6 0 0 1 11-3.6 M4 11h16v10H4z',
  group: 'M4 4h7v7H4z M13 13h7v7h-7z M13 4h7v7h-7z M4 13h7v7H4z',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  duplicate: 'M8 8h11v11H8z M5 5h11v3H8v8H5z',
  'align-left': 'M4 4v16 M8 7h12 M8 12h8 M8 17h12',
  'align-center-x': 'M12 4v16 M6 7h12 M8 12h8 M6 17h12',
  'align-right': 'M20 4v16 M8 7H4 M12 12H4 M8 17H4',
  'distribute-h': 'M4 4v16 M20 4v16 M9 9h2v6H9z M15 6h0 M13 9h2v6h-2z',
  'distribute-v': 'M4 4h16 M4 20h16 M9 9h6v2H9z M9 13h6v2H9z',
  ruler: 'M3 15 15 3l6 6L9 21 3 15Z M7 11l2 2 M11 7l2 2 M15 3l2 2',
  cursor: 'M5 3l6 16 2-6 6-2z',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  grid: 'M4 4h16v16H4z M4 10h16 M4 16h16 M10 4v16 M16 4v16',
  music: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  cue: 'M12 2v20 M12 2 5 9h14L12 2Z',
  keyboard: 'M3 6h18v12H3z M6 10h0 M9 10h0 M12 10h0 M15 10h0 M18 10h0 M6 14h12',
  record: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M8.5 8 20 20 M20 4 8.5 16',
  dancer: 'M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M12 6v6 M12 12 7 16 M12 12l5 4 M12 12 8 22 M12 12l4 10',
  instrument: 'M7 3v10a3 3 0 1 0 2 2.8V7h6V3H7Z',
  platform: 'M3 16h18v5H3z M5 16 8 6h8l3 10',
  hand: 'M8 13V6a1.5 1.5 0 0 1 3 0v5 M11 11V4a1.5 1.5 0 0 1 3 0v7 M14 11.5V6a1.5 1.5 0 0 1 3 0v8 M17 12v2a1.5 1.5 0 0 1 3 0v3a6 6 0 0 1-6 6h-2a7 7 0 0 1-6-3.5L4 15c-.6-1 .2-2.3 1.4-2 .5.1 1 .5 1.3 1l1.3 2',
  'record-clip': 'M4 6h13l3 3v9H4z M8 10v6l6-3z',
  playlist: 'M4 6h12 M4 12h12 M4 18h8 M18 13v6 M15.5 16 21 16',
  'shape-open': 'M12 21V10 M12 10 4 4 M12 10 20 4 M12 10 3 12 M12 10 21 12',
  'shape-cone': 'M12 20 4 4 M12 20 20 4',
  'shape-inverted-cone': 'M12 4 4 20 M12 4 20 20',
  'auto-render': 'M4 3h16v12H4z M9 7v4l5-2z M6 19h12 M9 22h6',
  'drag-handle': 'M9 6h0 M15 6h0 M9 12h0 M15 12h0 M9 18h0 M15 18h0',
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
