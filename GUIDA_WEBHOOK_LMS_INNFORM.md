# Guida Integrazione Webhook EduPlan -> LMS INNFORM

## Panoramica

EduPlan (TMS) invia webhook al LMS INNFORM quando vengono create/cancellate iscrizioni.
Il LMS deve implementare un endpoint per ricevere questi webhook e sincronizzare gli utenti/iscrizioni.

## Endpoint da Implementare

### URL Produzione
```
POST https://lms.innform.eu/lms/api/webhooks/tms
```

### URL Sviluppo (per test locali)
```
POST http://localhost:3000/api/webhooks/tms
```

**NOTA IMPORTANTE:** L'Edge Function di Supabase (produzione) non può raggiungere localhost.
Per testare in locale, usa uno di questi approcci:
1. Usa ngrok per esporre localhost: `ngrok http 3000` e usa l'URL ngrok
2. Testa direttamente con curl/Postman simulando i payload
3. Deploya su Vercel per test reali

---

## Headers delle Richieste

| Header | Descrizione |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-TMS-Signature` | Firma HMAC-SHA256 del body: `sha256=<hash>` |
| `X-TMS-Timestamp` | Timestamp ISO della richiesta |

---

## Secret per Verifica Firma

```
innform-lms-tms-integration-2025-secret
```

### Codice per Verificare la Firma (Node.js)

```javascript
const crypto = require('crypto');

const WEBHOOK_SECRET = 'innform-lms-tms-integration-2025-secret';

function verifyWebhookSignature(rawBody, signature) {
  if (!signature) return false;

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

// Uso nel middleware Express/Next.js:
export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-tms-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  // ... gestisci evento
}
```

---

## Eventi Webhook

### 1. enrollment_created (Nuova Iscrizione)

Inviato quando un utente viene iscritto a un corso su EduPlan.

**Payload:**
```json
{
  "event": "enrollment_created",
  "timestamp": "2026-01-06T10:30:00.000Z",
  "data": {
    "enrollment_id": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "email": "mario.rossi@email.com",
      "first_name": "Mario",
      "last_name": "Rossi",
      "company": "Azienda SRL",
      "job_title": "Developer"
    },
    "course": {
      "code": "CORSO-AI",
      "lms_course_id": "abc123",
      "title": "Corso AI",
      "start_date": "2026-01-15",
      "end_date": "2026-02-15"
    }
  }
}
```

**Azioni richieste:**
1. Verificare la firma HMAC
2. Cercare se l'utente esiste già nel LMS (per email)
3. Se non esiste, creare l'utente con:
   - Email come username
   - Password generata o placeholder (l'utente userà "password dimenticata")
   - Nome e cognome
4. Iscrivere l'utente al corso specificato in `lms_course_id`
5. Ritornare gli ID creati

**Risposta Successo (200):**
```json
{
  "success": true,
  "lms_user_id": "user_12345",
  "lms_enrollment_id": "enroll_67890",
  "message": "User enrolled successfully"
}
```

**Risposta Errore (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "User already enrolled in this course"
  }
}
```

---

### 2. enrollment_cancelled (Cancellazione Iscrizione)

Inviato quando un'iscrizione viene cancellata su EduPlan.

**Payload:**
```json
{
  "event": "enrollment_cancelled",
  "timestamp": "2026-01-06T11:00:00.000Z",
  "data": {
    "enrollment_id": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "email": "mario.rossi@email.com"
    },
    "reason": "Cancelled by admin"
  }
}
```

**Azioni richieste:**
1. Trovare l'utente per email
2. Rimuovere l'iscrizione al corso (non eliminare l'utente)
3. Opzionale: mantenere lo storico progresso

**Risposta Successo:**
```json
{
  "success": true,
  "message": "Enrollment cancelled"
}
```

---

### 3. user_credentials_created (Credenziali Utente Create)

Inviato quando vengono create credenziali per un utente su EduPlan.

**Payload:**
```json
{
  "event": "user_credentials_created",
  "timestamp": "2026-01-06T10:00:00.000Z",
  "data": {
    "person_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "mario.rossi@email.com",
    "first_name": "Mario",
    "last_name": "Rossi",
    "password": "TempPass123!",
    "role": "student",
    "source": "eduplan"
  }
}
```

**Azioni richieste:**
1. Creare utente sul LMS con le credenziali fornite
2. L'utente potrà accedere con email + password

**Risposta Successo:**
```json
{
  "success": true,
  "lms_user_id": "user_12345"
}
```

---

## Esempio Implementazione Next.js (App Router)

```typescript
// app/api/webhooks/tms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.TMS_WEBHOOK_SECRET || 'innform-lms-tms-integration-2025-secret';

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-tms-signature');
    const timestamp = req.headers.get('x-tms-timestamp');

    // 1. Verifica firma
    if (!verifySignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Verifica timestamp (anti-replay, 5 minuti)
    if (timestamp) {
      const requestTime = new Date(timestamp).getTime();
      const now = Date.now();
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return NextResponse.json({ error: 'Request expired' }, { status: 401 });
      }
    }

    // 3. Parse payload
    const payload = JSON.parse(rawBody);
    console.log('Received webhook:', payload.event, payload.data);

    // 4. Gestisci evento
    switch (payload.event) {
      case 'enrollment_created':
        return handleEnrollmentCreated(payload.data);

      case 'enrollment_cancelled':
        return handleEnrollmentCancelled(payload.data);

      case 'user_credentials_created':
        return handleUserCredentialsCreated(payload.data);

      default:
        console.log('Unknown event:', payload.event);
        return NextResponse.json({ success: true, message: 'Event ignored' });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

async function handleEnrollmentCreated(data: {
  enrollment_id: string;
  user: { email: string; first_name: string; last_name: string; company?: string };
  course: { lms_course_id: string; title: string };
}) {
  const { user, course, enrollment_id } = data;

  // TODO: Implementa la logica per:
  // 1. Cercare/creare utente per email
  // 2. Iscrivere al corso lms_course_id

  // Esempio pseudo-codice:
  // const lmsUser = await findOrCreateUser(user.email, user.first_name, user.last_name);
  // const enrollment = await enrollUserToCourse(lmsUser.id, course.lms_course_id);

  return NextResponse.json({
    success: true,
    lms_user_id: 'user_xxx',  // ID utente creato/trovato
    lms_enrollment_id: 'enroll_xxx',  // ID iscrizione creata
    message: 'User enrolled successfully'
  });
}

async function handleEnrollmentCancelled(data: {
  enrollment_id: string;
  user: { email: string };
  reason?: string;
}) {
  const { user, reason } = data;

  // TODO: Implementa la logica per:
  // 1. Trovare utente per email
  // 2. Rimuovere iscrizione

  return NextResponse.json({
    success: true,
    message: 'Enrollment cancelled'
  });
}

async function handleUserCredentialsCreated(data: {
  person_id: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
}) {
  const { email, first_name, last_name, password } = data;

  // TODO: Implementa la logica per:
  // 1. Creare utente con email e password forniti

  return NextResponse.json({
    success: true,
    lms_user_id: 'user_xxx'
  });
}
```

---

## Test con cURL

### Test enrollment_created
```bash
# Genera firma
SECRET="innform-lms-tms-integration-2025-secret"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
BODY='{"event":"enrollment_created","timestamp":"'$TIMESTAMP'","data":{"enrollment_id":"test-123","user":{"email":"test@example.com","first_name":"Test","last_name":"User"},"course":{"lms_course_id":"course-1","title":"Test Course"}}}'
SIGNATURE="sha256=$(echo -n $BODY | openssl dgst -sha256 -hmac $SECRET | cut -d' ' -f2)"

# Invia richiesta
curl -X POST http://localhost:3000/api/webhooks/tms \
  -H "Content-Type: application/json" \
  -H "X-TMS-Signature: $SIGNATURE" \
  -H "X-TMS-Timestamp: $TIMESTAMP" \
  -d "$BODY"
```

---

## Configurazione Variabili Ambiente LMS

Aggiungi nel `.env` del LMS:

```env
TMS_WEBHOOK_SECRET=innform-lms-tms-integration-2025-secret
```

---

## Troubleshooting

### "Invalid signature"
- Verifica che il secret sia identico su entrambi i sistemi
- Assicurati di usare il raw body (non parsato) per la verifica

### "Request expired"
- Il timestamp deve essere entro 5 minuti dall'ora attuale
- Verifica che i server abbiano orologi sincronizzati

### Webhook non arriva in localhost
- L'Edge Function di Supabase non può raggiungere localhost
- Usa ngrok: `ngrok http 3000`
- Oppure testa in ambiente deployato (Vercel)

### Errori 404
- Verifica che l'endpoint `/api/webhooks/tms` esista
- In Next.js App Router: `app/api/webhooks/tms/route.ts`
- In Next.js Pages Router: `pages/api/webhooks/tms.ts`

---

---

## Endpoint EduPlan Dedicati

Oltre all'endpoint generale `/api/webhooks/tms`, sono disponibili endpoint dedicati per EduPlan:

### POST /api/eduplan/users - Creazione Utente

Crea un nuovo utente nel LMS con credenziali specifiche.

**URL:** `https://lms.innform.eu/lms/api/eduplan/users`

**Headers:**
```
Content-Type: application/json
X-TMS-Signature: sha256=<HMAC-SHA256 del body>
X-TMS-Timestamp: <ISO timestamp>
```

**Payload:**
```json
{
  "email": "mario.rossi@email.com",
  "firstName": "Mario",
  "lastName": "Rossi",
  "password": "TempPass123!",
  "role": "learner",
  "sendWelcomeEmail": false,
  "metadata": {
    "eduplan_person_id": "uuid-della-persona",
    "source": "eduplan"
  }
}
```

**Risposta Successo (200):**
```json
{
  "success": true,
  "id": "cmk39x3a20001yb2bmrcmmjdh"
}
```

---

### POST /api/eduplan/enrollments - Iscrizione a Corso

Iscrive un utente esistente a un corso specifico.

**URL:** `https://lms.innform.eu/lms/api/eduplan/enrollments`

**Headers:**
```
Content-Type: application/json
X-TMS-Signature: sha256=<HMAC-SHA256 del body>
X-TMS-Timestamp: <ISO timestamp>
```

**Payload:**
```json
{
  "user_email": "mario.rossi@email.com",
  "course_id": "course001",
  "eduplan_enrollment_id": "ep-enroll-uuid-123",
  "due_date": "2026-03-01T00:00:00Z"
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `user_email` | string | ✅ | Email utente (case-insensitive) |
| `course_id` | string | ✅ | ID del corso LMS |
| `eduplan_enrollment_id` | string | ✅ | ID iscrizione su EduPlan (per sync) |
| `due_date` | string | ❌ | Data scadenza (ISO 8601) |

**Risposta Successo - Nuova iscrizione (201):**
```json
{
  "success": true,
  "enrollment_id": "cuid123",
  "message": "User enrolled successfully"
}
```

**Risposta Successo - Già iscritto (200):**
```json
{
  "success": true,
  "enrollment_id": "existing-id",
  "existing": true,
  "message": "User already enrolled in this course"
}
```

**Errori:**
- `400` - Campi obbligatori mancanti
- `401` - Firma HMAC non valida
- `404` - Utente o corso non trovato (`USER_NOT_FOUND` / `COURSE_NOT_FOUND`)
- `429` - Rate limit superato

---

### DELETE /api/eduplan/enrollments - Cancellazione Iscrizione

Rimuove l'iscrizione di un utente da un corso.

**URL:** `https://lms.innform.eu/lms/api/eduplan/enrollments`

**Headers:**
```
Content-Type: application/json
X-TMS-Signature: sha256=<HMAC-SHA256 del body>
X-TMS-Timestamp: <ISO timestamp>
```

**Payload (opzione 1 - per ID EduPlan):**
```json
{
  "eduplan_enrollment_id": "ep-enroll-uuid-123"
}
```

**Payload (opzione 2 - per email + corso):**
```json
{
  "user_email": "mario.rossi@email.com",
  "course_id": "course001"
}
```

**Risposta Successo (200):**
```json
{
  "success": true,
  "message": "Enrollment deleted successfully"
}
```

---

### GET /api/eduplan/courses - Lista Corsi Disponibili

Recupera la lista dei corsi LMS disponibili per l'integrazione.

**URL:** `https://lms.innform.eu/lms/api/eduplan/courses`

**Headers:**
```
x-api-key: <EDUPLAN_API_KEY>
```

**Query Parameters:**
- `include_modules=true` - Include dettagli moduli
- `published_only=true` - Solo corsi pubblicati (default: true)
- `limit=100` - Limite risultati
- `offset=0` - Offset paginazione

**Risposta:**
```json
{
  "success": true,
  "courses": [
    {
      "id": "course001",
      "title": "Corso AI",
      "description": "...",
      "modules_count": 5,
      "enrollments_count": 42,
      "image_url": "..."
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Flusso Completo EduPlan → LMS

```
1. EduPlan crea utente:
   POST /api/eduplan/users
   → LMS crea User con password hashata

2. EduPlan iscrive utente al corso:
   POST /api/eduplan/enrollments
   → LMS crea Enrollment con tmsEnrollmentId

3. Utente fa login su LMS
   → Vede catalogo corsi
   → Corso EduPlan già assegnato con progresso 0%

4. EduPlan cancella iscrizione (opzionale):
   DELETE /api/eduplan/enrollments
   → LMS elimina Enrollment
```

---

## Contatti

Per problemi di integrazione, contattare il team EduPlan.
