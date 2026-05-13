import { redirect } from 'next/navigation'

/**
 * /video-feed → /instagram?tab=top30d
 *
 * VideoFeed (ranking de los últimos 30 días) ahora vive como tab dentro
 * de /instagram para evitar duplicación con el módulo de Instagram.
 * Esta ruta queda como redirect para no romper bookmarks ni links pegados.
 */
export default function VideoFeedRedirect() {
  redirect('/instagram?tab=top30d')
}
