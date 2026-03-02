# LMS Innform — API Reference

Documentazione completa di tutti gli endpoint API del sistema LMS Innform.

**Ultimo aggiornamento:** 2026-03-01

---

## Indice

1. [Autenticazione e Sicurezza](#autenticazione-e-sicurezza)
2. [EduPlan — Integrazione TMS](#eduplan--integrazione-tms)
3. [Webhook TMS](#webhook-tms)
4. [Cron Jobs](#cron-jobs)
5. [Admin](#admin)
6. [Analytics](#analytics)
7. [Certificati](#certificati)
8. [Corsi e Moduli](#corsi-e-moduli)
9. [Sessioni Live e Presenze](#sessioni-live-e-presenze)
10. [Utenti e Profilo](#utenti-e-profilo)
11. [Notifiche](#notifiche)
12. [Ricerca e Leaderboard](#ricerca-e-leaderboard)
13. [Upload File](#upload-file)
14. [Health Check](#health-check)
15. [Variabili d'Ambiente](#variabili-dambiente)

---

## Autenticazione e Sicurezza

### Metodi di autenticazione

| Contesto | Metodo | Header/Cookie |
|----------|--------|---------------|
| Utenti LMS | NextAuth.js JWT | Cookie di sessione (`httpOnly`, `secure` in produzione) |
| EduPlan (lettura) | API Key | `X-API-Key` o `Authorization: Bearer <EDUPLAN_API_KEY>` |
| EduPlan (scrittura) | HMAC-SHA256 | `X-TMS-Signature` + `X-TMS-Timestamp` |
| Webhook TMS | HMAC-SHA256 | `X-TMS-Signature` + `X-TMS-Timestamp` |
| Cron Jobs | Bearer token | `Authorization: Bearer <CRON_SECRET>` |

### Firma HMAC-SHA256

Gli endpoint di scrittura EduPlan e il webhook TMS richiedono una firma HMAC-SHA256:

```
signature = HMAC-SHA256(requestBody, TMS_WEBHOOK_SECRET)
```

**Headers richiesti:**
- `X-TMS-Signature`: firma HMAC-SHA256 hex-encoded del body
- `X-TMS-Timestamp`: timestamp ISO 8601 (finestra massima: 5 minuti)

### Rate Limiting

- Endpoint EduPlan e Webhook: **30 req/min** per IP
- Rate limiting in-memory con tracciamento IP

### Ruoli utente

| Ruolo | Permessi |
|-------|----------|
| `ADMIN` | Accesso completo a tutte le funzionalità |
| `TEACHER` | Gestione presenze, visualizzazione sessioni |
| `EMPLOYEE` | Accesso corsi, profilo, certificati |

---

## EduPlan — Integrazione TMS

### `POST /api/eduplan/users`

Crea o aggiorna un utente dal TMS.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`
**Rate Limit:** 30 req/min

**Request Body:**
```json
{
    "email": "utente@azienda.it",
    "firstName": "Mario",
    "lastName": "Rossi",
    "password": "password123",
    "role": "EMPLOYEE",
    "sendWelcomeEmail": true,
    "metadata": {}
}
```

**Response (201):**
```json
{
    "id": "clx...",
    "success": true
}
```

**cURL:**
```bash
curl -X POST https://lms.innform.it/api/eduplan/users \
  -H "Content-Type: application/json" \
  -H "X-TMS-Signature: <hmac_signature>" \
  -H "X-TMS-Timestamp: 2026-03-01T10:00:00Z" \
  -d '{"email":"utente@azienda.it","firstName":"Mario","lastName":"Rossi","password":"pass123"}'
```

---

### `DELETE /api/eduplan/users`

Elimina (soft delete) un utente dal TMS.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`

**Request Body:**
```json
{
    "email": "utente@azienda.it",
    "reason": "Cessazione contratto"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "User deleted successfully"
}
```

---

### `PATCH /api/eduplan/users`

Aggiorna la password di un utente.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`

**Request Body:**
```json
{
    "email": "utente@azienda.it",
    "password": "nuovaPassword123"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Password updated successfully"
}
```

---

### `POST /api/eduplan/sessions`

Crea o aggiorna una sessione live dal TMS.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`
**Rate Limit:** 30 req/min

**Request Body:**
```json
{
    "tms_lesson_id": "edu_lesson_123",
    "title": "Lezione di sicurezza",
    "description": "Formazione obbligatoria",
    "start_time": "2026-03-15T09:00:00Z",
    "end_time": "2026-03-15T12:00:00Z",
    "course_id": "clx...",
    "instructor_email": "docente@innform.it",
    "room_name": "Aula A",
    "session_type": "IN_PERSON",
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "max_participants": 30
}
```

**Response (201):**
```json
{
    "success": true,
    "session_id": "clx...",
    "existing": false,
    "message": "Session created successfully"
}
```

---

### `DELETE /api/eduplan/sessions`

Elimina una sessione live.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`

**Request Body:**
```json
{
    "tms_lesson_id": "edu_lesson_123"
}
```

Alternativa:
```json
{
    "session_id": "clx..."
}
```

---

### `GET /api/eduplan/enrollments`

Recupera le iscrizioni di uno studente.

**Auth:** `X-API-Key` o `Authorization: Bearer <EDUPLAN_API_KEY>`
**Rate Limit:** 30 req/min
**CORS:** Abilitato

**Query Parameters:**

| Parametro | Tipo | Obbligatorio | Descrizione |
|-----------|------|-------------|-------------|
| `email` | string | Sì | Email dello studente |
| `status` | string | No | `completed`, `in_progress`, `all` |
| `include_certificate` | boolean | No | Includi dati certificato |
| `eduCourseIds` | string | No | Filtra per ID corso EduPlan (comma-separated) |

**Response (200):**
```json
{
    "success": true,
    "data": {
        "student": {
            "id": "clx...",
            "name": "Mario Rossi",
            "email": "mario@azienda.it"
        },
        "enrollments": [
            {
                "courseId": "clx...",
                "courseName": "Sicurezza sul lavoro",
                "progress": 75,
                "completed": false,
                "timeSpent": 3600,
                "certificate": null
            }
        ]
    },
    "meta": {
        "lmsVersion": "1.0",
        "timestamp": "2026-03-01T10:00:00Z"
    }
}
```

---

### `POST /api/eduplan/enrollments`

Iscrive un utente a un corso.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`
**Rate Limit:** 30 req/min
**Idempotente:** Restituisce iscrizione esistente se già presente.

**Request Body:**
```json
{
    "user_email": "utente@azienda.it",
    "course_id": "clx...",
    "eduplan_enrollment_id": "edu_enr_123",
    "due_date": "2026-06-30T00:00:00Z"
}
```

**Response (201):**
```json
{
    "success": true,
    "enrollment_id": "clx...",
    "existing": false
}
```

---

### `DELETE /api/eduplan/enrollments`

Rimuove l'iscrizione di un utente da un corso.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`

**Request Body:**
```json
{
    "user_email": "utente@azienda.it",
    "course_id": "clx...",
    "eduplan_enrollment_id": "edu_enr_123"
}
```

---

### `GET /api/eduplan/courses`

Elenco dei corsi disponibili.

**Auth:** `X-API-Key` o `Authorization: Bearer <EDUPLAN_API_KEY>`

**Query Parameters:**

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `include_modules` | boolean | false | Includi dettagli moduli |
| `published_only` | boolean | true | Solo corsi pubblicati |
| `limit` | number | 50 | Risultati per pagina |
| `offset` | number | 0 | Offset paginazione |

**Response (200):**
```json
{
    "success": true,
    "data": {
        "courses": [...],
        "pagination": {
            "total": 42,
            "limit": 50,
            "offset": 0
        }
    },
    "meta": {
        "lmsVersion": "1.0",
        "timestamp": "2026-03-01T10:00:00Z"
    }
}
```

---

## Webhook TMS

### `POST /api/webhooks/tms`

Endpoint centralizzato per eventi dal TMS.

**Auth:** `X-TMS-Signature` + `X-TMS-Timestamp`
**Rate Limit:** 30 req/min
**Anti-replay:** Finestra timestamp di 5 minuti
**Idempotenza:** Tracciamento eventi processati per prevenire duplicati

**Eventi supportati:**

| Evento | Descrizione |
|--------|-------------|
| `enrollment_created` | Crea iscrizione + utente se necessario, invia notifica |
| `enrollment_updated` | Aggiorna data scadenza iscrizione |
| `enrollment_cancelled` | Elimina iscrizione, elimina utente se nessuna altra iscrizione EduPlan |
| `user_created` | Crea utente con auto-approvazione |
| `user_updated` | Aggiorna nome e azienda utente |
| `course_mapping_updated` | Placeholder per uso futuro |

**Request Body:**
```json
{
    "event": "enrollment_created",
    "data": {
        "user_email": "utente@azienda.it",
        "course_id": "clx...",
        "eduplan_enrollment_id": "edu_enr_123"
    }
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Enrollment created",
    "data": { ... }
}
```

**Codici errore:**

| Codice | HTTP | Descrizione |
|--------|------|-------------|
| `INVALID_SIGNATURE` | 401 | Firma HMAC non valida o timestamp scaduto |
| `VALIDATION_ERROR` | 400 | Body non valido o campi mancanti |
| `RATE_LIMITED` | 429 | Superato limite 30 req/min |
| `USER_NOT_FOUND` | 404 | Utente non trovato per email |
| `COURSE_NOT_FOUND` | 404 | Corso non trovato per ID |
| `ENROLLMENT_NOT_FOUND` | 404 | Iscrizione non trovata |
| `INTERNAL_ERROR` | 500 | Errore interno del server |

---

## Cron Jobs

Tutti i cron job richiedono `Authorization: Bearer <CRON_SECRET>`.

### `GET /api/cron/check-deadlines`

Invia promemoria per scadenze corsi.

- **3 giorni prima:** reminder via email
- **1 giorno prima:** reminder urgente via email
- **Scaduto:** notifica di scadenza superata
- **Deduplicazione:** registra Reminder per evitare invii duplicati
- **Servizio email:** Resend

### `GET /api/cron/session-reminders`

Gestisce promemoria per sessioni live.

- **24 ore prima:** notifica promemoria sessione
- **1 ora prima:** notifica promemoria urgente
- **30 min dopo fine:** segna automaticamente assenti chi non ha fatto check-in

### `GET /api/cron/tms-sync`

Sincronizzazione periodica con TMS.

- Riprova eventi webhook falliti
- Invia alert inattività (utenti inattivi da 7+ giorni)
- Alert per fallimenti critici webhook

---

## Admin

### `GET /api/admin/analytics`

**Auth:** ADMIN

**Response:**
```json
{
    "overview": {
        "totalUsers": 150,
        "totalCourses": 25,
        "totalEnrollments": 450,
        "totalCertificates": 120,
        "activeUsersThisWeek": 45,
        "completionsThisMonth": 15,
        "completionRate": 0.67,
        "avgTimeSpent": 7200
    },
    "charts": {
        "enrollmentTrend": [...],
        "topCourses": [...]
    },
    "recentActivity": [...]
}
```

### `GET/PUT /api/admin/certificate-settings`

**Auth:** ADMIN

**GET:** Recupera impostazioni certificato (crea default se assenti)

**PUT Body:**
```json
{
    "companyName": "Innform Srl",
    "signerName": "Mario Rossi",
    "signerTitle": "Direttore Formazione",
    "primaryColor": "#1a365d",
    "accentColor": "#e53e3e",
    "headerText": "Attestato di Completamento",
    "bodyTemplate": "Si certifica che {{name}} ha completato...",
    "logoUrl": "/uploads/logo.png"
}
```

### `GET /api/admin/export`

**Auth:** ADMIN
**Query:** `type` — `users` o `results`
**Response:** File CSV

### `GET /api/admin/export/users`

**Auth:** ADMIN
**Response:** CSV export utenti con dati iscrizioni e tempo

### `DELETE /api/admin/users/[userId]`

**Auth:** ADMIN
**Query:** `force=true` per forzare eliminazione con iscrizioni EduPlan attive

### Diagnostica Admin

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/admin/diagnostics/cron-check` | Stato CRON_SECRET, ultimo run, retry pendenti |
| `GET /api/admin/diagnostics/db-check` | Stato connessione DB con tempo di risposta |
| `GET /api/admin/diagnostics/env-check` | Stato variabili d'ambiente |
| `POST /api/admin/diagnostics/send-test-webhook` | Invia webhook di test a URL specificato |
| `GET /api/admin/diagnostics/webhook-table-check` | Verifica tabella WebhookEvent |

### `GET /api/admin/reset-password` (Solo sviluppo)

**Disponibilità:** Solo `NODE_ENV !== 'production'`
**Effetto:** Crea/resetta account admin con password "admin"

---

## Analytics

### `GET /api/analytics/overview`

**Auth:** ADMIN
**Cache:** 5 minuti (header `X-Cache`)

**Response:**
```json
{
    "totalUsers": 150,
    "totalCourses": 25,
    "totalEnrollments": 450,
    "avgCompletion": 67.5,
    "activeUsers": 45
}
```

### `GET /api/analytics/progress-timeline`

**Auth:** ADMIN
**Response:** Ultimi 30 giorni — iscrizioni e completamenti per data

### `GET /api/analytics/department-comparison`

**Auth:** ADMIN
**Response:** Metriche di progresso e completamento per dipartimento

---

## Certificati

### `POST /api/certificates/generate`

**Auth:** Utente autenticato

**Request Body:**
```json
{
    "enrollmentId": "clx..."
}
```

**Controlli:** Iscrizione esiste, utente proprietario, corso completato, tempo minimo raggiunto
**Effetto collaterale:** Invio email certificato (non bloccante)

### `GET /api/certificates/[certificateId]/download`

**Auth:** Utente proprietario o ADMIN
**Response:** PDF certificato con branding aziendale
**Content-Type:** `application/pdf`

### `GET /api/certificate/[attemptId]`

**Auth:** Utente proprietario o ADMIN
**Response:** PDF certificato per quiz superato

### `GET /api/certificates/verify`

**Auth:** Nessuna (endpoint pubblico)
**Query:** `code` — codice di verifica
**Response:** Validità e dettagli certificato

---

## Corsi e Moduli

### `POST /api/courses/[courseId]/track-time`

**Auth:** Utente autenticato

**Request Body:**
```json
{
    "minutes": 15
}
```

**Response:** Iscrizione aggiornata con nuovo `timeSpent`

### `POST/GET /api/comments`

**POST Auth:** Utente autenticato
**POST Body:**
```json
{
    "content": "Ottimo corso!",
    "courseId": "clx...",
    "moduleId": "clx...",
    "parentId": "clx..."
}
```

**GET Query:** `courseId`, `moduleId`
**GET Response:** Commenti top-level con risposte annidate

---

## Sessioni Live e Presenze

### `GET /api/sessions/[sessionId]/attendance`

**Auth:** Utente (propria presenza) o ADMIN/TEACHER (lista completa)

**Response:**
```json
{
    "attendances": [...],
    "stats": {
        "total": 25,
        "present": 20,
        "absent": 3,
        "late": 1,
        "excused": 1
    }
}
```

### `POST /api/sessions/[sessionId]/attendance`

**Auth:** Utente autenticato

**Azioni:**

| Azione | Descrizione |
|--------|-------------|
| `register` | Auto-registrazione alla sessione |
| `checkin` | Check-in (15 min prima — dopo inizio) |
| `checkout` | Check-out dalla sessione |
| `admin_checkin` | Admin effettua check-in per utente |

### `PATCH /api/sessions/[sessionId]/attendance`

**Auth:** ADMIN o TEACHER

**Body:**
```json
{
    "attendanceId": "clx...",
    "status": "PRESENT",
    "notes": "Arrivato in ritardo",
    "bulk": false
}
```

**Bulk update:**
```json
{
    "bulk": true,
    "userIds": ["clx...", "clx..."],
    "status": "PRESENT"
}
```

### Google Meet Integration

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/integrations/google-meet` | GET | Stato sync, connessione OAuth |
| `/api/integrations/google-meet` | POST | Sync partecipanti (auto/emails/csv) |
| `/api/integrations/google-meet` | PUT | Disconnetti Google Meet da sessione |
| `/api/integrations/google-meet` | PATCH | Associa partecipante non riconosciuto a utente LMS |

---

## Utenti e Profilo

### `PATCH /api/user/profile`

**Auth:** Utente autenticato
**Body:** `{ "name": "Nuovo Nome" }`

### `POST /api/user/password`

**Auth:** Utente autenticato
**Body:**
```json
{
    "currentPassword": "vecchiaPassword",
    "newPassword": "nuovaPassword123"
}
```
**Validazione:** Password minimo 8 caratteri

### `GET /api/user/analytics`

**Auth:** Utente autenticato
**Response:** Overview personale, trend progresso, scadenze, achievement recenti

### `GET /api/user/achievements`

**Auth:** Utente autenticato
**Response:** Tutti gli achievement con stato sblocco e progresso

### `POST /api/user/add-points`

**Auth:** Utente autenticato
**Body:**
```json
{
    "points": 50,
    "reason": "course_completion",
    "metadata": { "courseId": "clx..." }
}
```

### `GET /api/user/stats`

**Auth:** Utente autenticato
**Response:** Statistiche utente (crea default se non esiste)

---

## Notifiche

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/notifications` | GET | Ultime 20 notifiche |
| `/api/notifications` | PATCH | Segna notifica come letta (`{ "id": "clx..." }`) |
| `/api/notifications/[id]/read` | POST | Segna notifica specifica come letta |
| `/api/notifications/mark-all-read` | POST | Segna tutte come lette |
| `/api/notifications/unread-count` | GET | Conteggio notifiche non lette |

---

## Ricerca e Leaderboard

### `GET /api/search`

**Auth:** Utente autenticato

**Query Parameters:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `q` | string | Testo ricerca |
| `departmentId` | string | Filtra per dipartimento |
| `minDuration` | number | Durata minima (minuti) |
| `maxDuration` | number | Durata massima (minuti) |
| `sort` | string | `newest`, `oldest`, `title-asc`, `title-desc`, `duration-asc`, `duration-desc` |

**Response:** Corsi pubblicati con conteggi dipartimento e iscrizioni

### `GET /api/leaderboard`

**Auth:** Utente autenticato

**Query Parameters:**

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `period` | string | `month` | `week`, `month`, `all-time` |
| `limit` | number | 10 | Max risultati |

**Response:** Classifica utenti con punti, livello, statistiche

---

## Upload File

### `POST /api/upload`

**Auth:** ADMIN
**Content-Type:** `multipart/form-data`
**Max size:** 10 MB
**Tipi permessi:** PDF, JPEG, PNG, GIF, WebP, SVG

**Response (200):**
```json
{
    "success": true,
    "url": "/uploads/1709312400000-documento.pdf",
    "filename": "1709312400000-documento.pdf"
}
```

---

## Health Check

### `GET /api/health`

**Auth:** Nessuna (pubblico)

**Response (200):**
```json
{
    "status": "healthy",
    "checks": {
        "database": {
            "status": "ok",
            "responseTime": 12
        },
        "api": {
            "status": "ok"
        }
    },
    "version": "1.0.0",
    "environment": "production"
}
```

**HTTP 503** se il database non è raggiungibile.

---

## Variabili d'Ambiente

### Obbligatorie

| Variabile | Descrizione |
|-----------|-------------|
| `DATABASE_URL` | URL connessione PostgreSQL (pgBouncer in produzione) |
| `NEXTAUTH_SECRET` | Secret per JWT NextAuth.js |
| `NEXTAUTH_URL` | URL base dell'applicazione |

### Opzionali

| Variabile | Descrizione |
|-----------|-------------|
| `DIRECT_URL` | Connessione diretta DB (bypassa pgBouncer, per migrazioni) |
| `CRON_SECRET` | Secret per autenticazione cron jobs |
| `TMS_WEBHOOK_SECRET` | Secret HMAC per verifica webhook TMS |
| `EDUPLAN_API_KEY` | API key per endpoint lettura EduPlan |
| `RESEND_API_KEY` | API key per servizio email Resend |
| `GOOGLE_CLIENT_ID` | OAuth client ID per Google Meet |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret per Google Meet |

---

## Registri di Classe

### `GET /api/registers/[id]/pdf`

**Auth:** ADMIN
**Response:** PDF registro di classe (tipo FUNDED o INTERNAL)
**Content-Type:** `application/pdf`
**Personalizzazione:** Utilizza impostazioni certificato per branding aziendale
