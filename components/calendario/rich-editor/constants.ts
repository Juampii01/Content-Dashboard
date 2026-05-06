// ── Slash menu options ────────────────────────────────────────────────────────
export const SLASH_ITEMS = [
  { id: 'paragraph',   label: 'Texto',            shortcut: '',    icon: 'T'  },
  { id: 'h1',          label: 'Encabezado 1',      shortcut: '#',   icon: 'H1' },
  { id: 'h2',          label: 'Encabezado 2',      shortcut: '##',  icon: 'H2' },
  { id: 'h3',          label: 'Encabezado 3',      shortcut: '###', icon: 'H3' },
  { id: 'bulletList',  label: 'Lista con viñetas', shortcut: '-',   icon: '•'  },
  { id: 'orderedList', label: 'Lista numerada',    shortcut: '1.',  icon: '1.' },
  { id: 'taskList',    label: 'Lista de tareas',   shortcut: '[]',  icon: '☑' },
  { id: 'details',     label: 'Desplegable',       shortcut: '>',   icon: '▶' },
  { id: 'table',       label: 'Tabla',             shortcut: '',    icon: '⊞' },
  { id: 'blockquote',  label: 'Cita',              shortcut: '"',   icon: '❝' },
  { id: 'hr',          label: 'Divisor',           shortcut: '---', icon: '—' },
] as const

export type SlashItemId = (typeof SLASH_ITEMS)[number]['id']
export type MenuState = { x: number; y: number; query: string; from: number } | null

// ── Column menu color palettes ──────────────────────────────────────────────
export const TEXT_COLORS = [
  { label: 'Predeterminado', value: '',         dot: 'var(--foreground)'  },
  { label: 'Gris',           value: '#9B9A97',  dot: '#9B9A97'            },
  { label: 'Marrón',         value: '#64473A',  dot: '#64473A'            },
  { label: 'Naranja',        value: '#D9730D',  dot: '#D9730D'            },
  { label: 'Amarillo',       value: '#DFAB01',  dot: '#DFAB01'            },
  { label: 'Verde',          value: '#0F7B6C',  dot: '#0F7B6C'            },
  { label: 'Azul',           value: '#0B6E99',  dot: '#0B6E99'            },
  { label: 'Morado',         value: '#6940A5',  dot: '#6940A5'            },
  { label: 'Rosa',           value: '#AD1A72',  dot: '#AD1A72'            },
  { label: 'Rojo',           value: '#E03E3E',  dot: '#E03E3E'            },
]

export const BG_COLORS = [
  { label: 'Predeterminado', value: '',         dot: 'transparent',       border: 'var(--border)' },
  { label: 'Gris',           value: '#F1F1EF',  dot: '#F1F1EF',           border: '#ddd' },
  { label: 'Marrón',         value: '#F9EDE6',  dot: '#F9EDE6',           border: '#e5cfc5' },
  { label: 'Naranja',        value: '#FAECDD',  dot: '#FAECDD',           border: '#e8d5c0' },
  { label: 'Amarillo',       value: '#FBF3DB',  dot: '#FBF3DB',           border: '#e8dec2' },
  { label: 'Verde',          value: '#EDF3EC',  dot: '#EDF3EC',           border: '#c9dcc8' },
  { label: 'Azul',           value: '#E7F3F8',  dot: '#E7F3F8',           border: '#c4d9e8' },
  { label: 'Morado',         value: '#F6F0FC',  dot: '#F6F0FC',           border: '#d9c8f0' },
  { label: 'Rosa',           value: '#FAF0F5',  dot: '#FAF0F5',           border: '#e8c9d9' },
  { label: 'Rojo',           value: '#FBE4E4',  dot: '#FBE4E4',           border: '#e8c8c8' },
]
