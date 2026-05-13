export const metadata = {
  title: 'Términos de Servicio — Content Dashboard Eternity',
  description: 'Condiciones de uso de Content Dashboard Eternity.',
}

const CONTACT_EMAIL = 'juampiacosta158@gmail.com'
const APP_NAME = 'Content Dashboard Eternity'
const LAST_UPDATED = '13 de mayo de 2026'

export default function TermsPage() {
  return (
    <main
      className="min-h-screen py-16 px-6"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Términos de Servicio
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {APP_NAME} · Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Aceptación de los términos">
          <p>
            Al acceder o usar {APP_NAME} aceptás estos Términos de Servicio. Si no estás de
            acuerdo, no uses la plataforma.
          </p>
        </Section>

        <Section title="2. Descripción del servicio">
          <p>
            {APP_NAME} es una plataforma de analítica de contenido que permite a creadores
            digitales conectar sus cuentas de redes sociales, visualizar métricas y obtener
            análisis mediante inteligencia artificial. El servicio se provee &ldquo;tal
            cual&rdquo; y puede estar sujeto a cambios o interrupciones.
          </p>
        </Section>

        <Section title="3. Cuentas de usuario">
          <p>
            Sos responsable de mantener la confidencialidad de tus credenciales de acceso y de
            todas las actividades que ocurran bajo tu cuenta. Notificanos de inmediato ante
            cualquier uso no autorizado a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="4. Uso de APIs de terceros">
          <p>
            Al conectar cuentas de Instagram, YouTube o TikTok, aceptás también las condiciones
            de uso de dichas plataformas:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <a
                href="https://developers.facebook.com/terms/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                Términos de la Plataforma de Meta
              </a>
            </li>
            <li>
              <a
                href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                Términos de servicio de la API de YouTube
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/legal/page/row/terms-of-service/en"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                Términos de servicio de TikTok
              </a>
            </li>
          </ul>
          <p className="mt-3">
            Solo podés conectar cuentas de las que sos titular o tenés autorización expresa.
          </p>
        </Section>

        <Section title="5. Uso aceptable">
          <p>No podés usar {APP_NAME} para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Violar leyes aplicables o derechos de terceros.</li>
            <li>Acceder a cuentas de otras personas sin su autorización.</li>
            <li>Interferir con el funcionamiento de la plataforma.</li>
            <li>Realizar scraping masivo o sobrecargar los sistemas.</li>
            <li>Distribuir malware o contenido dañino.</li>
          </ul>
        </Section>

        <Section title="6. Propiedad intelectual">
          <p>
            {APP_NAME} y sus contenidos (interfaz, lógica, análisis generados por IA) son
            propiedad del operador. Tus datos y métricas siguen siendo tuyos. Te concedemos
            una licencia limitada para usar la plataforma con fines propios.
          </p>
        </Section>

        <Section title="7. Limitación de responsabilidad">
          <p>
            {APP_NAME} se provee sin garantías de ningún tipo. No somos responsables de
            decisiones tomadas en base a los datos o análisis de la plataforma, ni de
            interrupciones causadas por terceros (Meta, Google, TikTok, proveedores de
            infraestructura).
          </p>
        </Section>

        <Section title="8. Modificaciones al servicio">
          <p>
            Podemos modificar o discontinuar cualquier parte del servicio con un aviso previo
            razonable. Cambios materiales a estos términos serán notificados por correo con al
            menos 15 días de antelación.
          </p>
        </Section>

        <Section title="9. Cancelación">
          <p>
            Podés cancelar tu cuenta en cualquier momento. Ver la{' '}
            <a href="/privacy#data-deletion" style={{ color: 'var(--accent)' }}>
              Política de Privacidad — sección Eliminación de datos
            </a>{' '}
            para los pasos de borrado de información.
          </p>
        </Section>

        <Section title="10. Ley aplicable">
          <p>
            Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa
            se resolverá en los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
          </p>
        </Section>

        <Section title="11. Contacto">
          <p>
            Para consultas sobre estos términos, escribinos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--muted-foreground)' }}>
        {children}
      </div>
    </section>
  )
}
