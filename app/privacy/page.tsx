export const metadata = {
  title: 'Política de Privacidad — Content Dashboard Eternity',
  description: 'Cómo recopilamos, usamos y protegemos tus datos en Content Dashboard Eternity.',
}

const CONTACT_EMAIL = 'juampiacosta158@gmail.com'
const APP_NAME = 'Content Dashboard Eternity'
const LAST_UPDATED = '13 de mayo de 2026'

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen py-16 px-6"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Política de Privacidad
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {APP_NAME} · Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Quiénes somos">
          <p>
            {APP_NAME} es una plataforma de analítica y gestión de contenido para creadores
            digitales. Permite conectar cuentas de redes sociales (Instagram, YouTube, TikTok)
            para visualizar métricas y analizar rendimiento. El responsable del tratamiento de
            datos es el operador de la plataforma, contactable en{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p>Cuando usas {APP_NAME} recopilamos:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Datos de cuenta:</strong> nombre, dirección de correo electrónico y foto de
              perfil proporcionados al registrarte.
            </li>
            <li>
              <strong>Datos de Instagram (vía Meta Graph API):</strong> nombre de usuario,
              foto de perfil, número de seguidores, publicaciones, métricas de reels
              (reproducciones, me gusta, comentarios, alcance, impresiones, guardados,
              compartidos). Solo se accede con tu autorización explícita.
            </li>
            <li>
              <strong>Datos de YouTube (vía Google OAuth):</strong> nombre del canal, miniaturas,
              estadísticas de vídeos y suscriptores.
            </li>
            <li>
              <strong>Datos de uso:</strong> interacciones con la plataforma (navegación,
              consultas de IA) para mejorar el servicio.
            </li>
            <li>
              <strong>Datos técnicos:</strong> dirección IP, tipo de navegador, para seguridad
              y control de abuso.
            </li>
          </ul>
        </Section>

        <Section title="3. Cómo usamos los datos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Mostrar dashboards de analítica en tu espacio de trabajo.</li>
            <li>Generar análisis y sugerencias mediante inteligencia artificial.</li>
            <li>Sincronizar métricas de tus cuentas conectadas.</li>
            <li>Garantizar la seguridad y prevenir el abuso de la plataforma.</li>
            <li>Enviarte notificaciones del servicio cuando sea necesario.</li>
          </ul>
          <p className="mt-3">
            No vendemos ni compartimos tus datos con terceros con fines publicitarios.
          </p>
        </Section>

        <Section title="4. Uso de la API de Meta (Instagram)">
          <p>
            {APP_NAME} utiliza la API de Instagram Graph para acceder a métricas de tu cuenta
            de Instagram Business vinculada a una Página de Facebook. Los permisos solicitados
            son:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
                instagram_basic
              </code>{' '}
              — acceso de lectura al perfil y publicaciones.
            </li>
            <li>
              <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
                instagram_manage_insights
              </code>{' '}
              — lectura de métricas de alcance, impresiones, reproducciones y guardados.
            </li>
            <li>
              <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
                pages_show_list
              </code>{' '}
              — listar las Páginas de Facebook para localizar la cuenta de Instagram Business
              vinculada.
            </li>
          </ul>
          <p className="mt-3">
            Los tokens de acceso se almacenan de forma cifrada y se usan exclusivamente para
            obtener tus métricas. Puedes revocar el acceso en cualquier momento desde{' '}
            <a
              href="https://www.facebook.com/settings?tab=business_tools"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              Configuración de Meta → Apps y sitios web
            </a>
            .
          </p>
        </Section>

        <Section title="5. Retención de datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Si solicitas la eliminación,
            borraremos todos tus datos en un plazo máximo de 30 días, salvo obligación legal de
            conservarlos.
          </p>
        </Section>

        <Section title="6. Tus derechos">
          <p>Tienes derecho a:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Acceder a los datos que tenemos sobre ti.</li>
            <li>Rectificar datos inexactos.</li>
            <li>Solicitar la eliminación de tus datos (ver sección 7).</li>
            <li>Portar tus datos a otro servicio.</li>
            <li>Oponerte al tratamiento en cualquier momento.</li>
          </ul>
          <p className="mt-3">
            Para ejercer cualquiera de estos derechos, escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="7. Eliminación de datos" id="data-deletion">
          <p>
            Puedes solicitar la eliminación completa de tu cuenta y todos los datos asociados
            de dos formas:
          </p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>
              <strong>Desde la plataforma:</strong> inicia sesión, ve a Configuración y usa la
              opción &ldquo;Eliminar cuenta&rdquo;. Todos tus datos se borrarán en 30 días.
            </li>
            <li>
              <strong>Por correo:</strong> envía un email a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
                {CONTACT_EMAIL}
              </a>{' '}
              con el asunto &ldquo;Solicitud de eliminación de datos&rdquo; desde la dirección
              asociada a tu cuenta.
            </li>
          </ol>
          <p className="mt-3">
            Si conectaste Instagram a través de Meta, también puedes revocar el acceso
            directamente en{' '}
            <a
              href="https://www.facebook.com/settings?tab=business_tools"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              Configuración de Meta → Apps y sitios web
            </a>
            . Esto desconecta la app y dejaremos de acceder a tus datos de Instagram.
          </p>
        </Section>

        <Section title="8. Cookies y almacenamiento">
          <p>
            Usamos cookies de sesión estrictamente necesarias para autenticación (Supabase Auth).
            No usamos cookies de seguimiento ni publicidad de terceros.
          </p>
        </Section>

        <Section title="9. Seguridad">
          <p>
            Los datos se almacenan en bases de datos cifradas en reposo (Supabase / PostgreSQL
            en infraestructura de AWS). El tráfico va cifrado en tránsito (HTTPS). Los tokens
            de OAuth se guardan cifrados y nunca se exponen en el cliente.
          </p>
        </Section>

        <Section title="10. Cambios a esta política">
          <p>
            Notificaremos cualquier cambio significativo por correo electrónico o mediante un
            aviso en la plataforma con al menos 15 días de antelación.
          </p>
        </Section>

        <Section title="11. Contacto">
          <p>
            Para cualquier consulta sobre privacidad o protección de datos, escríbenos a{' '}
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

function Section({
  title,
  id,
  children,
}: {
  title: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--muted-foreground)' }}>
        {children}
      </div>
    </section>
  )
}
