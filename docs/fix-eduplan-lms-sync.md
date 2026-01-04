# Guida: Fix Sincronizzazione EduPlan → LMS

## Problema Riscontrato

Quando un utente veniva eliminato da un corso su EduPlan, **non veniva eliminato automaticamente dal LMS**. L'utente rimaneva visibile nella sezione "Gestione Utenti" del LMS anche dopo la cancellazione da EduPlan.

## Diagnosi

### 1. Verifica dei Webhook

Abbiamo controllato la tabella `WebhookEvent` nel database per vedere se EduPlan stava inviando i webhook:

```javascript
const webhooks = await prisma.webhookEvent.findMany({
  where: { eventType: 'enrollment_cancelled' },
  orderBy: { createdAt: 'desc' }
});
```

**Risultato**: I webhook `enrollment_cancelled` venivano ricevuti correttamente, ma la risposta era sempre:
```json
{
  "message": "Course not found, nothing to cancel"
}
```

### 2. Analisi del Payload

Abbiamo scoperto che EduPlan inviava questo payload:
```json
{
  "event": "enrollment_cancelled",
  "data": {
    "user": { "email": "FEDEABRU@YAHOO.IT" },
    "enrollment_id": "d068d42e-b26d-41de-a897-1dbe03c11d63",
    "reason": "Deleted from EduPlan"
  }
}
```

**Il problema**: EduPlan **non inviava i dati del corso** (`course.lms_course_id` o `course.title`), solo l'`enrollment_id`.

### 3. Il Bug nel Codice

Il vecchio codice in `app/api/webhooks/tms/route.ts` cercava di trovare il corso usando dati che non esistevano:

```typescript
// VECCHIO CODICE (non funzionante)
const dbCourse = await db.course.findFirst({
  where: {
    OR: [
      { id: course?.lms_course_id },  // undefined!
      { title: course?.title },        // undefined!
    ],
  },
});

if (!dbCourse) {
  return { success: true, data: { message: 'Course not found, nothing to cancel' } };
}
```

## Soluzione

### Modifica del Webhook Handler

Abbiamo modificato `handleEnrollmentCancelled` in `app/api/webhooks/tms/route.ts` per:

1. **Cercare prima l'enrollment tramite `tmsEnrollmentId`** (l'ID che EduPlan invia)
2. **Come fallback**, cercare usando i dati del corso (se presenti)
3. **Eliminare l'utente** se non ha più iscrizioni EduPlan

```typescript
// NUOVO CODICE (funzionante)
async function handleEnrollmentCancelled(payload: TMSEnrollmentPayload) {
  const { user, course, enrollment_id } = payload;

  // Trova l'utente
  const dbUser = await db.user.findUnique({
    where: { email: user.email.toLowerCase() },
    include: {
      enrollments: {
        where: { tmsEnrollmentId: { not: null } },
        select: { id: true, courseId: true, tmsEnrollmentId: true }
      }
    }
  });

  // 1. Cerca enrollment per tmsEnrollmentId (più affidabile)
  let enrollmentToDelete = await db.enrollment.findFirst({
    where: {
      userId: dbUser.id,
      tmsEnrollmentId: enrollment_id,  // Usa l'ID di EduPlan!
    }
  });

  // 2. Fallback: cerca per corso (se i dati sono presenti)
  if (!enrollmentToDelete && course) {
    // ... codice fallback
  }

  // 3. Elimina enrollment e utente se necessario
  if (enrollmentToDelete) {
    await db.enrollment.delete({ where: { id: enrollmentToDelete.id } });

    // Se non ha più iscrizioni EduPlan, elimina l'utente
    if (remainingEduPlanEnrollments === 0) {
      await db.user.delete({ where: { id: dbUser.id } });
    }
  }
}
```

## Deploy

Il LMS è hostato su **Vercel**, che riceve i webhook da EduPlan. Dopo aver modificato il codice:

```bash
git add app/api/webhooks/tms/route.ts
git commit -m "Fix enrollment cancellation webhook - use tmsEnrollmentId lookup"
git push
```

Vercel ha fatto il deploy automatico e il fix è andato in produzione.

## Flusso Finale

```
┌─────────────┐     webhook      ┌─────────────┐
│   EduPlan   │ ───────────────► │  LMS Vercel │
│             │  enrollment_     │             │
│  Cancella   │  cancelled +     │  Trova      │
│  utente     │  enrollment_id   │  enrollment │
│  dal corso  │                  │  per ID     │
└─────────────┘                  └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │  Elimina    │
                                 │  enrollment │
                                 │  e utente   │
                                 └─────────────┘
```

## Test

1. Iscrivi un utente al corso collegato al LMS da EduPlan
2. L'utente appare nel LMS
3. Cancella l'utente dal corso su EduPlan
4. L'utente viene automaticamente eliminato dal LMS

## File Modificati

- `app/api/webhooks/tms/route.ts` - Handler `handleEnrollmentCancelled`

## Lezioni Apprese

1. **Verificare sempre il payload effettivo** che arriva dai sistemi esterni
2. **Non assumere** che tutti i campi siano presenti - EduPlan non invia i dati del corso nella cancellazione
3. **Usare identificatori univoci** (`tmsEnrollmentId`) invece di cercare per attributi derivati
4. **Controllare i log del database** (`WebhookEvent`) per debuggare i webhook

## Data Fix

- **Data**: 4 Gennaio 2026
- **Commit**: `e8eee6b` - "Fix enrollment cancellation webhook - use tmsEnrollmentId lookup"
