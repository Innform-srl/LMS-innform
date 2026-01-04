# Guida Integrazione LMS-INNFORM ↔ TMS (EduPlan)

**Versione:** 4.1
**Ultimo aggiornamento:** 4 Gennaio 2026

---

## Stato Integrazione

| Direzione | Stato | Note |
|-----------|-------|------|
| LMS → EduPlan | ✅ PRONTO | Edge Function attiva, riceve webhook |
| EduPlan → LMS | ✅ PRONTO | Endpoint `/api/webhooks/tms` attivo |
| API Corsi | ✅ PRONTO | Endpoint `/api/eduplan/courses` per sync lista corsi |

---

# INTEGRAZIONE COMPLETATA ✅

## Endpoint Disponibili

### 1. Webhook TMS → LMS (per ricevere iscrizioni da EduPlan)

```
POST https://lms.innform.eu/lms/api/webhooks/tms
```

### Headers che EduPlan invia

```
Content-Type: application/json
X-TMS-Signature: sha256=<hmac_signature>
X-TMS-Timestamp: <iso_timestamp>
```

### Codice per verificare la firma (Node.js)

```javascript
const crypto = require('crypto');

const TMS_WEBHOOK_SECRET = 'innform-lms-tms-integration-2025-secret';

function verifySignature(payload, signature, timestamp) {
  // 1. Verifica timestamp (max 5 minuti)
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false; // Richiesta scaduta
  }

  // 2. Calcola firma attesa
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', TMS_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // 3. Confronta firme
  return signature === expectedSignature;
}

// Esempio Express.js
app.post('/api/webhooks/tms', (req, res) => {
  const signature = req.headers['x-tms-signature'];
  const timestamp = req.headers['x-tms-timestamp'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, timestamp)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Processa evento
  const { event, data } = req.body;

  switch (event) {
    case 'enrollment_created':
      // Crea utente se non esiste e iscrivilo al corso
      handleEnrollmentCreated(data);
      break;
    case 'enrollment_cancelled':
      // Rimuovi iscrizione
      handleEnrollmentCancelled(data);
      break;
    case 'enrollment_updated':
      // Aggiorna iscrizione
      handleEnrollmentUpdated(data);
      break;
  }

  res.json({ success: true });
});
```

---

## 2. Eventi che EduPlan invia a LMS

### enrollment_created - Nuova iscrizione

```json
{
  "event": "enrollment_created",
  "timestamp": "2026-01-03T10:30:00.000Z",
  "data": {
    "enrollment_id": "uuid-iscrizione-eduplan",
    "user": {
      "email": "mario.rossi@email.com",
      "first_name": "Mario",
      "last_name": "Rossi",
      "company": "Azienda SRL",
      "job_title": "Developer"
    },
    "course": {
      "code": "AI-BASE",
      "lms_course_id": "corso-ai-fundamentals",
      "title": "Corso AI Fundamentals",
      "start_date": "2026-02-01",
      "end_date": "2026-02-28"
    }
  }
}
```

**Azione LMS**:
1. Cerca utente per email, crealo se non esiste
2. Iscrivilo al corso `lms_course_id`
3. Salva `enrollment_id` per riferimento futuro

---

### enrollment_cancelled - Iscrizione cancellata

```json
{
  "event": "enrollment_cancelled",
  "timestamp": "2026-01-03T11:00:00.000Z",
  "data": {
    "enrollment_id": "uuid-iscrizione-eduplan",
    "user": {
      "email": "mario.rossi@email.com"
    },
    "reason": "Richiesta dal partecipante"
  }
}
```

**Azione LMS**: Disiscrivere l'utente dal corso

---

### enrollment_updated - Iscrizione modificata

```json
{
  "event": "enrollment_updated",
  "timestamp": "2026-01-03T11:30:00.000Z",
  "data": {
    "enrollment_id": "uuid-iscrizione-eduplan",
    "updates": {
      "status": "confirmed"
    }
  }
}
```

---

## 3. Risposta che LMS deve restituire

```json
// Successo (HTTP 200)
{
  "success": true,
  "message": "Enrollment created"
}

// Errore (HTTP 4xx)
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "User already enrolled in this course"
  }
}
```

---

## 4. Configurazione LMS

Aggiungi queste variabili ambiente:

```env
# URL base TMS (EduPlan)
TMS_API_BASE_URL=https://ikjqbmjyjuhkwtdvxjai.supabase.co/functions/v1/lms-integration

# Supabase Anon Key per autenticazione
TMS_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret UNICO per firma HMAC (usato in entrambe le direzioni)
TMS_WEBHOOK_SECRET=innform-lms-tms-integration-2025-secret

# API Key per EduPlan (accesso endpoint /api/eduplan/courses)
EDUPLAN_API_KEY=your-api-key
```

---

## 5. Checklist per LMS

- [ ] Creare endpoint `POST /api/webhooks/tms`
- [ ] Implementare verifica firma HMAC-SHA256
- [ ] Gestire evento `enrollment_created`
- [ ] Gestire evento `enrollment_cancelled`
- [ ] Gestire evento `enrollment_updated`
- [ ] Testare con curl (vedi sezione Test)
- [ ] Comunicare a EduPlan che endpoint e pronto

**Quando LMS comunica che l'endpoint e pronto**, EduPlan attivera i webhook impostando `VITE_LMS_OUTBOUND_ENABLED=true`.

---

## 6. Test endpoint LMS

```bash
curl -X POST https://innform.eu/lms/api/webhooks/tms \
  -H "Content-Type: application/json" \
  -H "X-TMS-Signature: sha256=test" \
  -H "X-TMS-Timestamp: 2026-01-03T10:00:00.000Z" \
  -d '{
    "event": "enrollment_created",
    "timestamp": "2026-01-03T10:00:00.000Z",
    "data": {
      "enrollment_id": "test-123",
      "user": {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User"
      },
      "course": {
        "lms_course_id": "corso-test",
        "title": "Corso Test"
      }
    }
  }'
```

---
---
---

# DOCUMENTAZIONE ESISTENTE (LMS → EduPlan)

La parte sotto documenta i webhook che LMS gia invia a EduPlan (funzionante).

---

## ENDPOINT TMS CHE RICEVONO WEBHOOK DAL LMS

Il LMS invia richieste POST a questi endpoint:

| Endpoint | Descrizione |
|----------|-------------|
| `/lms-integration/progress-webhook` | Aggiornamento progresso corso |
| `/lms-integration/completion-webhook` | Corso completato al 100% |
| `/lms-integration/certificate-webhook` | Certificato emesso |
| `/lms-integration/user-activity` | Attività utente (login, quiz, badge, inattività) |

**URL Base TMS**: `https://ikjqbmjyjuhkwtdvxjai.supabase.co/functions/v1`

---

## AUTENTICAZIONE WEBHOOK

Ogni richiesta dal LMS **DEVE** includere questi header:

```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlranFibWp5anVoa3d0ZHZ4amFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc4MDksImV4cCI6MjA3NjYxMzgwOX0.6MqvODmDE27UtnTXgI7ZiZF1th5q4QVVxwVu_2czBcs
X-LMS-Signature: sha256=<firma-hmac-sha256>
X-LMS-Timestamp: <timestamp-iso8601>
```

**Supabase Anon Key** (per Authorization header):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlranFibWp5anVoa3d0ZHZ4amFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc4MDksImV4cCI6MjA3NjYxMzgwOX0.6MqvODmDE27UtnTXgI7ZiZF1th5q4QVVxwVu_2czBcs
```

**Secret HMAC condiviso (UNICO per entrambe le direzioni)**: `innform-lms-tms-integration-2025-secret`

### Come verificare la firma nel TMS (EduPlan)

```typescript
import { createHmac } from 'crypto';

// NOTA: Usare lo stesso TMS_WEBHOOK_SECRET per entrambe le direzioni
function verifyLMSSignature(body: string, signature: string, timestamp: string): boolean {
  const secret = process.env.TMS_WEBHOOK_SECRET; // 'innform-lms-tms-integration-2025-secret'

  // 1. Verifica timestamp (max 5 minuti)
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - webhookTime) > 5 * 60 * 1000) {
    return false; // Timestamp troppo vecchio - possibile replay attack
  }

  // 2. Calcola firma attesa
  const expectedSignature = 'sha256=' + createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // 3. Confronta firme
  return signature === expectedSignature;
}
```

---

## PAYLOAD WEBHOOK CHE IL TMS RICEVE

### 1. Progress Webhook

**Endpoint**: `POST /lms-integration/progress-webhook`

**Quando arriva**: Ogni 10% di avanzamento o ogni 24h di attività

```json
{
  "event": "progress_updated",
  "user_email": "mario.rossi@azienda.com",
  "course_id": "uuid-corso-lms",
  "tms_enrollment_id": "uuid-iscrizione-tms",
  "progress": {
    "percentage": 65,
    "modules_completed": 4,
    "modules_total": 6,
    "time_spent_minutes": 180,
    "last_activity": "2025-12-27T10:30:00Z",
    "current_module": {
      "id": "uuid-modulo",
      "name": "Modulo 3 - Sicurezza",
      "type": "VIDEO"
    }
  }
}
```

**Cosa deve fare il TMS**:
- Trovare l'iscrizione tramite `user_email` + `course_id` o `tms_enrollment_id`
- Aggiornare il progresso nel database TMS
- Opzionale: inviare notifica se progresso raggiunge soglie (50%, 75%, 90%)

---

### 2. Completion Webhook

**Endpoint**: `POST /lms-integration/completion-webhook`

**Quando arriva**: Utente completa il 100% del corso

```json
{
  "event": "course_completed",
  "user_email": "mario.rossi@azienda.com",
  "course_id": "uuid-corso-lms",
  "tms_enrollment_id": "uuid-iscrizione-tms",
  "completion": {
    "date": "2025-12-27T14:00:00Z",
    "final_score": 92,
    "time_spent_minutes": 480,
    "modules_completed": 6,
    "quizzes_passed": 3,
    "quizzes_total": 3
  }
}
```

**Cosa deve fare il TMS**:
- Marcare iscrizione come completata
- Aggiornare stato lead se applicabile (es. `enrolled` → `completed`)
- Registrare data completamento e punteggio finale

---

### 3. Certificate Webhook

**Endpoint**: `POST /lms-integration/certificate-webhook`

**Quando arriva**: Viene generato un certificato nel LMS

```json
{
  "event": "certificate_issued",
  "certificate": {
    "id": "uuid-certificato",
    "user_email": "mario.rossi@azienda.com",
    "user_name": "Mario Rossi",
    "course_id": "uuid-corso-lms",
    "course_name": "Corso Sicurezza sul Lavoro",
    "issue_date": "2025-12-27T14:00:00Z",
    "score": 92,
    "time_spent_minutes": 480,
    "modules_completed": 6,
    "certificate_url": "https://lms.innform.com/verify-certificate?code=CERT-2025-ABC123",
    "pdf_url": "https://lms.innform.com/api/certificates/uuid/download",
    "verification_code": "CERT-2025-ABC123",
    "badges": [
      {
        "id": "uuid-badge",
        "name": "Completamento Veloce",
        "icon": "https://lms.innform.com/badges/fast.svg",
        "date": "2025-12-27T14:00:00Z"
      }
    ]
  }
}
```

**Cosa deve fare il TMS**:
- Salvare riferimento al certificato LMS nel database TMS
- Memorizzare `certificate_url` e `pdf_url` per accesso futuro
- Opzionale: sincronizzare con repository certificati TMS

---

### 4. User Activity Webhook

**Endpoint**: `POST /lms-integration/user-activity`

**Quando arriva**: Primo login, quiz completato, badge ottenuto, inattività

#### 4a. Primo Login
```json
{
  "event": "first_login",
  "user_email": "mario.rossi@azienda.com",
  "timestamp": "2025-12-27T09:00:00Z",
  "metadata": {
    "device": "desktop",
    "browser": "Chrome",
    "ipCountry": "IT"
  }
}
```

**Cosa deve fare il TMS**: Registrare data primo accesso, aggiornare stato lead

---

#### 4b. Quiz Completato
```json
{
  "event": "quiz_completed",
  "user_email": "mario.rossi@azienda.com",
  "course_id": "uuid-corso-lms",
  "quiz": {
    "id": "uuid-quiz",
    "name": "Quiz Modulo 1",
    "score": 85,
    "passed": true,
    "passing_score": 70,
    "attempts": 1,
    "time_taken_seconds": 300
  }
}
```

**Cosa deve fare il TMS**: Registrare risultato quiz, aggiornare statistiche utente

---

#### 4c. Badge Ottenuto
```json
{
  "event": "badge_earned",
  "user_email": "mario.rossi@azienda.com",
  "badge": {
    "id": "uuid-badge",
    "name": "Fast Learner",
    "description": "Corso completato in meno di 24h",
    "icon_url": "https://lms.innform.com/badges/fast.svg",
    "points": 100,
    "category": "performance"
  }
}
```

**Cosa deve fare il TMS**: Registrare badge nel profilo utente (opzionale)

---

#### 4d. Inattività
```json
{
  "event": "inactivity_alert",
  "user_email": "mario.rossi@azienda.com",
  "course_id": "uuid-corso-lms",
  "days_inactive": 7,
  "last_activity": "2025-12-20T10:00:00Z",
  "progress_at_last_activity": 45
}
```

**Cosa deve fare il TMS**:
- Inviare email di sollecito all'utente
- Notificare responsabile formazione
- Aggiornare flag "a rischio abbandono"

---

## RISPOSTA CHE IL TMS DEVE RESTITUIRE

### Successo (HTTP 200)
```json
{
  "success": true,
  "message": "Event processed"
}
```

### Errore (HTTP 4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User mario.rossi@azienda.com not found in TMS"
  }
}
```

**Codici errore supportati**:

| Codice | Significato |
|--------|-------------|
| `USER_NOT_FOUND` | Email non trovata nel TMS |
| `COURSE_NOT_MAPPED` | Corso LMS non mappato a corso TMS |
| `ENROLLMENT_NOT_FOUND` | Iscrizione non trovata |
| `INVALID_SIGNATURE` | Firma HMAC non valida |
| `TIMESTAMP_EXPIRED` | Timestamp più vecchio di 5 minuti |
| `VALIDATION_ERROR` | Payload non valido |
| `INTERNAL_ERROR` | Errore interno TMS |

---

## RETRY AUTOMATICO DEL LMS

Se il TMS risponde con errore, il LMS ritenta automaticamente:

| Tentativo | Attesa |
|-----------|--------|
| 1° retry | 5 minuti |
| 2° retry | 10 minuti |
| 3° retry | 20 minuti |

Dopo 3 tentativi falliti → evento marcato come fallito definitivamente.

---

## WEBHOOK DAL TMS AL LMS (direzione opposta)

Il TMS può inviare webhook al LMS per creare iscrizioni:

**Endpoint LMS**: `POST https://lms.innform.com/api/webhooks/tms`

### Nuova Iscrizione

```json
{
  "event": "enrollment_created",
  "timestamp": "2025-12-27T09:00:00Z",
  "data": {
    "enrollment_id": "uuid-iscrizione-tms",
    "user": {
      "email": "mario.rossi@azienda.com",
      "first_name": "Mario",
      "last_name": "Rossi",
      "company": "Azienda SRL",
      "job_title": "Developer"
    },
    "course": {
      "code": "SICUREZZA-2025",
      "lms_course_id": "uuid-corso-lms",
      "title": "Corso Sicurezza sul Lavoro",
      "start_date": "2025-12-27",
      "end_date": "2026-01-27"
    }
  }
}
```

**Header richiesti dal TMS**:
```
Content-Type: application/json
X-TMS-Signature: sha256=<firma-hmac>
X-TMS-Timestamp: <timestamp-iso8601>
```

### Annullamento Iscrizione

```json
{
  "event": "enrollment_cancelled",
  "timestamp": "2025-12-27T09:00:00Z",
  "data": {
    "enrollment_id": "uuid-iscrizione-tms",
    "user": {
      "email": "mario.rossi@azienda.com"
    },
    "reason": "Richiesta cliente"
  }
}
```

---

## MAPPATURA CORSI TMS ↔ LMS

Il LMS mantiene una tabella di mappatura:

| Codice Corso TMS | ID Corso LMS | Nome Corso |
|------------------|--------------|------------|
| SICUREZZA-2025 | 5387d7fd-91d5-4221-8abb-9b467a5414ee | Corso Sicurezza sul Lavoro |
| PRIVACY-2025 | uuid-456 | Corso GDPR e Privacy |
| HACCP-2025 | uuid-789 | Corso HACCP Alimentare |

Questa mappatura si gestisce dall'admin LMS: **Impostazioni → Integrazioni TMS**

---

## TEST CONNESSIONE

### Test dal TMS verso LMS

```bash
curl -X POST "https://lms.innform.com/api/webhooks/tms" \
  -H "Content-Type: application/json" \
  -H "X-TMS-Signature: sha256=test" \
  -H "X-TMS-Timestamp: 2025-12-27T10:00:00Z" \
  -d '{
    "event": "enrollment_created",
    "data": {
      "enrollment_id": "test-123",
      "user": {"email": "test@example.com", "first_name": "Test", "last_name": "User"},
      "course": {"code": "TEST-2025", "title": "Test Course"}
    }
  }'
```

### Test che il TMS riceve webhook

Verifica i log della Edge Function `lms-integration` su Supabase per vedere i webhook in arrivo.

---

## RIEPILOGO CONFIGURAZIONE

### Lato LMS - Variabili Ambiente da Configurare

File `.env`:
```env
# URL base endpoint TMS
TMS_API_BASE_URL=https://ikjqbmjyjuhkwtdvxjai.supabase.co/functions/v1/lms-integration

# Chiave Supabase per autenticazione (header Authorization: Bearer <key>)
TMS_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlranFibWp5anVoa3d0ZHZ4amFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc4MDksImV4cCI6MjA3NjYxMzgwOX0.6MqvODmDE27UtnTXgI7ZiZF1th5q4QVVxwVu_2czBcs

# Secret UNICO per firma HMAC-SHA256 (entrambe le direzioni)
TMS_WEBHOOK_SECRET=innform-lms-tms-integration-2025-secret

# API Key per EduPlan (accesso endpoint /api/eduplan/courses)
EDUPLAN_API_KEY=a84a5cc35fd769813a3192f367a77c28b15acc39eeea3178c448d92d5f43da5a
```

### Lato TMS (EduPlan) ✅ COMPLETATO

Edge Function `lms-integration` è deployata e:
1. ✅ Verifica firma HMAC-SHA256 con secret `innform-lms-tms-integration-2025-secret`
2. ✅ Gestisce i 4 endpoint (progress, completion, certificate, user-activity)
3. ✅ Restituisce JSON con `success: true/false`
4. ✅ Logga tutti i webhook nella tabella `lms_sync_log`

---

## SUPPORTO

- **Timeout**: LMS attende max 30 secondi per risposta
- **Rate limit**: Max 100 richieste/minuto per endpoint
- **Logs TMS**: Tabella `lms_sync_log` in Supabase
- **Logs LMS**: Tabella `WebhookEvent` per debug

---

## TEST CONNESSIONE VERIFICATO ✅

```bash
curl -X POST "https://ikjqbmjyjuhkwtdvxjai.supabase.co/functions/v1/lms-integration/progress-webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlranFibWp5anVoa3d0ZHZ4amFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc4MDksImV4cCI6MjA3NjYxMzgwOX0.6MqvODmDE27UtnTXgI7ZiZF1th5q4QVVxwVu_2czBcs" \
  -d '{"event": "progress_updated", "user_email": "test@example.com", "course_id": "test-123", "progress": {"percentage": 10}}'

# Risposta attesa (utente non esiste):
# {"success":false,"error":{"code":"USER_NOT_FOUND","message":"User test@example.com not found"}}
```

*Ultimo test: 27 Dicembre 2025 - SUCCESSO ✅*
