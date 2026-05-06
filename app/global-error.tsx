'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error(error)
  }, [error])

  return (
    <html lang="es">
      <head>
        <title>Algo salió muy mal</title>
        <style>{`
          body { margin: 0; background: #0a0a0a; color: #ededed; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { text-align: center; padding: 2rem; max-width: 400px; }
          h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem; }
          p { font-size: 0.875rem; color: #a1a1a1; margin: 0 0 1.5rem; }
          button { background: #ededed; color: #0a0a0a; border: none; border-radius: 6px; padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
          button:hover { background: #d4d4d4; }
          .digest { font-size: 0.7rem; color: #555; margin-top: 1rem; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <h1>Algo salió muy mal</h1>
          <p>Ocurrió un error inesperado. Recarga la página para continuar.</p>
          <button onClick={() => unstable_retry()}>Recargar</button>
          {error.digest && <p className="digest">{error.digest}</p>}
        </div>
      </body>
    </html>
  )
}
