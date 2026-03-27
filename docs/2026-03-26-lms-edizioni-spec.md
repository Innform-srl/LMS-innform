# LMS Innform — Supporto Edizioni (Edizioni/Classi)

## Contesto

SafeInnform gestisce: **Corso Catalogo → Edizione → Classe → Iscrizioni**.
LMS Innform gestisce: **Corso → Iscrizioni** (flat, nessun concetto di edizione).

Quando SafeInnform crea l'edizione 12 di "formazione_dirigenti", tutti gli allievi finiscono nello stesso corso LMS senza distinzione tra edizioni. Questo impedisce:
- Tracciamento separato per edizione
- Certificati per edizione
- Report distinti per classe/periodo
- Iscrizione dello stesso allievo a edizioni diverse dello stesso corso

## Soluzione: Modello Edition nel LMS

Creare un'entità `Edition` che si interpone tra Course e Enrollment.

```
PRIMA:  Course → Enrollment → User
DOPO:   Course → Edition → Enrollment → User
```

Il **Course** diventa il template (struttura moduli, contenuti).
L'**Edition** rappresenta un'erogazione specifica (periodo, classe, iscritti separati).

---

## 1. Schema Prisma — Modifiche

### 1.1 Nuovo modello Edition

```prisma
model Edition {
  id              String       @id @default(cuid())
  courseId         String
  course           Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)

  // Identificazione
  code             String       // "FD_1_ED12", codice univoco
  title            String       // "Formazione Dirigenti — Ed. 12"
  description      String?

  // Periodo
  startDate        DateTime?
  endDate          DateTime?

  // Stato
  status           String       @default("planned") // planned, open, in_progress, completed, cancelled
  published        Boolean      @default(false)

  // Capacita
  maxParticipants  Int          @default(30)

  // TMS Integration
  tmsEditionId     String?      // SafeInnform edizione_id
  tmsClasseId      String?      // SafeInnform classe_id
  tmsSyncedAt      DateTime?

  // Timestamps
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  // Relazioni
  enrollments      Enrollment[]
  classRegisters   ClassRegister[]

  @@unique([courseId, code])
  @@index([courseId, status])
  @@index([tmsEditionId])
  @@index([startDate, endDate])
}
```

### 1.2 Modifiche al modello Enrollment

```prisma
model Enrollment {
  id              String    @id @default(cuid())
  userId          String
  courseId         String
  editionId       String?   // ← NUOVO (nullable per retrocompatibilita)

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  course          Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  edition         Edition?  @relation(fields: [editionId], references: [id], onDelete: SetNull) // ← NUOVO

  // ... campi esistenti invariati ...

  // MODIFICA unique constraint
  @@unique([userId, courseId, editionId])  // ← ERA [userId, courseId]
  // Questo permette: stesso utente iscritto a edizioni diverse dello stesso corso
}
```

### 1.3 Modifiche al modello Course

```prisma
model Course {
  // ... campi esistenti invariati ...

  // NUOVA relazione
  editions        Edition[]

  // ... relazioni esistenti invariate ...
}
```

### 1.4 Modifiche al modello ClassRegister

```prisma
model ClassRegister {
  // ... campi esistenti ...
  editionId       String?   // ← NUOVO (collega al registro d'aula)
  edition         Edition?  @relation(fields: [editionId], references: [id])
  // il campo editionCode esistente rimane per retrocompatibilita
}
```

---

## 2. Migration SQL

```sql
-- 1. Crea tabella Edition
CREATE TABLE "Edition" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'planned',
  "published" BOOLEAN NOT NULL DEFAULT false,
  "maxParticipants" INTEGER NOT NULL DEFAULT 30,
  "tmsEditionId" TEXT,
  "tmsClasseId" TEXT,
  "tmsSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Edition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Edition_courseId_fkey" FOREIGN KEY ("courseId")
    REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Edition_courseId_code_key" ON "Edition"("courseId", "code");
CREATE INDEX "Edition_courseId_status_idx" ON "Edition"("courseId", "status");
CREATE INDEX "Edition_tmsEditionId_idx" ON "Edition"("tmsEditionId");
CREATE INDEX "Edition_startDate_endDate_idx" ON "Edition"("startDate", "endDate");

-- 2. Aggiungi editionId a Enrollment
ALTER TABLE "Enrollment" ADD COLUMN "editionId" TEXT;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_editionId_fkey"
  FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Enrollment_editionId_idx" ON "Enrollment"("editionId");

-- 3. Modifica unique constraint di Enrollment
--    Prima: (userId, courseId)
--    Dopo:  (userId, courseId, editionId)
--    ATTENZIONE: editionId e' nullable, quindi due enrollment con editionId=NULL
--    sono considerati uguali da Postgres. Usiamo un partial unique index.
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_userId_courseId_key";
CREATE UNIQUE INDEX "Enrollment_userId_courseId_editionId_key"
  ON "Enrollment"("userId", "courseId", "editionId")
  WHERE "editionId" IS NOT NULL;
CREATE UNIQUE INDEX "Enrollment_userId_courseId_legacy_key"
  ON "Enrollment"("userId", "courseId")
  WHERE "editionId" IS NULL;

-- 4. Aggiungi editionId a ClassRegister (opzionale)
ALTER TABLE "ClassRegister" ADD COLUMN "editionId" TEXT;
ALTER TABLE "ClassRegister" ADD CONSTRAINT "ClassRegister_editionId_fkey"
  FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 3. API EduPlan — Modifiche

### 3.1 NUOVO: POST /api/eduplan/editions

Crea un'edizione per un corso. Chiamato da SafeInnform quando si crea una classe.

```typescript
// File: app/api/eduplan/editions/route.ts

// POST body:
{
  course_id: string,          // LMS course ID
  code: string,               // "FD_1_ED12"
  title: string,              // "Formazione Dirigenti — Ed. 12"
  description?: string,
  start_date?: string,        // ISO
  end_date?: string,          // ISO
  max_participants?: number,
  status?: string,            // "planned" | "open" | "in_progress"
  published?: boolean,
  tms_edition_id?: string,    // SafeInnform edizione UUID
  tms_classe_id?: string      // SafeInnform classe UUID
}

// Response:
{
  success: true,
  id: string,                 // LMS edition ID
  code: string,
  title: string,
  course_id: string
}
```

Autenticazione: HMAC-SHA256 (come gli altri endpoint eduplan).

### 3.2 NUOVO: GET /api/eduplan/editions?course_id={id}

Lista edizioni di un corso.

```typescript
// Response:
{
  success: true,
  data: {
    editions: [
      {
        id: string,
        code: string,
        title: string,
        status: string,
        startDate: string,
        endDate: string,
        maxParticipants: number,
        totalEnrollments: number,
        tmsEditionId: string | null,
        tmsClasseId: string | null
      }
    ]
  }
}
```

Autenticazione: API Key (come GET /api/eduplan/courses).

### 3.3 MODIFICA: POST /api/eduplan/enrollments

Aggiungere campo opzionale `edition_id`.

```typescript
// Body ATTUALE:
{
  user_email: string,
  course_id: string,
  eduplan_enrollment_id: string
}

// Body NUOVO:
{
  user_email: string,
  course_id: string,
  edition_id?: string,        // ← NUOVO: LMS edition ID
  eduplan_enrollment_id: string,
  due_date?: string
}
```

Logica:
- Se `edition_id` fornito: crea enrollment con editionId, verifica che edition esista e appartenga al corso
- Se `edition_id` non fornito: comportamento invariato (retrocompatibile), enrollment senza edizione
- Unique check: `(userId, courseId, editionId)` invece di `(userId, courseId)`

### 3.4 MODIFICA: GET /api/eduplan/enrollments

Aggiungere filtro opzionale `edition_id`.

```typescript
// Query params NUOVI:
?edition_id={id}              // Filtra per edizione specifica
?include_edition=true         // Include dati edizione nella risposta

// Response enrollment arricchita:
{
  // ... campi esistenti ...
  edition_id: string | null,
  edition_code: string | null,
  edition_title: string | null
}
```

### 3.5 MODIFICA: GET /api/eduplan/courses

Aggiungere opzione per includere edizioni.

```typescript
// Query params NUOVI:
?include_editions=true

// Ogni corso nel response include:
{
  // ... campi esistenti ...
  editions: [
    { id, code, title, status, startDate, endDate, totalEnrollments }
  ]
}
```

---

## 4. Pagine Admin LMS — Modifiche

### 4.1 Dettaglio Corso → Tab Edizioni

**File:** `app/admin/courses/[courseId]/page.tsx`

Aggiungere una sezione/tab "Edizioni" sotto i moduli:

```
[Corso: formazione_dirigenti]
  |
  ├── Moduli del Corso (struttura condivisa)
  │     └── Modulo 1: I concetti fondanti della Sicurezza
  │
  └── Edizioni
        ├── Ed. 12 — 2026-04-02 → 2026-04-25 — 2 iscritti — Aperta
        ├── Ed. 11 — 2026-03-27 → 2026-04-17 — 2 iscritti — Aperta
        └── [+ Nuova Edizione]
```

Ogni edizione mostra:
- Codice, titolo, periodo
- Numero iscritti / max partecipanti
- Stato (badge colorato)
- Link al dettaglio edizione

### 4.2 NUOVA Pagina: Dettaglio Edizione

**File:** `app/admin/courses/[courseId]/editions/[editionId]/page.tsx`

Contenuto:
- Header con info edizione (codice, periodo, stato)
- Lista iscritti dell'edizione (con progresso, stato, certificato)
- Azioni: Cambia stato, Iscrivi allievo, Rimuovi allievo
- Link al Registro d'Aula (se esiste)

### 4.3 Assegnazioni → Scelta Edizione

**File:** `app/admin/courses/[courseId]/course-assignments.tsx`

Quando si iscrive un utente:
- Se il corso ha edizioni → mostrare dropdown "Seleziona edizione"
- Se il corso NON ha edizioni → comportamento attuale

---

## 5. Pagine Studente — Modifiche

### 5.1 Accesso Corso

**File:** `app/courses/[courseId]/page.tsx`

Modifica minima:
- Se l'utente ha enrollment con editionId → mostrare info edizione
- Se l'utente ha enrollment multipli (edizioni diverse) → mostrare selettore
- Il CoursePlayer resta invariato (i moduli sono del corso, non dell'edizione)

### 5.2 Dashboard Studente

Se lo studente e' iscritto a piu' edizioni dello stesso corso, mostrare come entry separate.

---

## 6. Certificati — Modifiche

### 6.1 Numero Certificato

Includere codice edizione: `CERT-2026-FD1ED12-000001`

### 6.2 Generazione

Il certificato e' gia' legato all'enrollment. Se l'enrollment ha editionId, includere nel certificato PDF:
- Nome edizione
- Periodo
- Codice edizione

Nessuna modifica strutturale necessaria al modello Certificate.

---

## 7. Analytics — Modifiche

### 7.1 Report per Edizione

Nuovi filtri nei report:
- Completamento per edizione
- Tempo medio per edizione
- Confronto tra edizioni dello stesso corso

### 7.2 Query modificate

Le query esistenti che raggruppano per `courseId` dovrebbero poter raggruppare anche per `editionId`.

---

## 8. Retrocompatibilita

Tutte le modifiche sono **additive**:
- `editionId` e' nullable → enrollment esistenti continuano a funzionare
- Le API accettano `edition_id` come opzionale
- Le pagine admin mostrano edizioni solo se esistono
- I corsi senza edizioni funzionano esattamente come prima

---

## 9. Ordine di Implementazione

### Fase 1: Schema e Migration (priorita' massima)
1. Aggiungere modello Edition a schema.prisma
2. Modificare Enrollment (aggiungere editionId, modificare unique)
3. Eseguire migration
4. Verificare che nulla si rompa (tutti i test passano)

### Fase 2: API EduPlan (priorita' alta)
1. POST /api/eduplan/editions — crea edizione
2. GET /api/eduplan/editions — lista edizioni
3. Modificare POST /api/eduplan/enrollments — accetta edition_id
4. Modificare GET /api/eduplan/enrollments — filtra per edition_id
5. Modificare GET /api/eduplan/courses — include edizioni

### Fase 3: Admin UI (priorita' media)
1. Tab Edizioni nel dettaglio corso
2. Pagina dettaglio edizione
3. Selettore edizione nelle assegnazioni

### Fase 4: Studente + Certificati (priorita' bassa)
1. Mostrare info edizione nel corso
2. Gestire enrollment multipli
3. Edizione nel certificato

### Fase 5: Analytics
1. Filtri per edizione nei report
2. Confronto tra edizioni

---

## 10. Impatto su SafeInnform (dopo implementazione LMS)

Dopo che il LMS supporta le edizioni, SafeInnform dovra':

1. **createClasse** → chiamare POST /api/eduplan/editions per creare l'edizione LMS
2. **iscriviAllievo** → passare `edition_id` nella chiamata a enroll-lms
3. **Edge Function enroll-lms** → inoltrare `edition_id` al POST /api/eduplan/enrollments
4. **Tabella corsi_edizioni** → salvare `lms_edition_id` (gia' previsto il campo `lms_session_id`)
5. **sync-moduli-lms** → i moduli restano legati al corso, non all'edizione (nessuna modifica)

---

## 11. Schema Riassuntivo

```
LMS PRIMA:
  Course ──< Enrollment ──> User
    |
    └──< Module ──< ModuleProgress ──> User

LMS DOPO:
  Course ──< Edition ──< Enrollment ──> User
    |            |
    |            └──< ClassRegister
    |
    └──< Module ──< ModuleProgress ──> User
```

I **moduli restano legati al corso** (template condiviso).
Le **iscrizioni passano per l'edizione** (tracciamento separato).
Il **progresso moduli resta legato a user+module** (non serve duplicare per edizione perche' ogni edizione ha enrollment separati, e il progresso e' gia' implicitamente separato).

**NOTA IMPORTANTE su ModuleProgress:**
Attualmente `@@unique([userId, moduleId])` permette un solo record di progresso per utente per modulo. Se lo stesso utente si iscrive a due edizioni dello stesso corso (raro ma possibile per aggiornamenti), serve aggiungere `enrollmentId` o `editionId` a ModuleProgress:

```prisma
model ModuleProgress {
  // ... campi esistenti ...
  editionId    String?   // ← AGGIUNGERE se serve multi-edizione per stesso utente

  @@unique([userId, moduleId, editionId])  // ← MODIFICARE
}
```

Questa modifica va valutata: se un allievo non si iscrive MAI a due edizioni dello stesso corso, si puo' omettere.
