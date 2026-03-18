import { Resend } from 'resend'

const FROM_EMAIL = 'VOXA <noreply@voxa.com.br>'

/**
 * Notifica o fã por email que sua pergunta foi respondida.
 * Fire-and-forget — não deve bloquear o fluxo de resposta do criador.
 */
export async function sendResponseNotification({
  fanEmail,
  fanName,
  creatorUsername,
}: {
  fanEmail: string
  fanName: string
  creatorUsername: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY não configurada — notificação não enviada')
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://voxa.com.br'

  await resend.emails.send({
    from: FROM_EMAIL,
    to: fanEmail,
    subject: 'Sua pergunta foi respondida! 🎉',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #F58529, #DD2A7B, #8134AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">VOXA</h1>
        </div>

        <p style="font-size: 16px; color: #333; margin-bottom: 8px;">Olá, <strong>${fanName}</strong>!</p>

        <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
          <strong>@${creatorUsername}</strong> acabou de responder sua pergunta na VOXA.
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${appUrl}/perfil/${creatorUsername}"
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F58529, #DD2A7B, #8134AF); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px;">
            Ver resposta
          </a>
        </div>

        <p style="font-size: 13px; color: #999; text-align: center;">
          Se você não fez essa pergunta, pode ignorar este email.
        </p>
      </div>
    `,
  })
}
