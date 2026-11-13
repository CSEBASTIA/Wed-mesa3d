// Iconos de trazo (24×24) dibujados a mano, sin dependencias.

const PATHS = {
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
  magnet: ['m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15', 'm5 8 4 4', 'm12 15 4 4'],
  moveV: ['M12 3v18', 'm8 7 4-4 4 4', 'm8 17 4 4 4-4'],
  cube: ['M21 8 12 3 3 8v8l9 5 9-5z', 'm3 8 9 5 9-5', 'M12 13v8'],
  front: ['M4 5h16v14H4z', 'M4 15h16'],
  top: ['M12 4 21 9l-9 5-9-5z', 'm3 14 9 5 9-5'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M2 14h4', 'M10 8h4', 'M18 16h4'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
  ruler: ['M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z', 'm14.5 12.5 2-2', 'm11.5 9.5 2-2', 'm8.5 6.5 2-2', 'm17.5 15.5 2-2'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'],
  copy: ['M8 8h12v12H8z', 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3'],
  rotate: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
  drop: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 20h16'],
  flip: ['M12 3v18', 'M8 7 3 12l5 5z', 'M16 7l5 5-5 5z'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  drawer: ['M3 4h18v16H3z', 'M3 12h18', 'M10 8h4', 'M10 16h4'],
  keyboard: ['M3 6h18v12H3z', 'M7 10h.01', 'M11 10h.01', 'M15 10h.01', 'M7 14h10'],
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['m5 12 5 5 9-10'],
  layers: ['M12 3 2 8l10 5 10-5z', 'm2 13 10 5 10-5']
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, stroke = 1.75 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Marca de la app: un escritorio en L visto desde arriba. */
export function BrandMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3h18v7h-8.5a3.5 3.5 0 0 0-3.5 3.5V21H3z" fill="currentColor" />
    </svg>
  );
}
