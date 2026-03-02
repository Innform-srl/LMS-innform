# Storico Modifiche — Analisi Tecnica LMS INNFORM

## Cronologia delle Versioni

Questo documento ricostruisce l'evoluzione del file `docs/analisi-tecnica-lms-innform.md` attraverso tutte le sessioni di lavoro, dalla prima valutazione alla versione attuale.

---

## Versione 0 — Prima valutazione (18 Febbraio 2026)

**Chat**: "Valutazione e miglioramenti software LMS" ([link](https://claude.ai/chat/712d55c7-8b8c-4288-9996-4ebb1e27af57))

**Contesto**: Prima analisi completa del codebase LMS-INNFORM. È stato generato un documento Word (.docx) con copertina professionale contenente la valutazione tecnica iniziale.

### Stato del progetto al momento dell'analisi:
- **0 test** configurati (niente Jest, Vitest, Playwright)
- **0 error boundaries** (`app/error.tsx` e `app/global-error.tsx` assenti)
- **Nessun RBAC** — solo check generico `session?.user` nelle server actions
- **Nessuna CSP header** in `next.config.js`
- **Nessuna validazione** delle variabili d'ambiente all'avvio
- **Nessun caching** (no `unstable_cache`, no `revalidateTag`)
- **22 file di debug** nella root del progetto (`check-course.ts`, `debug-gemini.js`, `build_output_*.txt`, ecc.)
- **70+ script** nella cartella `scripts/`, molti di debug one-shot
- **`sanitizeDbInput` e `hasSqlInjection`** in `lib/security.ts` — ridondanti con Prisma, rischiosi
- **Template email** come stringhe HTML inline (React Email installato ma commentato)
- **Nessun error tracking** (no Sentry)
- **N+1 queries** nella pagina `admin/courses/page.tsx`
- **`framer-motion`** installato ma mai importato (~400KB di bundle inutile)
- **Endpoint `/api/seed`** accessibile in produzione senza protezione
- **Endpoint `/api/admin/reset-password`** accessibile in produzione
- **Webhook secret hardcoded** come fallback in 3 file eduplan
- **`/api/leaderboard`** senza auth check, esponeva email utenti

### Problemi identificati (documento originale .docx):

| Categoria | Criticità | Conteggio |
|-----------|-----------|-----------|
| 🔴 Sicurezza critica | RBAC, CSP, endpoint esposti, secret hardcoded | 8 |
| 🟡 Architettura | File root, duplicazione codice, error boundaries, connection pooling | 5 |
| 🟡 Performance | N+1 queries, no caching, bundle pesante, webpack polling | 4 |
| 📦 Database | Soft delete, avatar, Resource orfano, indici `updatedAt` | 4 |
| 🔧 DX | Testing, linting, documentazione API, env validation | 4 |
| 🚀 Upgrade futuri | i18n, Push, SCORM, multi-tenancy, upload, PDF, email, monitoring | 8 |

### Nella stessa chat fu anche progettato:
- **Sistema Registro d'Aula** completo (7 nuovi modelli Prisma: `ClassRegister`, `RegisterEntry`, `RegisterParticipant`, `EntryAttendance`, `RegisterInstructor`, `InstructorEntry`) per compliance formazione finanziata GOL/PNRR
- **Integrazione Google Meet API v2** per sincronizzazione automatica presenze (3 livelli: post-meeting sync, auto-sync via cron, real-time)

---

## Versione 1 — Fase 1: Quick Wins (~20-22 Febbraio 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|-----------|
| `app/error.tsx` | **CREATO** | Error boundary con UI in italiano |
| `app/global-error.tsx` | **CREATO** | Error boundary globale con stili inline |
| `next.config.js` | **MODIFICATO** | Aggiunta CSP header completa (YouTube, Vimeo, Google Drive, Supabase, Upstash) |
| `lib/security.ts` | **MODIFICATO** | Rimossi `sanitizeDbInput`, `hasSqlInjection`, check SQL da `sanitizeTextInput` |
| `app/analytics/analytics-progress-chart.tsx` | **CREATO** | Componente recharts estratto per dynamic import |
| `app/analytics/page.tsx` | **MODIFICATO** | Dynamic import per chart component |
| `.gitignore` | **MODIFICATO** | Aggiunti pattern per file di debug |
| 22 file root | **ELIMINATI** | File di debug/test rimossi dalla root |

### Impatto:
- ✅ CSP header attiva → protezione XSS
- ✅ Error boundaries → crash non esposti all'utente
- ✅ Sanitizzazione SQL ridondante rimossa → niente più corruzione dati potenziale
- ✅ Root pulita → migliore DX
- ✅ Dynamic imports → bundle iniziale ridotto

---

## Versione 2 — Fase 2: Sicurezza & Performance (~23-25 Febbraio 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|-----------|
| `lib/permissions.ts` | **CREATO** | Sistema RBAC con 25 permessi su 3 ruoli |
| `app/actions/courses.ts` | **MODIFICATO** | Migrato a `requirePermission()` + `revalidateTag` |
| `app/actions/modules.ts` | **MODIFICATO** | Migrato a `requirePermission()` |
| `app/actions/quiz.ts` | **MODIFICATO** | Migrato a `requirePermission()` |
| `lib/env.ts` | **CREATO** | Validazione 26 env vars con Zod all'avvio |
| `lib/db.ts` | **MODIFICATO** | Import `lib/env.ts` per validazione all'avvio |
| `app/admin/page.tsx` | **MODIFICATO** | `unstable_cache` per dashboard overview (60s TTL) |
| `app/admin/courses/page.tsx` | **MODIFICATO** | Query ottimizzata con `groupBy` + `Promise.all` (fix N+1) |
| `app/actions/enrollments.ts` | **MODIFICATO** | Aggiunto `revalidateTag("admin-overview")` |

### Impatto:
- ✅ RBAC su 3/20 file server actions (primi 3 critici)
- ✅ Env vars validate → app crasha subito se manca una variabile critica
- ✅ Caching dashboard → ridotto carico DB
- ✅ N+1 query fix → pagina admin courses molto più veloce

---

## Versione 3 — Fase 3: DX & Qualità (~26-28 Febbraio 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|-----------|
| `vitest.config.ts` | **CREATO** | Configurazione Vitest |
| `__tests__/permissions.test.ts` | **CREATO** | 15 test per sistema RBAC |
| `__tests__/security.test.ts` | **CREATO** | 23 test per security utilities |
| `package.json` | **MODIFICATO** | Aggiunti script `test` e `test:watch` |
| `sentry.client.config.ts` | **CREATO** | Configurazione Sentry client-side |
| `sentry.server.config.ts` | **CREATO** | Configurazione Sentry server-side |
| `sentry.edge.config.ts` | **CREATO** | Configurazione Sentry edge runtime |
| `next.config.js` | **MODIFICATO** | Wrappato con `withSentryConfig`, CSP aggiornata per Sentry |
| `app/error.tsx` | **MODIFICATO** | Aggiunto `Sentry.captureException()` |
| `lib/env.ts` | **MODIFICATO** | Aggiunte variabili `NEXT_PUBLIC_SENTRY_DSN` e `SENTRY_AUTH_TOKEN` |
| `emails/base-layout.tsx` | **CREATO** | Layout condiviso React Email |
| `emails/welcome.tsx` | **CREATO** | Template benvenuto |
| `emails/certificate-earned.tsx` | **CREATO** | Template certificato ottenuto |
| `emails/course-reminder.tsx` | **CREATO** | Template promemoria scadenza |
| `emails/course-assigned.tsx` | **CREATO** | Template assegnazione corso |
| `emails/quiz-result.tsx` | **CREATO** | Template risultato quiz |
| `lib/email.ts` | **MODIFICATO** | Migrato da HTML inline a React Email `render()` |

### Impatto:
- ✅ 38 test unitari (15 RBAC + 23 security)
- ✅ Sentry integrato → error tracking in produzione
- ✅ 6 template React Email professionali → email mantenibili e testabili
- ✅ `lib/email.ts` pulito → niente più HTML inline

---

## Versione 4 — Fase 4: Sicurezza Critica (1 Marzo 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|-----------|
| `app/api/seed/route.ts` | **MODIFICATO** | Gate production (`NODE_ENV === 'production'` → 404) |
| `app/api/admin/reset-password/route.ts` | **MODIFICATO** | Gate production |
| `app/api/leaderboard/route.ts` | **MODIFICATO** | Auth check aggiunto, email rimossa dalla query |
| `app/api/eduplan/enrollments/route.ts` | **MODIFICATO** | Webhook secret hardcoded rimosso |
| `app/api/eduplan/sessions/route.ts` | **MODIFICATO** | Webhook secret hardcoded rimosso |
| `app/api/eduplan/users/route.ts` | **MODIFICATO** | Webhook secret hardcoded rimosso |
| `lib/permissions.ts` | **MODIFICATO** | Aggiunto type narrowing per `session.user.id` |
| `package.json` | **MODIFICATO** | Rimosso `framer-motion` (~400KB risparmiati) |
| `app/actions/analytics.ts` | **MODIFICATO** | Migrato a `requirePermission("analytics:view")` |
| `app/actions/companies.ts` | **MODIFICATO** | Migrato a `requirePermission("company:manage")` |
| `app/actions/learning-paths.ts` | **MODIFICATO** | Migrato a `requirePermission("learning-path:manage")` |
| `app/actions/organizations.ts` | **MODIFICATO** | Migrato a `requirePermission("company:manage")` |
| `app/actions/users.ts` | **MODIFICATO** | Migrato a `requirePermission("user:manage")` |
| `app/actions/registers.ts` | **MODIFICATO** | Migrato a `requirePermission("register:manage")` (25 funzioni!) |
| `app/actions/attendance.ts` | **MODIFICATO** | Migrato a `requirePermission`/`requireAuth` misto |
| `app/actions/live-sessions.ts` | **MODIFICATO** | Migrato a `requirePermission`/`requireAuth` misto |
| `app/actions/enrollments.ts` | **MODIFICATO** | Migrato a `requirePermission`/`requireAuth` misto |
| `app/actions/reports.ts` | **MODIFICATO** | Migrato a `requirePermission`/`requireAuth` misto |
| `app/actions/deadlines.ts` | **MODIFICATO** | Migrato a `requirePermission("enrollment:manage")` |
| `app/actions/gamification.ts` | **MODIFICATO** | Migrato a `requireAuth()` |
| `app/actions/video-progress.ts` | **MODIFICATO** | Migrato a `requireAuth()` |
| `app/actions/quiz-attempt.ts` | **MODIFICATO** | Migrato a `requireAuth()` |
| `app/actions/ratings.ts` | **MODIFICATO** | Migrato a `requireAuth()` |
| `app/actions/live-session-registration.ts` | **MODIFICATO** | Migrato a `requireAuth()` |
| `app/actions/notifications.ts` | **MODIFICATO** | Migrato a `requireAuth()` |
| `app/actions/audit.ts` | **MODIFICATO** | `getAuditLogs` → `requirePermission("audit:view")` |

### Impatto:
- ✅ **RBAC completo: 20/20 file** server actions migrati (100% copertura)
- ✅ Endpoint critici bloccati in produzione
- ✅ Nessun webhook secret hardcoded
- ✅ Leaderboard protetto + email non esposta
- ✅ Bundle ridotto di ~400KB

---

## Versione 5 — Fase 5: Infrastruttura DX (1 Marzo 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|----------|
| `lib/env.ts` | **MODIFICATO** | Aggiunto `DIRECT_URL` per pgBouncer |
| `.env.example` | **MODIFICATO** | Documentazione connection pooling |
| `.prettierrc` | **CREATO** | Configurazione Prettier |
| `.prettierignore` | **CREATO** | File da escludere |
| `eslint.config.mjs` | **MODIFICATO** | Aggiunto `eslint-config-prettier` |
| `.husky/pre-commit` | **CREATO** | Pre-commit hook con lint-staged |
| `package.json` | **MODIFICATO** | Script `format`, `format:check`, `test:e2e`, dev port 3002 |
| `playwright.config.ts` | **CREATO** | Configurazione Playwright E2E |
| `e2e/global-setup.ts` | **CREATO** | Reset password admin per test |
| `e2e/auth.spec.ts` | **CREATO** | 4 test autenticazione |
| `e2e/courses.spec.ts` | **CREATO** | 2 test catalogo corsi |
| `e2e/admin.spec.ts` | **CREATO** | 4 test admin dashboard |

### Impatto:
- ✅ Connection pooling pgBouncer attivo
- ✅ Code quality enforcement con pre-commit hook
- ✅ 10 E2E test funzionanti
- ✅ Formatting automatico

---

## Versione 6 — Fase 6: Architettura & Soft Delete (1 Marzo 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|----------|
| `lib/enrollment-utils.ts` | **CREATO** | Utility `bulkEnrollUsers()` condivisa |
| `app/actions/courses.ts` | **MODIFICATO** | Usa `bulkEnrollUsers` |
| `app/actions/enrollments.ts` | **MODIFICATO** | Usa `bulkEnrollUsers` + `restoreEnrollment()` |
| `app/actions/users.ts` | **MODIFICATO** | Usa `bulkEnrollUsers` + `restoreUser()` |
| `prisma/schema.prisma` | **MODIFICATO** | `deletedAt` + indici su User e Enrollment |
| `prisma/migrations/20260301180000_add_soft_delete/` | **CREATO** | Migrazione SQL |
| `lib/db.ts` | **MODIFICATO** | Middleware Prisma soft delete (auto-filter, delete→update, chiavi composte) |
| `docs/api-reference.md` | **CREATO** | Documentazione completa 50 endpoint |

### Impatto:
- ✅ Soft delete trasparente su User e Enrollment
- ✅ Duplicazione codice enrollment eliminata
- ✅ 50 endpoint API documentati
- ✅ Funzioni `restore` per ripristino dati

---

## Versione 7 — Fase 7: Bug Fix & Monitoring (2 Marzo 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|----------|
| `lib/auth.ts` | **MODIFICATO** | Guard esplicito `deletedAt` nel login |
| `app/global-error.tsx` | **MODIFICATO** | Aggiunto `Sentry.captureException` |
| `app/not-found.tsx` | **CREATO** | Pagina 404 in italiano |
| `lib/db.ts` | **MODIFICATO** | Fix decomposizione chiavi composte `userId_courseId` |
| `lib/error-reporting.ts` | **CREATO** | Utility `reportError()` con tag context Sentry |
| 8 API route critiche | **MODIFICATE** | Aggiunto `reportError` (webhooks, eduplan, cron, certificates) |
| `next.config.js` | **MODIFICATO** | `remotePatterns` HTTPS + Google APIs in CSP |
| `app/courses/[courseId]/enroll/page.tsx` | **MODIFICATO** | `<img>` → `next/image` |
| `lib/email-templates-deadlines.ts` | **MODIFICATO** | Fix `NEXTAUTH_URL` → `NEXT_PUBLIC_APP_URL` |
| `lib/email-templates.ts` | **ELIMINATO** | Dead code (zero import) |

### Impatto:
- ✅ Utenti soft-deleted non possono più fare login
- ✅ Pagina 404 professionale
- ✅ Error reporting centralizzato con context Sentry
- ✅ Image optimization con next/image
- ✅ Dead code rimosso

---

## Versione 8 — Fase 8: Accessibilità, Sentry 100%, UX (2 Marzo 2026)

### Modifiche implementate:

| File | Azione | Dettaglio |
|------|--------|----------|
| 20 file `app/actions/` | **MODIFICATI** | `reportError` in tutti i catch block (85 chiamate totali) |
| `components/sidebar.tsx` | **MODIFICATO** | `<div>` → `<nav aria-label="Navigazione principale">` |
| `components/client-layout.tsx` | **MODIFICATO** | Skip-to-main-content link + `id="main-content"` |
| `app/login/page.tsx` | **MODIFICATO** | Rimosso dead link e checkbox morto, aggiunto `autocomplete` |
| `next.config.js` | **MODIFICATO** | CSP `connect-src` + `frame-src` per Google APIs |
| `app/courses/loading.tsx` | **CREATO** | Loading spinner catalogo corsi |
| `app/admin/loading.tsx` | **CREATO** | Loading spinner area admin |
| `app/layout.tsx` | **MODIFICATO** | Open Graph metadata + title template |
| `components/course-card.tsx` | **MODIFICATO** | Thumbnail `imageUrl` con `next/image` + fallback |

### Impatto:
- ✅ **100% Sentry coverage** (20 actions + 8 API = 85 chiamate `reportError`)
- ✅ Accessibilità base (nav semantica, skip link, autocomplete)
- ✅ Loading states per route principali
- ✅ Open Graph metadata per SEO/condivisione
- ✅ Dead UI rimossa dalla pagina login

---

## Riepilogo Numerico delle Modifiche

| Metrica | V0 (18 Feb) | V4 (1 Mar) | V8 (2 Mar) | Delta totale |
|---------|-------------|------------|------------|------|
| Fasi completate | 0 | 4 | **8** | +8 |
| File server actions con RBAC | 0/20 | 20/20 | 20/20 | +20 |
| Test unitari | 0 | 38 | 38 | +38 |
| Test E2E | 0 | 0 | **10** | +10 |
| Error boundaries | 0 | 2 | 2 | +2 |
| Template React Email | 0 | 6 | 6 | +6 |
| File debug in root | 22 | 0 | 0 | -22 |
| Security headers (CSP) | No | Sì | Sì (+ Google APIs) | ✅ |
| Env validation | No | 26 vars | 26+ vars | ✅ |
| Error tracking (Sentry) | No | Error boundaries | **100% coverage** (85 chiamate) | ✅✅ |
| Caching dashboard | No | 60s TTL | 60s TTL | ✅ |
| Endpoint esposti in prod | 3 | 0 | 0 | -3 |
| Webhook secret hardcoded | 3 file | 0 | 0 | -3 |
| Bundle inutile | ~400KB | 0 | 0 | -400KB |
| Modelli con soft delete | 0 | 0 | **2** | +2 |
| Code quality tools | 0 | 0 | **3** (Prettier, Husky, lint-staged) | +3 |
| API documentate | 0 | 0 | **50** | +50 |
| Accessibility features | 0 | 0 | **3** | +3 |
| Loading states | 0 | 0 | **2** | +2 |

---

## Attività Ancora Aperte (aggiornamento V8 — 2 Marzo 2026)

| Priorità | Attività | Presente dalla | Note |
|----------|----------|----------------|------|
| 🔴 P0 | Aggiornare NextAuth a versione stabile | V0 | Unico P0 rimasto |
| 🟡 P1 | Espansione E2E test (15+ flussi mancanti) | V8 | Nuova |
| 🟡 P1 | Unificare deadline email templates in React Email | V8 | Nuova |
| 🟢 P2 | Structured logging (Pino) con request ID | V8 | Nuova |
| 🟢 P2 | Metadata per pagine specifiche | V8 | Nuova |
| 🟢 P2 | Loading states per sotto-route admin | V8 | Nuova |
| 🟢 P2 | Indicizzazione `updatedAt` per sync TMS | V0 | |
| 🟢 P2 | Campo `avatar` su User | V0 | |
| 🔵 P3 | SCORM/xAPI support | V0 | |
| 🔵 P3 | Web Push notifications | V0 | |
| 🔵 P3 | Multi-tenancy con RLS | V0 | |
| 🔵 P3 | i18n con next-intl | V0 | |
| 🔵 P3 | Vercel Analytics + Posthog/Plausible | V0 | |

### Attività V0 ora Completate (risolte nelle Fasi 5-8)

| Attività | Risolta in |
|----------|------------|
| ✅ Soft delete su modelli critici | Fase 6 |
| ✅ Duplicazione codice bulk enrollment | Fase 6 |
| ✅ Connection pooling pgBouncer | Fase 5 |
| ✅ Test E2E con Playwright | Fase 5 |
| ✅ Prettier + Husky + lint-staged | Fase 5 |
| ✅ Documentazione API | Fase 6 |
