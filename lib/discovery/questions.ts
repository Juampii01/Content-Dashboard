/**
 * Discovery questionnaire structure — shared by /discovery (form) and
 * /admin/discovery (admin viewer). Keep the keys (q1..q40) stable: they
 * map 1-to-1 to columns on the DiscoveryResponse table.
 */

export interface Question {
  id: string
  label: string
  helper?: string
}

export interface Section {
  number: number
  title: string
  questions: Question[]
}

export const SECTIONS: Section[] = [
  {
    number: 1,
    title: 'Visión del producto',
    questions: [
      { id: 'q1', label: 'En 1-2 frases: ¿qué es Eternity y para quién es?' },
      {
        id: 'q2',
        label:
          '¿Por qué decidiste construir este producto? ¿Qué problema viste en el mercado que nadie estaba resolviendo bien?',
      },
      {
        id: 'q3',
        label: 'Si Eternity funciona como soñás, ¿cómo se ve en 2 años?',
        helper: 'Volumen de clientes, revenue, posicionamiento.',
      },
      {
        id: 'q4',
        label:
          '¿Hay otros productos en el mercado que hacen algo parecido? Si sí, ¿cuáles? ¿Qué hacen ellos que vos NO querés hacer?',
      },
      { id: 'q5', label: '¿Por qué creés que Eternity puede ganar contra esos competidores?' },
    ],
  },
  {
    number: 2,
    title: 'Cliente ideal (ICP)',
    questions: [
      {
        id: 'q6',
        label: '¿Quién es el cliente ideal de Eternity?',
        helper:
          'Sé específico: tipo de negocio, tamaño, industria, momento del negocio. No "creators" genérico — describime una persona real.',
      },
      {
        id: 'q7',
        label: '¿Cuántos clientes ideales hay en LATAM aproximadamente?',
        helper: 'Si no sabés, estimá. Si no te animás a estimar, decime por qué.',
      },
      {
        id: 'q8',
        label: '¿Cómo encuentran ese tipo de clientes a Eternity?',
        helper: 'Marketing, referidos, ventas directas, anuncios, contenido.',
      },
      {
        id: 'q9',
        label:
          '¿Hay un "cliente que NO querés"? Describime quién no entra al producto aunque pague.',
      },
    ],
  },
  {
    number: 3,
    title: 'Modelo de negocio',
    questions: [
      {
        id: 'q10',
        label: '¿Cómo va a cobrar Eternity?',
        helper: 'Suscripción mensual, anual, por proyecto, freemium, pay-as-you-go.',
      },
      {
        id: 'q11',
        label:
          '¿Pensaste pricing? Si sí, ¿cuáles son los tiers tentativos? Si no, ¿cuándo lo querés definir?',
      },
      { id: 'q12', label: '¿Cuánto debería gastar un cliente promedio al mes?' },
      {
        id: 'q13',
        label: '¿Tenés idea de cuánto te cuesta operacionalmente cada cliente?',
        helper: 'API costs de Claude, Groq, Apify, hosting, soporte.',
      },
      { id: 'q14', label: '¿Hay funcionalidades premium que pensás cobrar aparte?' },
    ],
  },
  {
    number: 4,
    title: 'Relación con GovBidder',
    questions: [
      {
        id: 'q15',
        label: '¿Eternity y GovBidder van a tener relación comercial?',
        helper: 'Mismas oficinas, mismos clientes, mismo equipo, marcas separadas.',
      },
      {
        id: 'q16',
        label:
          '¿Querés que los clientes de Eternity sepan que tenés relación con GovBidder? ¿O las marcas son completamente independientes?',
      },
      {
        id: 'q17',
        label:
          'Si Santo y vos algún día se separan profesionalmente, ¿qué pasa con Eternity? ¿Es 100% tuyo?',
      },
      {
        id: 'q18',
        label:
          '¿Hay algo del modelo de negocio de Eternity que es información confidencial entre Santo y vos?',
      },
    ],
  },
  {
    number: 5,
    title: 'Features y roadmap',
    questions: [
      {
        id: 'q19',
        label:
          'De las features ya construidas, ¿cuáles son TUS favoritas, las que más valor entregan al cliente?',
        helper: 'Análisis de competidores, AI chat, transcripción, etc.',
      },
      {
        id: 'q20',
        label:
          '¿Cuáles son las features que decís "esto es lindo pero no es lo que vende el producto"?',
      },
      { id: 'q21', label: '¿Qué features faltan que vos sí o sí querés antes de empezar a vender?' },
      {
        id: 'q22',
        label:
          'Si pudieras quedarte con SOLO UNA feature (todas las demás desaparecen), ¿cuál sería?',
      },
      { id: 'q23', label: '¿Hay alguna feature que pensaste y después abandonaste? ¿Por qué?' },
    ],
  },
  {
    number: 6,
    title: 'Ventas y marketing',
    questions: [
      {
        id: 'q24',
        label: '¿Quién va a vender Eternity? ¿Vos? ¿Vas a tener vendedores? ¿Self-service?',
      },
      {
        id: 'q25',
        label: '¿Cómo planeás que el primer cliente conozca el producto?',
        helper: 'Marketing, contenido, referido, llamada en frío, otra cosa.',
      },
      {
        id: 'q26',
        label:
          '¿Tenés idea de qué decir cuando alguien te pregunta "¿por qué debería pagarte y no usar [competidor]?" Si sí, ¿cuál sería tu respuesta?',
      },
      {
        id: 'q27',
        label:
          '¿Hay alguna conversación con un potencial cliente que ya tuviste? Si sí, ¿qué te dijo que te marcó?',
      },
    ],
  },
  {
    number: 7,
    title: 'Operativa y equipo',
    questions: [
      {
        id: 'q28',
        label:
          '¿Quiénes van a operar Eternity una vez lance? Vos solo, equipo, contratistas, freelancers.',
      },
      { id: 'q29', label: '¿Cuánto tiempo a la semana podés dedicarle vos a Eternity?' },
      {
        id: 'q30',
        label: '¿Hay alguien técnico además de mí que va a tocar el código?',
        helper:
          'Si la respuesta es "ahora mismo no, pero sí en el futuro", decime cuándo aproximadamente.',
      },
      {
        id: 'q31',
        label: '¿Qué responsabilidades técnicas esperás que cubra YO específicamente?',
        helper:
          'Mantenimiento, features nuevas, arquitectura, deploy, soporte de bugs, seguridad — listá lo que va y lo que no.',
      },
    ],
  },
  {
    number: 8,
    title: 'Temas técnicos',
    questions: [
      {
        id: 'q32',
        label:
          '¿Eternity va a ser self-service (el cliente se da de alta solo) o asistido (vos o yo creamos cada cuenta)?',
      },
      {
        id: 'q33',
        label: '¿Cómo imaginás que un cliente nuevo se da de alta? Walk me through: paso 1, paso 2, paso 3…',
      },
      {
        id: 'q34',
        label:
          '¿Querés que cada cliente tenga su propio "espacio" de data 100% aislado del de los demás? ¿O hay info que se comparte entre clientes?',
        helper: 'Ej: análisis públicos de competidores.',
      },
      {
        id: 'q35',
        label:
          '¿Pensaste algo sobre integración con Stripe / MercadoPago para cobrar? ¿O eso lo decidís más adelante?',
      },
      {
        id: 'q36',
        label: '¿Cuántos clientes esperás manejar el primer año? ¿Los primeros 3 meses?',
        helper: 'Esto cambia decisiones de arquitectura críticas.',
      },
    ],
  },
  {
    number: 9,
    title: 'Decisiones pendientes',
    questions: [
      {
        id: 'q37',
        label:
          '¿Hay alguna decisión sobre Eternity que tenés posponiendo porque no terminás de definirla? Decime cuál y por qué.',
      },
      {
        id: 'q38',
        label: '¿Hay algún miedo o duda sobre el producto que no le contaste a nadie?',
        helper: 'No tenés que decirme cuál, solo si existe.',
      },
      {
        id: 'q39',
        label:
          'Si te pidiera priorizar las próximas 5 cosas a hacer en Eternity, ¿cuáles serían?',
      },
      { id: 'q40', label: '¿Cualquier cosa importante que sientas que tengo que saber y no pregunté?' },
    ],
  },
]

export const ALL_QUESTION_IDS: string[] = SECTIONS.flatMap((s) => s.questions.map((q) => q.id))
