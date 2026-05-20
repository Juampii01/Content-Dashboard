export const metadata = {
  title: 'Política de Privacidad — Eternity Connect',
  description: 'Política de privacidad de Eternity Connect',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Política de Privacidad</h1>
      <p><strong>Última actualización:</strong> mayo 2025</p>

      <h2>1. Información que recopilamos</h2>
      <p>
        Eternity Connect accede a los datos de tu cuenta de Instagram a través de la API oficial
        de Meta, únicamente cuando vos lo autorizás de forma explícita. Los datos que podemos
        recopilar incluyen:
      </p>
      <ul>
        <li>Información básica del perfil (nombre de usuario, foto de perfil, biografía)</li>
        <li>Métricas de publicaciones y reels (vistas, likes, comentarios, alcance)</li>
        <li>Estadísticas de la cuenta (seguidores, seguidos)</li>
        <li>Contenido multimedia publicado en tu cuenta</li>
      </ul>

      <h2>2. Cómo usamos la información</h2>
      <p>
        Los datos recopilados se utilizan exclusivamente para mostrarte análisis y métricas dentro
        del dashboard de Eternity Connect. No vendemos, compartimos ni transferimos tu información
        a terceros.
      </p>

      <h2>3. Almacenamiento de datos</h2>
      <p>
        Los datos se almacenan de forma segura en nuestra base de datos. Podés solicitar la
        eliminación de tus datos en cualquier momento enviando un correo a{' '}
        <a href="mailto:juampiacosta158@gmail.com">juampiacosta158@gmail.com</a>.
      </p>

      <h2>4. Permisos de Instagram / Meta</h2>
      <p>
        Solicitamos únicamente los permisos necesarios para el funcionamiento del servicio:
      </p>
      <ul>
        <li><code>instagram_basic</code> — acceso básico al perfil y publicaciones</li>
        <li><code>instagram_manage_insights</code> — acceso a métricas e insights</li>
        <li><code>pages_show_list</code> — listar páginas de Facebook vinculadas</li>
      </ul>
      <p>
        Podés revocar estos permisos en cualquier momento desde la configuración de tu cuenta de
        Instagram o Facebook.
      </p>

      <h2>5. Retención de datos</h2>
      <p>
        Conservamos tus datos mientras tengas una cuenta activa en nuestro servicio. Al desconectar
        tu cuenta de Instagram o solicitar la eliminación, tus datos son borrados de nuestros
        servidores en un plazo máximo de 30 días.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Para consultas sobre privacidad, escribinos a{' '}
        <a href="mailto:juampiacosta158@gmail.com">juampiacosta158@gmail.com</a>.
      </p>
    </main>
  )
}
