/**
 * Discovery cuestionario for the product owner. 9 blocks · 40 questions.
 * Stored verbatim in `TaskForm.blocks` (JSON) by the seed script so the
 * structure is auditable in the DB and the UI just renders what it loads.
 *
 * Question ids are stable strings (`q1` … `q40`). Answers keyed by these ids.
 */

export interface DiscoveryQuestion {
  id: string
  number: number
  text: string
}

export interface DiscoveryBlock {
  id: string
  number: number
  title: string
  questions: DiscoveryQuestion[]
}

export const DISCOVERY_TITLE = 'Discovery Eternity — Cuestionario estratégico'
export const DISCOVERY_DESCRIPTION =
  'Respondé con honestidad. Lo que pongas acá define cómo se construye el producto los próximos meses. Si no sabés algo todavía, escribí "no lo definí" — eso también es información valiosa. Si preferís responder algo verbalmente, marcalo con "hablamos verbalmente".'

export const DISCOVERY_BLOCKS: DiscoveryBlock[] = [
  {
    id: 'vision',
    number: 1,
    title: 'Visión del producto',
    questions: [
      { id: 'q1', number: 1, text: 'En 1-2 frases: ¿qué es Eternity y para quién es?' },
      { id: 'q2', number: 2, text: '¿Por qué decidiste construir este producto? ¿Qué problema viste en el mercado que nadie estaba resolviendo bien?' },
      { id: 'q3', number: 3, text: 'Si Eternity funciona como soñás, ¿cómo se ve en 2 años? (volumen de clientes, revenue, posicionamiento)' },
      { id: 'q4', number: 4, text: '¿Hay otros productos en el mercado que hacen algo parecido? Si sí, ¿cuáles? ¿Qué hacen ellos que vos NO querés hacer?' },
      { id: 'q5', number: 5, text: '¿Por qué creés que Eternity puede ganar contra esos competidores?' },
    ],
  },
  {
    id: 'icp',
    number: 2,
    title: 'Cliente ideal (ICP)',
    questions: [
      { id: 'q6', number: 6, text: '¿Quién es el cliente ideal de Eternity? Sé específico: tipo de negocio, tamaño, industria, momento del negocio. No "creators" genérico — describime una persona real.' },
      { id: 'q7', number: 7, text: '¿Cuántos clientes ideales hay en LATAM aproximadamente? Si no sabés, estimá. Si no te animás a estimar, decime por qué.' },
      { id: 'q8', number: 8, text: '¿Cómo encuentran ese tipo de clientes a Eternity? (marketing, referidos, ventas directas, anuncios, contenido)' },
      { id: 'q9', number: 9, text: '¿Hay un "cliente que NO querés"? Describime quién no entra al producto aunque pague.' },
    ],
  },
  {
    id: 'negocio',
    number: 3,
    title: 'Modelo de negocio',
    questions: [
      { id: 'q10', number: 10, text: '¿Cómo va a cobrar Eternity? (suscripción mensual, anual, por proyecto, freemium, pay-as-you-go)' },
      { id: 'q11', number: 11, text: '¿Pensaste pricing? Si sí, ¿cuáles son los tiers tentativos? Si no, ¿cuándo lo querés definir?' },
      { id: 'q12', number: 12, text: '¿Cuánto debería gastar un cliente promedio al mes?' },
      { id: 'q13', number: 13, text: '¿Tenés idea de cuánto te cuesta operacionalmente cada cliente? (API costs de Claude, Groq, Apify, hosting, soporte)' },
      { id: 'q14', number: 14, text: '¿Hay funcionalidades premium que pensás cobrar aparte?' },
    ],
  },
  {
    id: 'govbidder',
    number: 4,
    title: 'Relación con GovBidder',
    questions: [
      { id: 'q15', number: 15, text: '¿Eternity y GovBidder van a tener relación comercial? (mismas oficinas, mismos clientes, mismo equipo, marcas separadas)' },
      { id: 'q16', number: 16, text: '¿Querés que los clientes de Eternity sepan que tenés relación con GovBidder? ¿O las marcas son completamente independientes?' },
      { id: 'q17', number: 17, text: 'Si Santo y vos algún día se separan profesionalmente, ¿qué pasa con Eternity? ¿Es 100% tuyo?' },
      { id: 'q18', number: 18, text: '¿Hay algo del modelo de negocio de Eternity que es información confidencial entre Santo y vos?' },
    ],
  },
  {
    id: 'features',
    number: 5,
    title: 'Features y roadmap',
    questions: [
      { id: 'q19', number: 19, text: 'De las features ya construidas, ¿cuáles son TUS favoritas, las que más valor entregan al cliente? (análisis de competidores, AI chat, transcripción, etc.)' },
      { id: 'q20', number: 20, text: '¿Cuáles son las features que decís "esto es lindo pero no es lo que vende el producto"?' },
      { id: 'q21', number: 21, text: '¿Qué features faltan que vos sí o sí querés antes de empezar a vender?' },
      { id: 'q22', number: 22, text: 'Si pudieras quedarte con SOLO UNA feature (todas las demás desaparecen), ¿cuál sería?' },
      { id: 'q23', number: 23, text: '¿Hay alguna feature que pensaste y después abandonaste? ¿Por qué?' },
    ],
  },
  {
    id: 'ventas',
    number: 6,
    title: 'Ventas y marketing',
    questions: [
      { id: 'q24', number: 24, text: '¿Quién va a vender Eternity? ¿Vos? ¿Vas a tener vendedores? ¿Self-service?' },
      { id: 'q25', number: 25, text: '¿Cómo planeás que el primer cliente conozca el producto? (marketing, contenido, referido, llamada en frío, otra cosa)' },
      { id: 'q26', number: 26, text: '¿Tenés idea de qué decir cuando alguien te pregunta "¿por qué debería pagarte y no usar [competidor]?" Si sí, ¿cuál sería tu respuesta?' },
      { id: 'q27', number: 27, text: '¿Hay alguna conversación con un potencial cliente que ya tuviste? Si sí, ¿qué te dijo que te marcó?' },
    ],
  },
  {
    id: 'operativa',
    number: 7,
    title: 'Operativa y equipo',
    questions: [
      { id: 'q28', number: 28, text: '¿Quiénes van a operar Eternity una vez lance? Vos solo, equipo, contratistas, freelancers.' },
      { id: 'q29', number: 29, text: '¿Cuánto tiempo a la semana podés dedicarle vos a Eternity?' },
      { id: 'q30', number: 30, text: '¿Hay alguien técnico además de mí que va a tocar el código? Si la respuesta es "ahora mismo no, pero sí en el futuro", decime cuándo aproximadamente.' },
      { id: 'q31', number: 31, text: '¿Qué responsabilidades técnicas esperás que cubra YO específicamente? (mantenimiento, features nuevas, arquitectura, deploy, soporte de bugs, seguridad — listá lo que va y lo que no)' },
    ],
  },
  {
    id: 'tecnico',
    number: 8,
    title: 'Temas técnicos que necesito alinear',
    questions: [
      { id: 'q32', number: 32, text: '¿Eternity va a ser self-service (el cliente se da de alta solo) o asistido (vos o yo creamos cada cuenta)?' },
      { id: 'q33', number: 33, text: '¿Cómo imaginás que un cliente nuevo se da de alta? Walk me through: paso 1, paso 2, paso 3…' },
      { id: 'q34', number: 34, text: '¿Querés que cada cliente tenga su propio "espacio" de data 100% aislado del de los demás? ¿O hay info que se comparte entre clientes? (ej: análisis públicos de competidores)' },
      { id: 'q35', number: 35, text: '¿Pensaste algo sobre integración con Stripe / MercadoPago para cobrar? ¿O eso lo decidís más adelante?' },
      { id: 'q36', number: 36, text: '¿Cuántos clientes esperás manejar el primer año? ¿Los primeros 3 meses? (esto cambia decisiones de arquitectura críticas)' },
    ],
  },
  {
    id: 'pendientes',
    number: 9,
    title: 'Decisiones pendientes',
    questions: [
      { id: 'q37', number: 37, text: '¿Hay alguna decisión sobre Eternity que tenés posponiendo porque no terminás de definirla? Decime cuál y por qué.' },
      { id: 'q38', number: 38, text: '¿Hay algún miedo o duda sobre el producto que no le contaste a nadie? (no tenés que decirme cuál, solo si existe)' },
      { id: 'q39', number: 39, text: 'Si te pidiera priorizar las próximas 5 cosas a hacer en Eternity, ¿cuáles serían?' },
      { id: 'q40', number: 40, text: '¿Cualquier cosa importante que sientas que tengo que saber y no pregunté?' },
    ],
  },
]

export const ALL_QUESTION_IDS: ReadonlySet<string> = new Set(
  DISCOVERY_BLOCKS.flatMap((b) => b.questions.map((q) => q.id)),
)
