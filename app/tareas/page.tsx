import { redirect } from 'next/navigation'

/**
 * /tareas → /contenido?tab=tareas
 *
 * El Kanban ahora vive como tab dentro de /contenido para evitar
 * duplicación de surface en el sidebar. Esta ruta queda como redirect
 * para no romper bookmarks ni links pegados.
 */
export default function TareasRedirect() {
  redirect('/contenido?tab=tareas')
}
