'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Kanban, CalendarDays, CalendarClock, FileText, Wand2, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

const PipelineBoard   = dynamic(() => import('@/components/pipeline/PipelineBoard').then((m) => m.PipelineBoard),   { ssr: false })
const CalendarioTab   = dynamic(() => import('@/components/calendario/CalendarioTab').then((m) => m.CalendarioTab), { ssr: false })
const GuionesSection  = dynamic(() => import('./GuionesSection').then((m) => m.GuionesSection),                     { ssr: false })
const CopyGenerator   = dynamic(() => import('@/components/copy/CopyGenerator').then((m) => m.CopyGenerator),       { ssr: false })
const KanbanBoard     = dynamic(() => import('@/components/tareas/KanbanBoard').then((m) => m.KanbanBoard),         { ssr: false })

type SectionId =
  | 'pipeline'
  | 'tareas'
  | 'cal-reels'
  | 'cal-historias'
  | 'guiones-reels'
  | 'guiones-historias'
  | 'copy-ia'

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'pipeline',          label: 'Pipeline',          icon: Kanban },
  { id: 'tareas',            label: 'Tareas',            icon: CheckSquare },
  { id: 'cal-reels',         label: 'Cal. Reels',        icon: CalendarDays },
  { id: 'cal-historias',     label: 'Cal. Historias',    icon: CalendarClock },
  { id: 'guiones-reels',     label: 'Guiones Reels',     icon: FileText },
  { id: 'guiones-historias', label: 'Guiones Historias', icon: FileText },
  { id: 'copy-ia',           label: 'Copy IA',           icon: Wand2 },
]

function SectionBody({ id }: { id: SectionId }) {
  // Root wrapper already supplies px-8 py-6; section bodies just render content.
  if (id === 'pipeline') return <PipelineBoard />
  if (id === 'tareas') return <KanbanBoard />
  if (id === 'cal-reels') return <CalendarioTab type="reel" />
  if (id === 'cal-historias') return <CalendarioTab type="historia" />
  if (id === 'guiones-reels') return <GuionesSection type="reel" label="reel" />
  if (id === 'guiones-historias') return <GuionesSection type="historia" label="historia" />
  if (id === 'copy-ia') return <CopyGenerator />
  return null
}

const SECTION_IDS = new Set<SectionId>(SECTIONS.map((s) => s.id))

function parseTab(raw: string | null): SectionId {
  return raw && SECTION_IDS.has(raw as SectionId) ? (raw as SectionId) : 'pipeline'
}

export function ContenidoContent() {
  const searchParams = useSearchParams()
  const [active, setActive] = useState<SectionId>(() =>
    parseTab(searchParams?.get('tab') ?? null),
  )

  // Keep tab state in sync if the URL changes externally (e.g. /tareas redirect).
  useEffect(() => {
    const next = parseTab(searchParams?.get('tab') ?? null)
    setActive(next)
  }, [searchParams])

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Contenido"
        title="Contenido"
        description="Pipeline, calendarios, guiones y generación con IA."
        icon={Kanban}
      />
      <div>
        {/* Tab navigation — same visual pattern as Instagram TabNav */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            scrollbarWidth: 'none',
          }}
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer',
                  !isActive && 'hover:opacity-80'
                )}
                style={{
                  backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                  border: '1px solid transparent',
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Section content */}
      <div className="mt-6">
        <SectionBody id={active} />
      </div>
    </div>
  )
}
