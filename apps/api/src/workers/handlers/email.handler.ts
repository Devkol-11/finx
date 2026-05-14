import { env } from '../../config/env';
import { appConfig } from '../../config/app.config';
import type { Resend as ResendType } from 'resend';
import { Resend } from 'resend';

const apiKey = appConfig.isDev ? env.RESEND_SANDBOX_API_KEY : env.RESEND_PRODUCTION_API_KEY;
const resend: ResendType = new Resend(apiKey);

export type EmailJobPayload = {
  to: string;
  subject: string;
  body: string;
};

export async function handleEmailJob(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid email job payload');
  }

  const payload = input as EmailJobPayload;

  if (typeof payload.to !== 'string' || payload.to.trim() === '' || typeof payload.subject !== 'string' || typeof payload.body !== 'string') {
    throw new Error('Invalid email job payload');
  }

  const sender = appConfig.isDev ? 'onboarding@resend.dev' : 'noreply@yourdomain.com'; 
  const receiver = appConfig.isDev ? 'bethelcollins100@gmail.com' : payload.to;

  const { data, error } = await resend.emails.send({
    from: sender,
    to: [receiver],
    subject: payload.subject,
    html: payload.body
  });

  if (error) {
    console.error('[EMAIL ERROR]', error);
    throw new Error('Failed to send email');
  }

  console.log('[EMAIL SENT]', {
    id: data?.id,
    to: receiver,
    subject: payload.subject
  });

  return {
    status: 'sent',
    to: receiver
  };
}
