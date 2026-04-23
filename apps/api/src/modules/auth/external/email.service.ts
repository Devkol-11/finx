/**
 * Minimal email delivery contract for the Auth module.
 *
 * This is intentionally tiny so it can be replaced later with a real provider
 * such as SES, SendGrid, or an internal notification pipeline without changing
 * service-layer behavior.
 */
export interface EmailService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

export class ConsoleEmailService implements EmailService {
  public async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Placeholder side effect until a real provider is integrated.
    console.log(`Sending Reset Email to ${email} with token ${token}`);
  }
}
