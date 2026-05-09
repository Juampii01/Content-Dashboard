'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BASES_SECTIONS } from './BasesTabNav'
import { ICPSection } from './sections/ICPSection'
import { ChipListSection } from './sections/ChipListSection'
import { OfertaSection } from './sections/OfertaSection'
import { InsightsSection } from './sections/InsightsSection'
import { CompetenciaSection } from './sections/CompetenciaSection'

const SECTION_META: Record<string, { title: string; description: string; placeholder: string; emptyMessage?: string }> = {
  problemas: {
    title: 'Problemas de tu audiencia',
    description: 'Situaciones externas que enfrenta tu cliente ideal.',
    placeholder: 'Ej: No consigue clientes de forma consistente',
  },
  dolores: {
    title: 'Dolores de tu audiencia',
    description: 'El impacto emocional de esos problemas — cómo los hace sentir.',
    placeholder: 'Ej: Frustración por trabajar mucho y ganar poco',
  },
  deseos: {
    title: 'Deseos de tu audiencia',
    description: 'Qué quieren lograr, conseguir o sentir.',
    placeholder: 'Ej: Tener un negocio que funcione sin su presencia constante',
  },
  keywords: {
    title: 'Keywords de tu nicho',
    description: 'Palabras clave, términos y frases que usa tu audiencia.',
    placeholder: 'Ej: marketing de contenidos',
    emptyMessage: 'Añade las palabras que tu audiencia busca o usa cuando habla de sus problemas.',
  },
}

function SectionRouter({ id }: { id: string }) {
  if (id === 'cliente-ideal') return <ICPSection />
  if (id === 'oferta')        return <OfertaSection />
  if (id === 'insights')      return <InsightsSection />
  if (id === 'competencia')   return <CompetenciaSection />

  const meta = SECTION_META[id]
  if (meta) {
    return (
      <ChipListSection
        sectionId={id}
        title={meta.title}
        description={meta.description}
        placeholder={meta.placeholder}
        emptyMessage={meta.emptyMessage}
      />
    )
  }

  return null
}

export function BasesContent() {
  const [activeId, setActiveId] = useState(BASES_SECTIONS[0].id)

  return (
    <div className="page-shell flex flex-col gap-6">
      <PageHeader
        eyebrow="Estrategia"
        title="Bases de negocio"
        description="Definí los pilares estratégicos de tu contenido — ICP, ofertas, insights, competencia."
        icon={BookOpen}
      />

      {/* Horizontal tab nav — same style as Instagram */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          scrollbarWidth: 'none',
        }}
      >
        {BASES_SECTIONS.map((section) => {
          const active = activeId === section.id
          const Icon = section.Icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveId(section.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                border: '1px solid transparent',
              }}
            >
              <Icon className="h-4 w-4" />
              {section.label}
            </button>
          )
        })}
      </div>

      {/* Section content */}
      <div>
        <SectionRouter id={activeId} />
      </div>
    </div>
  )
}
