# Integrazione EduPlan ↔ LMS INNFORM

## Panoramica

Questo documento descrive come EduPlan può integrare il proprio sistema con LMS INNFORM per:
- Creare utenti con credenziali specifiche
- Iscrivere utenti a corsi specifici
- Gestire le iscrizioni (creazione/cancellazione)
- Ottenere la lista dei corsi disponibili

---

## Credenziali di Accesso

| Chiave | Valore | Utilizzo |
|--------|--------|----------|
| **HMAC Secret** | `innform-lms-tms-integration-2025-secret` | Firma webhook (users, enrollments) |
| **API Key** | Da richiedere al team LMS | Endpoint `/api/eduplan/courses` |

---

## Endpoint Disponibili

| Endpoint | Metodo | Autenticazione | Descrizione |
|----------|--------|----------------|-------------|
| `/api/eduplan/courses` | GET | API Key | Lista corsi disponibili |
| `/api/eduplan/users` | POST | HMAC Signature | Crea utente |
| `/api/eduplan/enrollments` | POST | HMAC Signature | Iscrive utente a corso |
| `/api/eduplan/enrollments` | DELETE | HMAC Signature | Cancella iscrizione |

**Base URL Produzione:** `https://lms.innform.eu/lms`

---

## Flusso Operativo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUSSO EDUPLAN → LMS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RECUPERA CORSI (opzionale, una tantum)                      │
│     GET /api/eduplan/courses                                     │
│     → Ottiene lista corsi con ID                                │
│                                                                  │
│  2. CREA UTENTE                                                 │
│     POST /api/eduplan/users                                      │
│     → LMS crea account con email + password specificata         │
│     → Ritorna: lms_user_id                                      │
│                                                                  │
│  3. ISCRIVI A CORSO                                             │
│     POST /api/eduplan/enrollments                                │
│     → LMS iscrive utente al corso                               │
│     → Ritorna: enrollment_id                                    │
│                                                                  │
│  4. UTENTE FA LOGIN                                             │
│     → Usa email + password fornite da EduPlan                   │
│     → Vede il corso assegnato con progresso 0%                  │
│                                                                  │
│  5. CANCELLA ISCRIZIONE (se necessario)                         │
│     DELETE /api/eduplan/enrollments                              │
│     → LMS rimuove iscrizione                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Ottenere Lista Corsi

Recupera i corsi LMS disponibili per l'integrazione.

### Richiesta

```http
GET https://lms.innform.eu/lms/api/eduplan/courses
```

### Headers

```
x-api-key: <EDUPLAN_API_KEY>
```

### Query Parameters (opzionali)

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `published_only` | `true` | Solo corsi pubblicati |
| `include_modules` | `false` | Include dettagli moduli |
| `limit` | `100` | Numero massimo risultati |
| `offset` | `0` | Offset per paginazione |

### Risposta Successo (200)

```json
{
  "success": true,
  "courses": [
    {
      "id": "course001",
      "title": "Sicurezza sul Lavoro",
      "description": "Corso base sulla sicurezza...",
      "modules_count": 5,
      "enrollments_count": 42,
      "image_url": "https://..."
    },
    {
      "id": "course002",
      "title": "Comunicazione Efficace",
      "description": "...",
      "modules_count": 3,
      "enrollments_count": 28,
      "image_url": "https://..."
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

**Nota:** Salvare gli `id` dei corsi per usarli nelle iscrizioni.

---

## 2. Creare Utente

Crea un nuovo utente nel LMS con credenziali specifiche.

### Richiesta

```http
POST https://lms.innform.eu/lms/api/eduplan/users
```

### Headers

```
Content-Type: application/json
X-TMS-Signature: sha256=<HMAC-SHA256 del body>
X-TMS-Timestamp: <ISO 8601 timestamp>
```

### Body

```json
{
  "email": "mario.rossi@email.com",
  "firstName": "Mario",
  "lastName": "Rossi",
  "password": "SecurePass123!",
  "role": "learner",
  "sendWelcomeEmail": false,
  "metadata": {
    "eduplan_person_id": "550e8400-e29b-41d4-a716-446655440000",
    "source": "eduplan"
  }
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `email` | string | ✅ | Email utente (diventa username) |
| `firstName` | string | ✅ | Nome |
| `lastName` | string | ✅ | Cognome |
| `password` | string | ✅ | Password in chiaro (verrà hashata) |
| `role` | string | ✅ | `"learner"` o `"admin"` |
| `sendWelcomeEmail` | boolean | ❌ | Invia email di benvenuto (default: false) |
| `metadata` | object | ❌ | Dati aggiuntivi per tracciamento |

### Risposta Successo (200)

```json
{
  "success": true,
  "id": "cmk39x3a20001yb2bmrcmmjdh"
}
```

### Risposta Utente Già Esistente (200)

```json
{
  "success": true,
  "id": "cmk39x3a20001yb2bmrcmmjdh",
  "existing": true
}
```

### Errori

| Status | Codice | Descrizione |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Campi obbligatori mancanti |
| 401 | `INVALID_SIGNATURE` | Firma HMAC non valida |
| 429 | `RATE_LIMITED` | Troppe richieste (max 30/min) |

---

## 3. Iscrivere Utente a Corso

Iscrive un utente esistente a un corso specifico.

### Richiesta

```http
POST https://lms.innform.eu/lms/api/eduplan/enrollments
```

### Headers

```
Content-Type: application/json
X-TMS-Signature: sha256=<HMAC-SHA256 del body>
X-TMS-Timestamp: <ISO 8601 timestamp>
```

### Body

```json
{
  "user_email": "mario.rossi@email.com",
  "course_id": "course001",
  "eduplan_enrollment_id": "ep-enroll-550e8400-e29b-41d4",
  "due_date": "2026-03-01T00:00:00Z"
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `user_email` | string | ✅ | Email utente (case-insensitive) |
| `course_id` | string | ✅ | ID corso LMS (da `/api/eduplan/courses`) |
| `eduplan_enrollment_id` | string | ✅ | ID univoco iscrizione su EduPlan |
| `due_date` | string | ❌ | Data scadenza corso (ISO 8601) |

### Risposta Successo - Nuova Iscrizione (201)

```json
{
  "success": true,
  "enrollment_id": "clxyz123abc",
  "message": "User enrolled successfully"
}
```

### Risposta Utente Già Iscritto (200)

```json
{
  "success": true,
  "enrollment_id": "clxyz123abc",
  "existing": true,
  "message": "User already enrolled in this course"
}
```

### Errori

| Status | Codice | Descrizione |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Campi obbligatori mancanti |
| 401 | `INVALID_SIGNATURE` | Firma HMAC non valida |
| 404 | `USER_NOT_FOUND` | Utente non trovato (creare prima con `/users`) |
| 404 | `COURSE_NOT_FOUND` | Corso non trovato o non pubblicato |
| 429 | `RATE_LIMITED` | Troppe richieste (max 30/min) |

---

## 4. Cancellare Iscrizione

Rimuove l'iscrizione di un utente da un corso.

### Richiesta

```http
DELETE https://lms.innform.eu/lms/api/eduplan/enrollments
```

### Headers

```
Content-Type: application/json
X-TMS-Signature: sha256=<HMAC-SHA256 del body>
X-TMS-Timestamp: <ISO 8601 timestamp>
```

### Body (Opzione 1 - per ID EduPlan)

```json
{
  "eduplan_enrollment_id": "ep-enroll-550e8400-e29b-41d4"
}
```

### Body (Opzione 2 - per Email + Corso)

```json
{
  "user_email": "mario.rossi@email.com",
  "course_id": "course001"
}
```

### Risposta Successo (200)

```json
{
  "success": true,
  "message": "Enrollment deleted successfully"
}
```

---

## Autenticazione HMAC

Gli endpoint `/users` e `/enrollments` richiedono firma HMAC-SHA256.

### Come Generare la Firma

```javascript
const crypto = require('crypto');

const SECRET = 'innform-lms-tms-integration-2025-secret';
const body = JSON.stringify(payload);
const timestamp = new Date().toISOString();

const signature = 'sha256=' + crypto
  .createHmac('sha256', SECRET)
  .update(body)
  .digest('hex');

// Headers da inviare:
// X-TMS-Signature: sha256=abc123...
// X-TMS-Timestamp: 2026-01-07T19:30:00.000Z
```

### Esempio Python

```python
import hmac
import hashlib
import json
from datetime import datetime

SECRET = 'innform-lms-tms-integration-2025-secret'
body = json.dumps(payload, separators=(',', ':'))
timestamp = datetime.utcnow().isoformat() + 'Z'

signature = 'sha256=' + hmac.new(
    SECRET.encode(),
    body.encode(),
    hashlib.sha256
).hexdigest()
```

### Validazione Timestamp

- Il timestamp deve essere entro **5 minuti** dall'ora attuale
- Serve per prevenire attacchi di replay
- Usare sempre UTC (formato ISO 8601)

---

## Esempio Completo: Creare Utente e Iscriverlo

### Passo 1: Crea Utente

```bash
# Genera timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Prepara body
BODY='{"email":"mario.rossi@email.com","firstName":"Mario","lastName":"Rossi","password":"SecurePass123!","role":"learner","sendWelcomeEmail":false}'

# Genera firma
SECRET="innform-lms-tms-integration-2025-secret"
SIGNATURE="sha256=$(echo -n $BODY | openssl dgst -sha256 -hmac $SECRET | cut -d' ' -f2)"

# Invia richiesta
curl -X POST "https://lms.innform.eu/lms/api/eduplan/users" \
  -H "Content-Type: application/json" \
  -H "X-TMS-Signature: $SIGNATURE" \
  -H "X-TMS-Timestamp: $TIMESTAMP" \
  -d "$BODY"

# Risposta: {"success":true,"id":"cmk39x3a20001yb2bmrcmmjdh"}
```

### Passo 2: Iscrivi a Corso

```bash
# Genera timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Prepara body
BODY='{"user_email":"mario.rossi@email.com","course_id":"course001","eduplan_enrollment_id":"ep-123"}'

# Genera firma
SIGNATURE="sha256=$(echo -n $BODY | openssl dgst -sha256 -hmac $SECRET | cut -d' ' -f2)"

# Invia richiesta
curl -X POST "https://lms.innform.eu/lms/api/eduplan/enrollments" \
  -H "Content-Type: application/json" \
  -H "X-TMS-Signature: $SIGNATURE" \
  -H "X-TMS-Timestamp: $TIMESTAMP" \
  -d "$BODY"

# Risposta: {"success":true,"enrollment_id":"clxyz123","message":"User enrolled successfully"}
```

### Passo 3: L'utente può fare login

- **URL:** `https://lms.innform.eu/lms/login`
- **Email:** `mario.rossi@email.com`
- **Password:** `SecurePass123!`

---

## FAQ - Domande Frequenti

### L'endpoint /api/eduplan/users esiste ed è attivo?
✅ **Sì**, l'endpoint è attivo e funzionante.

### L'x-api-key è corretta e valida?
L'`x-api-key` è usata **solo** per `GET /api/eduplan/courses`.
Gli altri endpoint usano la firma HMAC (`X-TMS-Signature`).

### Se c'è già x-api-key, serve anche verificare la firma HMAC?
Sono **due sistemi separati**:
- `x-api-key` → Solo per leggere la lista corsi
- `X-TMS-Signature` → Per creare utenti e iscrizioni (più sicuro)

### Su quale body va calcolata la firma?
Sul **body JSON esatto** che viene inviato nella richiesta.
Non modificare il body dopo aver calcolato la firma.

### L'email è case-sensitive?
**No**, le email vengono normalizzate in minuscolo.
`MARIO.ROSSI@EMAIL.COM` = `mario.rossi@email.com`

### Cosa succede se l'utente esiste già?
L'endpoint ritorna `200` con `"existing": true` e l'ID dell'utente esistente.
Non viene generato errore.

### Cosa succede se l'utente è già iscritto al corso?
L'endpoint ritorna `200` con `"existing": true` e l'ID dell'iscrizione esistente.
L'`eduplan_enrollment_id` viene aggiornato se non era presente.

### L'utente vede tutti i corsi o solo quelli assegnati?
Attualmente l'utente vede il **catalogo completo** dei corsi pubblicati.
I corsi a cui è iscritto mostrano il progresso e sono evidenziati.
L'admin LMS può iscrivere l'utente anche ad altri corsi manualmente.

---

## Troubleshooting

### Errore 401 - Invalid webhook signature

1. Verificare che il secret sia esattamente: `innform-lms-tms-integration-2025-secret`
2. Verificare che la firma sia calcolata sul body **raw** (non modificato)
3. Verificare che il timestamp sia entro 5 minuti
4. Verificare il formato: `sha256=<hex>` (tutto lowercase)

### Errore 404 - User not found

L'utente deve essere creato **prima** con `/api/eduplan/users`.
Verificare che l'email sia scritta correttamente.

### Errore 404 - Course not found

1. Verificare che il `course_id` sia corretto (usare `/api/eduplan/courses`)
2. Verificare che il corso sia pubblicato

### Errore 429 - Rate limited

Massimo 30 richieste al minuto per IP.
Attendere e riprovare.

---

## Contatti

Per supporto tecnico sull'integrazione:
- **Team LMS INNFORM:** [inserire contatto]
- **Documentazione:** Questo file

---

*Ultimo aggiornamento: 7 Gennaio 2026*
