import Link from 'next/link'

/**
 * Shared 404-style page used when we don't want to leak the existence
 * of a protected route (e.g. /admin for non-SUPER_ADMIN users).
 */
export function NotFoundShell() {
  return (
    <div
      className="flex min-h-[calc(100vh-64px)] items-center justify-center p-8"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div
        className="max-w-md text-center rounded-2xl p-8"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="text-5xl font-bold mb-2"
          style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}
        >
          404
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          Página no encontrada
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
          La ruta que buscas no existe o no está disponible.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
