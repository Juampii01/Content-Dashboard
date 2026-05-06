'use client'

import { useState, useEffect } from 'react'
import { Wand2, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { CopyTypeSelector, CopyType } from './CopyTypeSelector'
import { CopyResultList } from './CopyResultList'
import { getICPContext, getICPSummary } from '@/lib/utils/getICPContext'
import type { ContentCategory } from '@/lib/types'

const CATEGORIAS: { id: ContentCategory; label: string }[] = [
  { id: 'motivacional', label: 'Motivacional' },
  { id: 'educacional',  label: 'Educacional' },
  { id: 'humor',        label: 'Humor' },
  { id: 'personal',     label: 'Personal' },
  { id: 'otro',         label: 'Otro' },
]

const TONOS = ['Directo', 'Inspiracional', 'Educativo', 'Entretenimiento']
const CANTIDADES = [3, 5, 10]

export function CopyGenerator() {
  const [type, setType]         = useState<CopyType>('reels-virales')
  const [categoria, setCategoria] = useState<ContentCategory>('educacional')
  const [tono, setTono]         = useState('Directo')
  const [cantidad, setCantidad] = useState(5)
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState<string[]>([])
  const [error, setError]       = useState('')

  const [icpSummary, setIcpSummary] = useState<{
    filled: boolean; nombre?: string; rol?: string; doloresCount: number; deseosCount: number
  }>({ filled: false, doloresCount: 0, deseosCount: 0 })

  useEffect(() => {
    getICPSummary().then(setIcpSummary).catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setError('')
    setResults([])

    // Gather ICP context from API
    const icpContext = (await getICPContext().catch(() => null)) ?? ''

    try {
      const res = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, categoria, tono, cantidad, icpContext }),
      })

      if (!res.ok) {
        if (res.status === 429) throw new Error('Has alcanzado el límite de generaciones. Espera un momento e intenta de nuevo.')
        if (res.status >= 500) throw new Error('Algo salió mal en el servidor. Intenta de nuevo en unos segundos.')
        throw new Error(`Error inesperado (${res.status}). Intenta de nuevo.`)
      }

      const data = await res.json()
      if (data.items && Array.isArray(data.items)) {
        setResults(data.items)
      } else {
        throw new Error('Respuesta inesperada del servidor')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* ICP context badge */}
      {icpSummary.filled ? (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: '#B08A4A11', border: '1px solid #B08A4A33' }}
        >
          <span className="text-sm" style={{ color: '#B08A4A' }}>✓</span>
          <div className="flex-1 text-xs" style={{ color: '#B08A4A' }}>
            <span className="font-semibold">ICP cargado</span>
            {icpSummary.nombre && <span> · {icpSummary.nombre}</span>}
            {icpSummary.rol && <span> · {icpSummary.rol}</span>}
            {icpSummary.doloresCount > 0 && <span> · {icpSummary.doloresCount} dolores</span>}
            {icpSummary.deseosCount > 0 && <span> · {icpSummary.deseosCount} deseos</span>}
          </div>
        </div>
      ) : (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: '#8E1F2F15', border: '1px solid #8E1F2F44' }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--accent)', marginTop: 2 }} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>
              Tu ICP está vacío
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Los copies serán genéricos. Define tu cliente ideal para resultados específicos.
            </p>
          </div>
          <Link
            href="/bases"
            className="flex items-center gap-1 text-xs font-medium flex-shrink-0 hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            Completar <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Type selector */}
      <div>
        <p className="text-base font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          ¿Qué quieres crear hoy?
        </p>
        <CopyTypeSelector value={type} onChange={setType} />
      </div>

      {/* Config row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Categoría */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--muted-foreground)' }}>
            Categoría
          </p>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as ContentCategory)}
            className="w-full text-xs px-2.5 py-2 rounded-lg outline-none"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Tono */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--muted-foreground)' }}>
            Tono
          </p>
          <select
            value={tono}
            onChange={(e) => setTono(e.target.value)}
            className="w-full text-xs px-2.5 py-2 rounded-lg outline-none"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {TONOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Cantidad */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--muted-foreground)' }}>
            Cantidad
          </p>
          <div className="flex gap-1">
            {CANTIDADES.map((n) => (
              <button
                key={n}
                onClick={() => setCantidad(n)}
                className="flex-1 text-xs py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: cantidad === n ? 'var(--accent)' : 'var(--muted)',
                  color: cantidad === n ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                  border: `1px solid ${cantidad === n ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <Wand2 size={15} />
            Generar {cantidad} {type === 'reels-virales' ? 'reels virales' : type === 'reels-nicho' ? 'reels de nicho' : type === 'anuncios' ? 'anuncios' : 'ideas'}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: '#8E1F2F11', border: '1px solid #8E1F2F44' }}>
          <AlertTriangle size={13} style={{ color: 'var(--accent)' }} />
          <p className="text-xs" style={{ color: 'var(--accent)' }}>{error}</p>
          <button onClick={generate} className="ml-auto" title="Reintentar">
            <RotateCcw size={12} style={{ color: 'var(--accent)' }} />
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--muted-foreground)' }}>
              Resultados — {results.length} variantes
            </p>
            <button
              onClick={generate}
              className="flex items-center gap-1 text-xs hover:opacity-80"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <RotateCcw size={11} /> Regenerar
            </button>
          </div>
          <CopyResultList items={results} />
        </div>
      )}
    </div>
  )
}
