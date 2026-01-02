/**
 * Email Templates per Reminder Scadenze
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export interface ReminderEmailData {
    userName: string
    courseTitle: string
    dueDate: Date
    courseId: string
}

/**
 * Template: Reminder 3 giorni prima della scadenza
 */
export const deadlineReminder3Days = (data: ReminderEmailData) => {
    const dueDateStr = data.dueDate.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return {
        subject: `⏰ Promemoria: ${data.courseTitle} - Scadenza tra 3 giorni`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 INNFORM LMS</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #f59e0b; margin-top: 0;">⏰ Promemoria Scadenza Corso</h2>
        
        <p style="font-size: 16px;">Ciao <strong>${data.userName}</strong>,</p>
        
        <p style="font-size: 16px;">Ti ricordiamo che il corso obbligatorio deve essere completato entro:</p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Corso:</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">${data.courseTitle}</p>
            
            <p style="margin: 0; font-size: 14px; color: #666;">Scadenza:</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #f59e0b;">${dueDateStr}</p>
        </div>
        
        <p style="font-size: 18px; text-align: center; color: #f59e0b; font-weight: bold;">
            ⚠️ Mancano solo 3 giorni!
        </p>
        
        <p style="font-size: 16px;">Non perdere tempo, completa il corso oggi stesso per evitare ritardi.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/courses/${data.courseId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Vai al Corso →
            </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Questa è una email automatica. Per assistenza, contatta il supporto.
        </p>
    </div>
</body>
</html>
        `
    }
}

/**
 * Template: Reminder 1 giorno prima della scadenza
 */
export const deadlineReminder1Day = (data: ReminderEmailData) => {
    const dueDateStr = data.dueDate.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return {
        subject: `🚨 URGENTE: ${data.courseTitle} - Scadenza DOMANI!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 INNFORM LMS</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #dc2626; margin-top: 0;">🚨 SCADENZA IMMINENTE!</h2>
        
        <p style="font-size: 16px;">Ciao <strong>${data.userName}</strong>,</p>
        
        <p style="font-size: 16px; color: #dc2626; font-weight: bold;">
            ⚠️ ATTENZIONE: Il corso obbligatorio scade DOMANI!
        </p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Corso:</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">${data.courseTitle}</p>
            
            <p style="margin: 0; font-size: 14px; color: #666;">Scadenza:</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #dc2626;">${dueDateStr}</p>
        </div>
        
        <p style="font-size: 20px; text-align: center; color: #dc2626; font-weight: bold; background: #fee2e2; padding: 15px; border-radius: 5px;">
            🔴 Rimane meno di 24 ore!
        </p>
        
        <p style="font-size: 16px;">Completa il corso ORA per rispettare la scadenza obbligatoria.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/courses/${data.courseId}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Completa Ora →
            </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Questa è una email automatica. Per assistenza, contatta il supporto.
        </p>
    </div>
</body>
</html>
        `
    }
}

/**
 * Template: Notifica corso scaduto
 */
export const deadlineOverdue = (data: ReminderEmailData) => {
    const dueDateStr = data.dueDate.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return {
        subject: `❌ ${data.courseTitle} - Corso SCADUTO`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 INNFORM LMS</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #991b1b; margin-top: 0;">❌ Corso Scaduto</h2>
        
        <p style="font-size: 16px;">Ciao <strong>${data.userName}</strong>,</p>
        
        <p style="font-size: 16px; color: #991b1b; font-weight: bold;">
            Il termine per completare il corso obbligatorio è scaduto.
        </p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #991b1b; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Corso:</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">${data.courseTitle}</p>
            
            <p style="margin: 0; font-size: 14px; color: #666;">Scadenza era:</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #991b1b;">${dueDateStr}</p>
        </div>
        
        <p style="font-size: 16px; background: #fee2e2; padding: 15px; border-radius: 5px; border-left: 4px solid #991b1b;">
            <strong>Azione Richiesta:</strong> Ti preghiamo di completare il corso il prima possibile. 
            Se hai bisogno di un'estensione della scadenza, contatta il tuo manager o il supporto.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/courses/${data.courseId}" style="display: inline-block; background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Completa il Corso
            </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Questa è una email automatica. Per assistenza, contatta il supporto.
        </p>
    </div>
</body>
</html>
        `
    }
}
