# Guía del proyecto Operafy

Documento para **entender y defender** el proyecto en entrevistas (nivel junior / estudiante).

Objetivo: poder responder preguntas sobre el **qué**, el **por qué** y el **cómo**.  
Cuando algo es demasiado específico o de infraestructura avanzada, está marcado como trabajo apoyado con IA — y se explica el **concepto** que sí debés manejar.

Fuente de verdad de producto: `PRODUCT_BRIEF.md`.  
Resumen público + setup: `README.md`.

---

## 1. Elevator pitch (30 segundos)

> Operafy es un SaaS web para negocios de servicios chicos. Centraliza el flujo **cliente → presupuesto → trabajo → cobro**. Lo armé como portfolio junior: un workflow completo, multi-tenant con RLS en Supabase, dinero en enteros (centavos), y UI usable — sin inventar un ERP.

Si preguntan “¿qué problema resuelve?”:

> Hoy estos negocios mezclan WhatsApp, Excel y papel. Pierden datos, cotizan inconsistente y no saben qué se debe. Operafy responde: qué hay que hacer, para quién, cuánto cuesta y si está pago.

---

## 2. Por qué existe este proyecto (y por qué así)

### Intención

No es un CRUD suelto ni un clon de Salesforce. Es un **producto pequeño pero creíble**:

- workflow de negocio real
- autenticación real
- tenancy real (aislamiento entre negocios)
- dinero tratado con cuidado
- alcance terminable por una sola persona en semanas

### Filosofía de decisiones

1. **Simplicidad primero** — si dos diseños sirven, gana el más fácil de explicar.
2. **Cuidado donde duele** — auth, RLS, money, status.
3. **Terminar el loop** antes de features “impresionantes”.
4. **Código que otro junior pueda mantener** — nombres claros, carpetas por feature, pocas abstracciones.

### Qué NO construí (y por qué decirlo en entrevista)

| Fuera de alcance | Motivo |
|------------------|--------|
| Multi-org / invites / roles | El MVP es 1 dueño ↔ 1 negocio |
| Inventario / catálogo | Retrasa el loop core |
| Links públicos de aprobación | Seguridad + producto extra |
| Notificaciones / email marketing | Infra y scope |
| Charts / reportes | No hacen falta para demostrar el loop |
| Backend Node propio | Supabase alcanza para MVP |
| Redux / Zustand | TanStack Query cubre estado de servidor |

Frase útil:

> “Preferí un MVP defendible y terminado antes que un semi-ERP incompleto.”

---

## 3. Cómo se construyó (cronología mental)

Orden intencional (del brief):

1. **Fundación** — Vite/React/TS, shell, Auth, organizations, RLS base, onboarding  
2. **Customers** — CRUD + búsqueda  
3. **Quotes** — ítems, totales, estados, impresión  
4. **Work orders** — desde presupuesto o directo, estados  
5. **Payments + dashboard** — saldos y KPIs  
6. **Polish** — empty/loading/error, mobile, i18n, theme, seed, deploy, CI  

Migraciones SQL numeradas (`001` … `010`) reflejan ese crecimiento.  
`002`/`003` quedaron en `_obsolete/` porque se reemplazaron por un enfoque con RPCs más seguro (`004`).

---

## 4. Stack y por qué cada pieza

| Tecnología | Rol | Por qué |
|------------|-----|---------|
| **React** | UI | Estándar de mercado; componentes y hooks |
| **TypeScript strict** | Tipos | Menos bugs; demuestra seriedad junior |
| **Vite** | Bundler/dev server | Rápido, simple vs CRA |
| **React Router** | Rutas | Rutas de negocio (`/quotes/:id`) |
| **TanStack Query** | Cache/fetch servidor | Loading/error, invalidación post-mutación |
| **React Hook Form + Zod** | Forms + validación | Errores de campo, schema único |
| **Tailwind + shadcn/Radix** | UI | Consistencia y a11y básica sin reinventar |
| **Supabase** | Auth + Postgres + RLS | Backend real sin microservicios |
| **Vercel** | Hosting SPA | Deploy simple; `vercel.json` reescribe rutas |
| **Vitest** | Unit tests | Money + status (lo crítico) |
| **Oxlint + CI** | Calidad | Señal de profesionalismo en el repo |

### Conceptos teóricos que debés saber

- **SPA (Single Page Application):** el navegador carga una app; el router cambia vistas sin recargar todo el documento. En producción, el servidor debe devolver `index.html` para rutas profundas → por eso `vercel.json` rewrites.
- **Client vs server state:** sesión/UI local ≠ datos de Postgres. Query cachea lo del servidor.
- **BaaS (Backend as a Service):** Supabase da Auth + DB + políticas; no hace falta un API Express para el MVP.
- **Strict TypeScript:** `any` / `@ts-ignore` están prohibidos en este proyecto a propósito.

---

## 5. Arquitectura de carpetas

```text
src/
  components/     UI compartida (botones, shells, guards)
  features/       un módulo por dominio de negocio
  i18n/           EN/ES
  theme/          light/dark
  lib/            supabase, money, errors, env
  types/          tipado alineado al schema
supabase/migrations/
```

Dentro de un feature típico:

```text
features/quotes/
  pages/              pantallas
  components/         piezas de UI del dominio
  use-quotes.ts       hooks + query keys
  quote-service.ts    llamadas Supabase
  quote-schema.ts     Zod
  quote-status.ts     reglas de transición
```

### Patrón de capas (memorízalo)

```text
UI → hook (TanStack Query) → service → Supabase/Postgres
```

- **Page:** orquesta UI y estados de pantalla  
- **Hook:** `useQuery` / `useMutation`, keys estables, invalidate  
- **Service:** I/O con Supabase; sin JSX  
- **Schema / status / money:** reglas puras, testeables  

Por qué no Redux: el estado “difícil” es remoto; Query ya lo resuelve. Context se usa para auth, locale y theme (poco y estable).

---

## 6. Modelo de datos (relaciones)

Entidades principales:

```text
auth.users
   └── profiles (1:1) ──organization_id──► organizations (owner_id = user)
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
               customers                   quotes                  work_orders
                                              │                         │
                                         quote_line_items            payments
                                              │                         │
                                              └──── quote_id (opcional)─┘
```

Ideas clave:

- Casi todo negocio lleva **`organization_id`**.
- Un quote tiene **line items**.
- Un work order puede nacer de un quote aceptado **o** crearse directo con `billable_amount`.
- Un payment apunta a customer + work order; se permiten **pagos parciales**.
- Balance: `billable_total - sum(payments)` (helpers en `src/lib/money.ts`).

### Conceptos de DB

- **PK / FK:** integridad referencial (no quotes huérfanos sin customer, etc.).
- **Timestamps:** `created_at` / `updated_at` (trigger `set_updated_at`).
- **Constraints / checks:** moneda de 3 letras, montos enteros, etc.
- **Índices:** búsquedas por `organization_id`, unicidad `owner_id` (1 org por dueño).
- **Migraciones:** cambios de schema versionados en SQL, aplicados en orden.

---

## 7. Multi-tenancy y seguridad (pregunta frecuente)

### Qué es multi-tenant

Varios negocios (tenants) en la misma base, **aislados**. Org A no puede leer/escribir datos de org B.

### Cómo lo hacemos

1. Columna `organization_id` en tablas de negocio.  
2. **RLS (Row Level Security)** en Postgres: políticas que filtran filas según el usuario autenticado (`auth.uid()`), vía su `profiles.organization_id`.  
3. El frontend también filtra por org (UX + claridad), pero **no es la defensa real**.  
4. Escrituras delicadas pasan por **RPCs `security definer`** que validan pertenencia y reglas.

Hardening relevante (`006`):

- No se puede cambiar `profiles.organization_id` desde el cliente (trigger + GUC `operafy.allow_profile_org_update` solo dentro del RPC de onboarding).
- Algunas tablas quedan SELECT vía RLS y escrituras solo por funciones.
- Numeración de quotes más segura bajo concurrencia.
- No borrar customer si aún tiene quotes.

### Conceptos teóricos

- **AuthN vs AuthZ:** autenticación = quién sos; autorización = qué podés hacer.  
- **RLS:** autorización a nivel fila en la DB.  
- **Least privilege:** el browser solo tiene la **anon key**; la **service role** nunca va al frontend.  
- **Defense in depth:** validación Zod + constraints DB + RLS + RPCs.  
- **Nunca confiar en params de URL** para autorización (el `organizationId` del client no es “prueba” de acceso).

Frase de entrevista:

> “El aislamiento real está en Postgres con RLS. Si solo filtrara en React, cualquier usuario podría pegarle a la API y ver otra org.”

---

## 8. Autenticación y rutas

### Flujo

1. Sign up / login con **Supabase Auth** (email/password).  
2. Trigger `handle_new_user` crea un **profile** vacío.  
3. Si no hay org → **onboarding** crea la organization (RPC) y enlaza el profile.  
4. `AuthProvider` mantiene la sesión; escucha `onAuthStateChange`.  
5. Guards:
   - `ProtectedRoute` — requiere user; manda a onboarding si falta org  
   - `PublicOnlyRoute` — login/signup no accesibles si ya hay sesión  
   - `/reset-password` está fuera de `PublicOnlyRoute` (sesión de recovery)

### Conceptos

- **Session / JWT:** el client de Supabase persiste sesión y refresca tokens.  
- **Password recovery:** flujo built-in de Supabase + redirect URL configurada.  
- **Route guards:** capas de UX; la seguridad de datos sigue siendo RLS.

---

## 9. Dinero (tema de credibilidad)

### Regla de oro

**Nunca usar floats para dinero de negocio.**

- UI puede mostrar `$205.50`  
- DB y lógica usan **minor units enteros:** `20550`  
- Helpers centralizados: `toMinorUnits`, `calculateQuoteTotals`, `calculatePaymentBalance`

Por qué: `0.1 + 0.2 !== 0.3` en IEEE-754. En plata eso es un bug de producto.

### Cálculo de quote

```text
line_total = round(qty * unit_price_minor)
subtotal   = sum(line_totals)
total      = subtotal - discount + tax
```

Validaciones: al menos una línea, montos enteros ≥ 0, discount no puede pasarse de subtotal+tax.

### Pagos

```text
balance = billable - sum(payments)
```

`billable` viene del total del quote vinculado, o de `work_orders.billable_amount` si no hay quote.

Hay tests en `src/lib/money.test.ts`.

---

## 10. Máquinas de estado (status)

Estados explícitos + **transiciones permitidas** en funciones puras (no hardcodeadas en botones sueltos).

### Quotes

`draft → sent → accepted | rejected`  
Desde draft también se puede rechazar.  
`accepted` / `rejected` son terminales. Solo `draft` es editable.

### Work orders

Camino principal: `pending → scheduled → in_progress → completed`  
Cancelación desde estados no completados.  
Algunos atajos (ej. pending → in_progress) para usabilidad real.

Concepto: **finite state machine** simple (mapa de adyacencia). Evita absurdos como `completed → draft`.

Tests: `quote-status.test.ts`, `work-order-status.test.ts`.

---

## 11. Forms, validación y UX baseline

- **Zod** define el shape; **React Hook Form** lo conecta a inputs.  
- Errores por campo, botón disabled en submit, texto “Saving…”.  
- Cada pantalla importante maneja: **loading / empty / success / error**.  
- Empty states sugieren la siguiente acción.  
- Acciones destructivas → `ConfirmDialog`.  
- Mobile usable para listas y cambios de estado (no solo desktop encogido).

Accesibilidad: HTML semántico, labels, foco visible; Radix ayuda. No es un proyecto de certificación WCAG.

---

## 12. i18n y theme

- Locale propio (`en` / `es`) con catálogos tipados (`MessageKey`) — sin arrastrar i18next.  
- Theme light/dark con preference en `localStorage`.  
- Decisión: features de producto visibles en portfolio, sin librerías pesadas.

Concepto: **i18n** = separar copy de código; interpolación simple `{name}`.

---

## 13. Data fetching con TanStack Query

Patrón típico:

- `queryKey` estable: `['customers', orgId, search]`  
- `enabled` cuando hay org  
- tras `create/update/delete` → `invalidateQueries` de listas/detalle relacionados  

Defaults en `App.tsx`: `staleTime` 30s, poco retry, sin refetch agresivo al focus (MVP más predecible).

Conceptos:

- **Cache / stale / invalidate**  
- **Mutation vs query**  
- No reinventar un cache casero.

---

## 14. Quotes print / PDF

MVP: página print-friendly + `window.print` (CSS), no un motor PDF pesado.

Incluye negocio, cliente, número, ítems y totales. Suficiente para demo profesional.

---

## 15. Dashboard

KPIs simples (sin charts):

- presupuestos pendientes  
- trabajos activos  
- saldo outstanding  
- trabajos de hoy  

Muchas tarjetas navegan a listas filtradas. Hay guía onboarding dismissible en localStorage.

---

## 16. Seed / demo data

Migration `010` + botón en Settings cargan datos `[Demo]` (idempotente si ya existen).  
Sirve para walkthroughs de entrevista/demo sin cargar todo a mano. Ver `supabase/SEED.md`.

---

## 17. Deploy y CI

- **Vercel:** build Vite; rewrite `/(.*) → /index.html` para deep links.  
- Env: solo `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.  
- **GitHub Actions:** typecheck, lint, test, build en push/PR a `main`.

Concepto: variables `VITE_*` se embeben en el bundle del client → solo datos públicos.

---

## 18. Testing: qué y por qué

Prioridad (del brief):

1. Totales de quote  
2. Balances de pago  
3. Transiciones de status  

No se persigue % de coverage. Un junior debe poder decir:

> “Testeo la lógica de negocio que, si falla, rompe confianza: plata y estados.”

---

## 19. Decisiones difíciles (y trade-offs)

| Decisión | Alternativa descartada | Trade-off |
|----------|------------------------|-----------|
| Supabase + RLS | API Node + middleware | Menos código servidor; SQL/RLS más “opaco” al principio |
| 1 user ↔ 1 org | Multi-member | Simple y suficiente para MVP |
| Minor units | Decimals / float | Más verboso en UI; correcto en negocio |
| Feature folders | Capas globales (`services/`, `hooks/` gigantes) | Algo de duplicación; mejor locality |
| Print CSS | jsPDF / Puppeteer | Menos deps; menos control tipográfico |
| i18n casero | i18next | Menos features; 100% entendible |
| RPCs security definer | Solo policies INSERT/UPDATE | Más SQL; escrituras más controladas |
| Query Client defaults calmados | Refetch siempre | Menos “magia”; datos un poco más stale |

---

## 20. Qué entendés vos vs qué apoyaste con IA

Sé honesto en entrevistas. Esta sección es la guía.

### Debés poder explicar solo (concepto + dónde vive)

- Problema de producto y alcance MVP  
- Flujo cliente → quote → job → payment  
- Por qué money en enteros  
- Qué es RLS / multi-tenant a alto nivel  
- Patrón UI → hook → service → DB  
- Por qué TanStack Query y Zod  
- Status machines y por qué no cualquier transición  
- Diferencia anon key vs service role  
- Cómo se hace setup local y el demo path  

### Razonable decir “lo armé con ayuda de IA / revisé y ajusté”

- SQL largo de migraciones (policies, triggers, RPCs concurrent-safe)  
- Tipado grande de `database.ts` alineado a tablas/RPCs  
- Detalles de shadcn/CVA/Tailwind tokens  
- Edge cases de recovery session en reset-password  
- Hardening fino del GUC `operafy.allow_profile_org_update`  
- CI YAML / rewrites de Vercel una vez entendido el “por qué”  

Frase profesional:

> “Usé la IA como acelerador en SQL y boilerplate, pero las reglas de negocio (dinero, estados, tenancy) las definí y puedo explicarlas. Revisé el código y los tests de lo crítico.”

Evitar: fingir que escribiste de memoria cada policy. Preferible: demostrar que sabés **qué problema resuelve** cada pieza.

---

## 21. Preguntas típicas de entrevista (con respuestas cortas)

**¿Por qué no usaste un backend propio?**  
> Para un MVP junior, Auth + Postgres + RLS en Supabase cubre el caso. Evité microservicios que no suman al portfolio.

**¿Cómo evitás que un usuario vea datos de otro?**  
> Cada fila tiene `organization_id` y RLS compara con el profile del `auth.uid()`. El front filtra, pero la garantía es la DB.

**¿Dónde calculás los totales del presupuesto?**  
> En `src/lib/money.ts`, con enteros. La UI no inventa la fórmula. Hay tests unitarios.

**¿Qué pasa si alguien manda un status inválido?**  
> Helpers de transición rechazan el cambio. Idealmente la DB también restringe; la lógica de dominio está centralizada.

**¿Cómo manejás pagos parciales?**  
> Varios payments por work order; el balance es billable menos la suma. Se puede editar un payment.

**¿Por qué TypeScript strict?**  
> Reduce errores tontos y muestra disciplina. Prohibimos `any` y `@ts-ignore`.

**¿Cómo organizás el código?**  
> Por feature. Cada feature tiene pages, hooks, service y schemas. Shared UI aparte.

**¿Qué mejorarías con más tiempo?**  
> Respuestas honestas y acotadas: pagination real server-side más robusta, más constraints DB en statuses, generar types desde Supabase CLI, tests de integración RLS documentados, etc. — **sin abrir el scope del brief**.

**¿Qué fue lo más difícil?**  
> Elegí una: tenancy/RLS, o money consistency, o el flujo quote→work order sin romper invariantes. Contá el trade-off.

**¿Es production-ready?**  
> “Es un MVP de portfolio production-minded: auth, RLS, money y deploy reales. No es un producto con equipo, compliance ni billing.” Honestidad suma.

---

## 22. Mapa rápido de archivos “si te preguntan por X”

| Tema | Mirar |
|------|--------|
| Rutas / providers | `src/App.tsx` |
| Guards | `src/components/routing/route-guards.tsx` |
| Auth session | `src/features/auth/auth-provider.tsx` |
| Cliente Supabase | `src/lib/supabase.ts`, `src/lib/env.ts` |
| Money | `src/lib/money.ts` + tests |
| Quote status | `src/features/quotes/quote-status.ts` |
| Work order status | `src/features/work-orders/work-order-status.ts` |
| Customers I/O | `src/features/customers/customer-service.ts` |
| Org onboarding | migrations `001` + `006`, feature organizations |
| Pagos / seed | migration `010`, `payment-service.ts` |
| i18n | `src/i18n/*` |
| CI | `.github/workflows/ci.yml` |
| Producto | `PRODUCT_BRIEF.md` |

---

## 23. Glosario junior (conceptos que pueden aparecer)

- **CRUD** — Create, Read, Update, Delete  
- **ORM vs query builder / client** — acá usamos el client de Supabase (PostgREST), no Prisma  
- **RPC** — función en la DB invocable desde el client  
- **Security definer** — la función corre con privilegios del dueño; hay que validar `auth.uid()` adentro  
- **Idempotente** — correr dos veces no duplica efecto (seed demo)  
- **Optimistic UI** — no es el default fuerte de este MVP; invalidación post-mutación es más simple  
- **XSS / injection** — React escapa texto; en `ilike` sanitizamos caracteres especiales de patrón  
- **CORS** — el browser habla con Supabase bajo sus reglas; no es tu API custom  
- **SSR vs CSR** — Operafy es CSR (Vite SPA)  
- **Environment variables** — secretos de servidor ≠ claves públicas del client  

---

## 24. Checklist pre-entrevista

- [ ] Contar el pitch en < 45s  
- [ ] Dibujar el flujo de entidades en un papel  
- [ ] Explicar minor units con un ejemplo  
- [ ] Explicar RLS sin mirar código  
- [ ] Abrir `money.ts` y un `*-status.ts` y narrarlos  
- [ ] Hacer el demo path (o seed) una vez en vivo  
- [ ] Decir con honestidad qué hizo la IA y qué decidiste vos  
- [ ] Nombrar 2 cosas fuera de scope y por qué  

---

## 25. Cierre

Operafy se juzga por esto:

1. Workflow de negocio coherente  
2. Tenancy real  
3. Money correcto  
4. Código legible  
5. Alcance honesto  

Si te traban con un detalle hiperespecífico de una policy SQL, volvé al concepto:

> “Esa policy refuerza que solo tu organización vea sus filas; la escribí / la generé con asistencia, la revisé, y el principio es RLS + `organization_id`.”

Eso es una respuesta de junior sólido.
