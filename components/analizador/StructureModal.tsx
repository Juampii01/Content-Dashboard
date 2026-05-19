'use client'

import { X } from 'lucide-react'

export interface GuionStructure {
  hook: string
  hookType: string
  desarrollo: string[]
  cta: string
  ctaType: string
  patron: string
  tono: string
  duracion_estimada: string
  insights: string
}

interface StructureModalProps {
  title: string
  structure: GuionStructure
  onClose: () => void
}

const HOOK_TYPE_LABELS: Record<string, string> = {
  pregunta: 'Pregunta', dato_impactante: 'Dato impactante', historia: 'Historia',
  controversia: 'Controversia', promesa: 'Promesa', otro: 'Otro',
}
const CTA_TYPE_LABELS: Record<string, string> = {
  seguir: 'Seguir', comentar: 'Comentar', guardar: 'Guardar',
  compartir: 'Compartir', link_bio: 'Link en bio', ninguno: 'Sin CTA',
}
const TONO_COLORS: Record<string, string> = {
  educativo: '#5B8DEF', entretenimiento: '#F59E0B', inspiracional: '#10B981',
  controversial: '#E05252', personal: '#B08A4A', profesional: '#8B5CF6',
}

function Chip({ label, color }: { label: string; color?: string }) {
  const c = color ?? 'var(--accent)'
  return (
    <span className="inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: c + '22', color: c }}>
      {label}
    </span>
  )
}

export function StructureModal({ title, structure, onClose }: StructureModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <div>
            <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--muted-foreground)' }}>Estructura del guión</p>
            <h2 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--foreground)' }}>{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70 flex-shrink-0">
            <X size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Hook */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Hook</span>
              <Chip label={HOOK_TYPE_LABELS[structure.hookType] ?? structure.hookType} color="var(--accent)" />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{structure.hook}</p>
          </div>

          {/* Desarrollo */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#B08A4A' }}>Desarrollo</p>
            <ul className="space-y-1.5">
              {structure.desarrollo.map((punto, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--foreground)' }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ backgroundColor: '#B08A4A22', color: '#B08A4A' }}>
                    {i + 1}
                  </span>
                  {punto}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#10B981' }}>CTA</span>
              <Chip label={CTA_TYPE_LABELS[structure.ctaType] ?? structure.ctaType} color="#10B981" />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{structure.cta || '—'}</p>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Chip label={`Patrón: ${structure.patron}`} color="#5B8DEF" />
            <Chip label={structure.tono} color={TONO_COLORS[structure.tono] ?? 'var(--accent)'} />
            <Chip label={structure.duracion_estimada} color="#6B7280" />
          </div>

          {/* Insights */}
          {structure.insights && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>✦ Insight de Eternity</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{structure.insights}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
