# Metrics baseline — Content Dashboard 2.O

Documento de referencia para medir **calidad de performance y accesibilidad** del dashboard en producción. Sirve como punto de comparación para detectar regresiones tras merges a `main`.

- **Fecha del baseline**: 2026-04-22
- **Versión del app**: commit `74354a330af1d999aa034acdf8a9898af8b2f4b0` (main HEAD)
- **URL medida**: `https://content-dashboard-seven-omega.vercel.app`
- **Fuente de targets**: `audit/Plan definitivo.md` (sección "Acceptance numérica")
- **Optimizaciones activas** (verificado en `next.config.ts`): `output: 'standalone'`, `next/image` con `remotePatterns`, CSP estricta, headers de seguridad (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy). Tailwind v4 JIT. Fonts self-hosted vía `next/font`.

---

## 1. Targets acordados (del Plan Definitivo)

| Métrica | Mín. aceptable | Target ideal | Dónde medir |
|---|---|---|---|
| Lighthouse Performance mobile (simulated Fast 3G, Moto G Power) | 75 | 85 | `/` |
| Lighthouse Accessibility | 85 | 92 | `/` |
| Lighthouse Best Practices | 90 | 95 | `/` |
| Lighthouse SEO | 90 | 95 | `/` |
| LCP (Largest Contentful Paint) — Chrome DevTools Fast 3G | 3.0 s | 2.5 s | `/` |
| CLS (Cumulative Layout Shift) | 0.1 | 0.05 | todas |
| TBT (Total Blocking Time) | 300 ms | 200 ms | `/` |
| FCP (First Contentful Paint) | 2.0 s | 1.8 s | `/` |

> **Nota**: los targets son para mobile simulado (peor caso). Desktop suele superarlos con holgura y sirve como sanity check rápido.

---

## 2. Cómo correr el baseline (CLI)

Requisitos: Node 18+ y Chrome instalado local. No se necesita ningún setup adicional — `npx lighthouse` descarga la CLI bajo demanda.

### 2.1 Ejecutar sobre una ruta

```bash
# Lighthouse desktop (rápido, sanity check)
npx lighthouse https://content-dashboard-seven-omega.vercel.app \
  --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --output html --output-path ./lighthouse-home-desktop.html

# Lighthouse mobile (target primario — el número que reportamos al cliente)
npx lighthouse https://content-dashboard-seven-omega.vercel.app \
  --only-categories=performance,accessibility,best-practices,seo \
  --output html --output-path ./lighthouse-home-mobile.html \
  --form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4
```

### 2.2 Rutas priorizadas (5 críticas de las 17 activas)

Ejecutar ambos comandos (desktop + mobile) para cada una:

| # | Ruta | Por qué prioritaria |
|---|---|---|
| 1 | `/` | Home — primera impresión, target principal del Plan Definitivo |
| 2 | `/contenido` | Editor TipTap + listas — peor caso de bundle JS |
| 3 | `/instagram` | Dashboard con charts (Recharts) — peor caso de CLS |
| 4 | `/youtube` | Dashboard con charts + llamada a API real — peor caso de LCP |
| 5 | `/admin/users` | Tabla administrativa con modales — peor caso de TBT |

Rutas no priorizadas (`/ads`, `/tiktok`, `/ai`, `/analizador`, `/bases`, `/competidores`, `/tareas`, `/login`, `/pending-approval`, `/admin`, `/admin/clients`, `/competidores/[username]`) pueden medirse en ciclos posteriores.

### 2.3 Consideraciones

- **Auth**: las rutas internas (`/instagram`, `/youtube`, `/admin/*`, `/contenido`, etc.) requieren sesión Supabase. Para el baseline se recomienda medir **la redirección a `/login`** O, alternativamente, pasar `--extra-headers='{"Cookie":"sb-access-token=...; sb-refresh-token=..."}'` con cookies de un usuario de prueba. Si se opta por la primera, documentar claramente que los números aplican a `/login`, no a la ruta protegida.
- **Preview vs prod**: medir SIEMPRE sobre la URL de producción. Los preview deploys de Vercel tienen cold starts más agresivos y falsean números.
- **Runs múltiples**: correr 3 veces y reportar la mediana. Lighthouse tiene varianza alta en un solo run.

---

## 3. Resultados baseline — pendiente de ejecución

Plantilla que el cliente completa al correr los comandos de la sección 2. Reemplazar `TBD` con el número medido.

### 3.1 Mobile (target primario)

| Ruta | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|---|---|---|
| `/` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/contenido` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/instagram` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/youtube` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/admin/users` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

### 3.2 Desktop (sanity check)

| Ruta | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|---|---|---|
| `/` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/contenido` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/instagram` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/youtube` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/admin/users` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

> **Unidades**: Perf/A11y/BP/SEO = score 0–100. LCP/FCP en segundos. CLS adimensional. TBT en milisegundos.

---

## 4. Contrast ratio de brand tokens (calculado)

Los dos tokens de marca (`docs/BRAND.md`) son `--accent: #8E1F2F` y `--accent-foreground: #F5EDE3`. Se aplican juntos en CTAs primarios (`bg-accent text-accent-foreground`), por lo que su contraste debe cumplir WCAG.

### 4.1 Fórmula (WCAG 2.1)

Para cada color:
1. Convertir cada canal RGB de 8-bit a sRGB normalizado (`c/255`).
2. Aplicar gamma correction:
   - si `c ≤ 0.03928` → `c_lin = c / 12.92`
   - si no → `c_lin = ((c + 0.055) / 1.055) ^ 2.4`
3. Calcular luminancia relativa: `L = 0.2126·R + 0.7152·G + 0.0722·B`

Finalmente `contrast = (L_claro + 0.05) / (L_oscuro + 0.05)`.

### 4.2 Cálculo paso a paso

**`#8E1F2F`** (accent, rojo oscuro) → R=142, G=31, B=47

| Canal | c (normalizado) | c_lin |
|---|---|---|
| R | 0.556863 | ((0.556863+0.055)/1.055)^2.4 = 0.270511 |
| G | 0.121569 | ((0.121569+0.055)/1.055)^2.4 = 0.013653 |
| B | 0.184314 | ((0.184314+0.055)/1.055)^2.4 = 0.028426 |

L₁ = 0.2126·0.270511 + 0.7152·0.013653 + 0.0722·0.028426 = **0.069360**

**`#F5EDE3`** (accent-foreground, cream) → R=245, G=237, B=227

| Canal | c (normalizado) | c_lin |
|---|---|---|
| R | 0.960784 | ((0.960784+0.055)/1.055)^2.4 = 0.913099 |
| G | 0.929412 | ((0.929412+0.055)/1.055)^2.4 = 0.846873 |
| B | 0.890196 | ((0.890196+0.055)/1.055)^2.4 = 0.768358 |

L₂ = 0.2126·0.913099 + 0.7152·0.846873 + 0.0722·0.768358 = **0.855269**

### 4.3 Resultado

```
contrast = (0.855269 + 0.05) / (0.069360 + 0.05)
         = 0.905269 / 0.119360
         = 7.5844:1
```

| Nivel WCAG | Requisito (texto normal) | ¿Pasa? |
|---|---|---|
| AA | ≥ 4.5:1 | PASS |
| AAA | ≥ 7.0:1 | PASS |
| AA (texto grande ≥18pt) | ≥ 3.0:1 | PASS |

**Conclusión**: el par `#8E1F2F` sobre `#F5EDE3` cumple AAA por un margen pequeño (0.58 puntos). Cualquier cambio futuro del token `--accent` (p.ej. aclarar el rojo) debe recalcular este ratio antes de mergear para no caer por debajo de AA.

---

## 5. Checklist a11y manual (sin herramientas)

Ejecutar sobre las 5 rutas priorizadas. Marcar casilla solo si pasa en las 5.

### 5.1 Navegación por teclado (TAB sin mouse)

- [ ] Se puede llegar al user menu desde el logo en ≤5 tabs
- [ ] Cada foco es visible — outline o ring (se confirma en `app/globals.css`: `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`)
- [ ] ESC cierra modales (Settings, ClientSwitcher dropdown)
- [ ] Enter/Space activa buttons (no solo click)
- [ ] El orden de tabulación es lógico (topbar → sidebar → contenido → user menu)
- [ ] No hay "focus traps" que atrapen al usuario fuera de un modal abierto

### 5.2 Screen reader (VoiceOver macOS / NVDA Windows)

- [ ] Cada página tiene un `<h1>` que describe el contenido
- [ ] Imágenes importantes tienen `alt`; decorativas tienen `alt=""`
- [ ] Los botones icono tienen `aria-label` (p.ej. cerrar modal, toggle theme)
- [ ] El estado "active" en sidebar se anuncia vía `aria-current="page"`, no solo color
- [ ] Los modales tienen `role="dialog"` y `aria-modal="true"`
- [ ] Los inputs tienen `<label>` asociado o `aria-label`

### 5.3 Zoom 200%

- [ ] Layout no se rompe
- [ ] No hay scroll horizontal forzado
- [ ] Texto no se solapa
- [ ] Los botones siguen siendo clickeables (hit area ≥44×44 px)

### 5.4 Contraste visual

- [ ] Modo oscuro (toggle en topbar) no introduce contrastes <4.5:1
- [ ] Modo claro idem
- [ ] Estados `disabled` son discernibles pero claramente "desactivados" (no confundibles con `enabled`)
- [ ] Error states (rojo `--destructive: #A63A4B`) legibles sobre background
- [ ] Links se distinguen del texto por más que color (underline o peso)

### 5.5 Movimiento y sensibilidad

- [ ] `prefers-reduced-motion` se respeta (animaciones se reducen o desactivan)
- [ ] No hay contenido que parpadee >3 veces por segundo
- [ ] Autoplay de videos/gifs desactivable

---

## 6. Regresiones comunes a vigilar

Lista de causas típicas de caída de scores Lighthouse tras cambios:

| Síntoma | Causa probable | Cómo detectar |
|---|---|---|
| Cae CLS | Imágenes nuevas sin `width`/`height` | `grep -rn "<img" app components` — buscar sin dims |
| Cae TBT | Librería pesada nueva en bundle client | `npm run build` y revisar size del chunk |
| Cae FCP | Fuentes sin `font-display: swap` | revisar config de `next/font` |
| Cae FCP | CSS en `<style>` inline vs link | buscar `<style>` en componentes |
| Cae Perf mobile | iframes sin `loading="lazy"` | `grep -rn "<iframe" app components` |
| Cae A11y | Botones icono nuevos sin `aria-label` | `grep -rn "Button" components` — revisar los que solo llevan `<Icon/>` |
| Cae A11y | Nuevos colores hardcoded con bajo contraste | `npm run check:brand` debería detectarlo; si no, recalcular ratios |
| Cae BP | Console errors en prod | abrir DevTools en la ruta, revisar Console |
| Cae SEO | Página nueva sin `<title>` ni `<meta description>` | `app/[ruta]/page.tsx` debe exportar `metadata` |

---

## 7. Re-medición sugerida

- **Cadencia**: cada 2 semanas, O después de cambios grandes — cualquier merge a `main` que toque `components/` o `app/` con >500 líneas.
- **Archivo histórico**: guardar los HTML de Lighthouse en `docs/metrics-baselines/YYYY-MM-DD/` (crear el dir en el primer ciclo). Un archivo HTML por ruta y form-factor, nombrado `{ruta}-{mobile|desktop}.html`.
- **Reporte**: al terminar cada ciclo, actualizar la tabla de la sección 3 con los nuevos números y anotar en la sección 8 cualquier regresión >5 puntos en cualquier categoría.

---

## 8. Histórico de mediciones

Formato: una entrada por ciclo de medición. La primera la llena el cliente al ejecutar el baseline inicial.

### 2026-04-22 — Baseline inicial (pendiente de ejecución)

- Commit: `74354a3`
- Notas: placeholder — completar tras correr los comandos de la sección 2.

<!--
### YYYY-MM-DD — Ciclo N
- Commit: <sha>
- Cambios relevantes desde el ciclo anterior: <lista>
- Regresiones detectadas: <lista o "ninguna">
- Acciones tomadas: <lista>
-->
