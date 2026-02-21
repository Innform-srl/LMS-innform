/**
 * Email templates for deadline reminders
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface ReminderEmailParams {
  userName: string
  courseTitle: string
  dueDate: Date
  courseId: string
}

export const deadlineReminder3Days = ({ userName, courseTitle, dueDate, courseId }: ReminderEmailParams) => ({
  subject: `⏰ Promemoria: ${courseTitle} - Scadenza tra 3 giorni`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .date { font-size: 24px; font-weight: bold; color: #f59e0b; margin: 10px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Promemoria Scadenza Corso</h1>
        </div>
        <div class="content">
          <p>Ciao <strong>${userName}</strong>,</p>
          
          <p>Ti ricordiamo che il corso obbligatorio deve essere completato entro:</p>
          
          <div class="warning-box">
            <h2 style="margin-top: 0;">${courseTitle}</h2>
            <div class="date">${dueDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <p style="margin-bottom: 0;"><strong>Mancano solo 3 giorni!</strong></p>
          </div>
          
          <p>Completa il corso il prima possibile per rispettare la scadenza.</p>
          
          <div style="text-align: center;">
            <a href="${BASE_URL}/courses/${courseId}" class="cta-button">
              Vai al Corso →
            </a>
          </div>
          
          <div class="footer">
            <p>Questa è una email automatica. Non rispondere a questo messaggio.</p>
            <p>LMS INNFORM © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
Ciao ${userName},

Ti ricordiamo che il corso obbligatorio "${courseTitle}" deve essere completato entro:

${dueDate.toLocaleDateString('it-IT')}

Mancano solo 3 giorni!

Vai al corso: ${BASE_URL}/courses/${courseId}

---
LMS INNFORM
  `.trim()
})

export const deadlineReminder1Day = ({ userName, courseTitle, dueDate, courseId }: ReminderEmailParams) => ({
  subject: `🚨 URGENTE: ${courseTitle} - Scadenza DOMANI`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .urgent-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .date { font-size: 28px; font-weight: bold; color: #dc2626; margin: 10px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 URGENTE - Scadenza Imminente</h1>
        </div>
        <div class="content">
          <p>Ciao <strong>${userName}</strong>,</p>
          
          <p><strong>ATTENZIONE:</strong> Il corso obbligatorio scade <strong>DOMANI</strong>!</p>
          
          <div class="urgent-box">
            <h2 style="margin-top: 0;">${courseTitle}</h2>
            <div class="date">${dueDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <p style="margin-bottom: 0; font-size: 18px; color: #dc2626;"><strong>⚠️ ULTIMO GIORNO!</strong></p>
          </div>
          
          <p>Completa il corso <strong>oggi stesso</strong> per evitare inconvenienti.</p>
          
          <div style="text-align: center;">
            <a href="${BASE_URL}/courses/${courseId}" class="cta-button">
              Completa Ora →
            </a>
          </div>
          
          <div class="footer">
            <p>Questa è una email automatica. Non rispondere a questo messaggio.</p>
            <p>LMS INNFORM © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
🚨 URGENTE

Ciao ${userName},

ATTENZIONE: Il corso obbligatorio scade DOMANI!

"${courseTitle}"
Scadenza: ${dueDate.toLocaleDateString('it-IT')}

⚠️ ULTIMO GIORNO!

Completa il corso oggi stesso: ${BASE_URL}/courses/${courseId}

---
LMS INNFORM
  `.trim()
})

export const deadlineOverdue = ({ userName, courseTitle, dueDate, courseId }: ReminderEmailParams) => ({
  subject: `❌ SCADUTO: ${courseTitle} - Azione Richiesta`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .overdue-box { background: #fee2e2; border-left: 4px solid #7f1d1d; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .date { font-size: 24px; font-weight: bold; color: #7f1d1d; margin: 10px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Corso Scaduto</h1>
        </div>
        <div class="content">
          <p>Ciao <strong>${userName}</strong>,</p>
          
          <p>Il corso obbligatorio è <strong>scaduto</strong> e non è stato ancora completato.</p>
          
          <div class="overdue-box">
            <h2 style="margin-top: 0;">${courseTitle}</h2>
            <div class="date">Scaduto il: ${dueDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <p style="margin-bottom: 0; font-size: 18px; color: #7f1d1d;"><strong>❌ SCADUTO</strong></p>
          </div>
          
          <p>Ti preghiamo di completare il corso il prima possibile. Se hai bisogno di un'estensione, contatta il tuo amministratore.</p>
          
          <div style="text-align: center;">
            <a href="${BASE_URL}/courses/${courseId}" class="cta-button">
              Completa Corso →
            </a>
          </div>
          
          <div class="footer">
            <p>Per richieste di estensione, contatta l'amministratore.</p>
            <p>Questa è una email automatica. Non rispondere a questo messaggio.</p>
            <p>LMS INNFORM © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
❌ CORSO SCADUTO

Ciao ${userName},

Il corso obbligatorio è scaduto e non è stato ancora completato.

"${courseTitle}"
Scaduto il: ${dueDate.toLocaleDateString('it-IT')}

Ti preghiamo di completare il corso il prima possibile.

Vai al corso: ${BASE_URL}/courses/${courseId}

Per richieste di estensione, contatta l'amministratore.

---
LMS INNFORM
  `.trim()
})
