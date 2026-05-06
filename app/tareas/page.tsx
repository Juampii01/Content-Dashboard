import type { Metadata } from 'next'
import { KanbanBoard } from '@/components/tareas/KanbanBoard'

export const metadata: Metadata = {
  title: 'Tareas | Eternity Dashboard',
  description: 'Organiza tu flujo de trabajo de contenido con el tablero Kanban',
}

export default function TareasPage() {
  return (
    <main className="flex-1 p-6 min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <KanbanBoard />
    </main>
  )
}
