export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: {
    subject: (name: string) => `Reset your password, ${name}`,
    body: (name: string, otp: string) =>
      `
      <div style="background-color:#F5F9FF;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #DCE7F7;border-radius:16px;padding:40px;text-align:left;">
                
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#111827;letter-spacing:-0.5px;">FINX<span style="color:#2563EB;">.</span></span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <h1 style="margin:0;color:#111827;font-size:24px;font-weight:700;line-height:32px;padding-bottom:16px;">
                      Password Reset Request
                    </h1>

                    <p style="margin:0;font-size:16px;line-height:26px;color:#4B5563;">
                      Hi ${name}, we received a request to reset your Finx account password.
                      Use the verification code below to continue securely.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:36px 0;">
                    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;padding:24px;display:inline-block;min-width:240px;">
                      <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1.5px;">
                        Verification Code
                      </p>

                      <span style="font-family:'Courier New', monospace;font-size:36px;font-weight:700;color:#111827;letter-spacing:8px;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td>
                    <p style="margin:0;font-size:14px;line-height:24px;color:#4B5563;background:#F9FAFB;padding:16px;border-left:4px solid #2563EB;border-radius:8px;">
                      This code expires in <strong style="color:#111827;">10 minutes</strong>.
                      If you did not request this reset, please secure your account immediately.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;border-top:1px solid #E5E7EB;text-align:center;">
                    <p style="font-size:12px;color:#9CA3AF;margin:0 0 8px 0;">
                      &copy; 2026 Finx Africa. All rights reserved.
                    </p>

                    <p style="font-size:11px;color:#9CA3AF;margin:0;">
                      Finx is a financial technology platform for secure transfers and savings.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `
  },

  REGISTERED: {
    subject: (name: string) => `Welcome to Finx, ${name}`,
    body: (name: string) =>
      `
      <div style="background-color:#F5F9FF;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #DCE7F7;border-radius:16px;padding:40px;text-align:left;">
                
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#111827;letter-spacing:-0.5px;">FINX<span style="color:#2563EB;">.</span></span>
                  </td>
                </tr>

                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;color:#111827;font-size:28px;font-weight:700;line-height:36px;padding-bottom:16px;">
                      Welcome to Finx, ${name}
                    </h1>

                    <p style="margin:0;font-size:16px;line-height:28px;color:#4B5563;">
                      Your account has been successfully created.
                      Finx makes it easy to send money locally, manage your wallet,
                      and grow your savings — all from one secure platform.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:40px 0;">
                    <a href="#" style="display:inline-block;background:#2563EB;color:#FFFFFF;padding:16px 40px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;">
                      Open Dashboard
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;text-align:center;">
                    <p style="font-size:12px;color:#9CA3AF;margin:0;">
                      &copy; 2026 Finx Africa. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `
  },

  PASSWORD_RESET_SUCCESS: {
    subject: (name: string) => `Password updated successfully, ${name}`,
    body: (name: string) =>
      `
      <div style="background-color:#F5F9FF;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #DCE7F7;border-radius:16px;padding:40px;text-align:left;">
                
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#111827;letter-spacing:-0.5px;">FINX<span style="color:#2563EB;">.</span></span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style="text-align:center;padding-bottom:24px;">
                      <div style="display:inline-block;width:52px;height:52px;background:#2563EB;border-radius:50%;margin-bottom:16px;">
                        <span style="color:#FFFFFF;font-size:26px;line-height:52px;">✓</span>
                      </div>

                      <h1 style="margin:0;color:#111827;font-size:24px;font-weight:700;">
                        Password Updated
                      </h1>
                    </div>

                    <p style="margin:0;font-size:16px;line-height:26px;color:#4B5563;text-align:center;">
                      Hi ${name}, your Finx account password was changed successfully.
                      You can now sign in using your new credentials.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px 0;">
                    <div style="background:#FEF3F2;border:1px solid #FECACA;border-radius:14px;padding:20px;">
                      <p style="margin:0;font-size:14px;line-height:24px;color:#B91C1C;">
                        <strong>Security Notice:</strong>
                        If you did not authorize this change, please contact support immediately to secure your account.
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <a href="#" style="font-size:14px;font-weight:700;color:#2563EB;text-decoration:none;">
                      Contact Support →
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;text-align:center;">
                    <p style="font-size:12px;color:#9CA3AF;margin:0;">
                      &copy; 2026 Finx Africa. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `
  },

  TRANSFER: {
    subject: (amount: string | number) => `Transfer Successful — ₦${amount} sent successfully`,

    body: (to: string, amount: string | number, receiversFinxTag: string) =>
      `
      <div style="background-color:#F5F9FF;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #DCE7F7;border-radius:16px;padding:40px;text-align:left;">

                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#111827;">
                      FINX<span style="color:#2563EB;">.</span>
                    </span>
                  </td>
                </tr>

                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;color:#111827;font-size:26px;font-weight:700;padding-bottom:16px;">
                      Transfer Successful
                    </h1>

                    <p style="margin:0;font-size:16px;line-height:28px;color:#4B5563;">
                      Your transfer has been completed successfully.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:36px 0;">
                    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:16px;padding:28px;min-width:280px;display:inline-block;">
                      
                      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1px;">
                        Amount Sent
                      </p>

                      <h2 style="margin:0;color:#111827;font-size:36px;font-weight:800;">
                        ₦${amount}
                      </h2>

                    </div>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:22px;">
                      
                      <p style="margin:0 0 12px 0;font-size:14px;color:#4B5563;">
                        <strong style="color:#111827;">Recipient:</strong> ${to}
                      </p>

                      <p style="margin:0;font-size:14px;color:#4B5563;">
                        <strong style="color:#111827;">Finx Tag:</strong> ${receiversFinxTag}
                      </p>

                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;text-align:center;">
                    <p style="font-size:12px;color:#9CA3AF;margin:0;">
                      &copy; 2026 Finx Africa. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `
  },

  DEPOSIT: {
    subject: (amount: string | number) => `Wallet funded successfully — ₦${amount}`,

    body: (to: string, amount: string | number) =>
      `
      <div style="background-color:#F5F9FF;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #DCE7F7;border-radius:16px;padding:40px;text-align:left;">

                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#111827;">
                      FINX<span style="color:#2563EB;">.</span>
                    </span>
                  </td>
                </tr>

                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;color:#111827;font-size:26px;font-weight:700;padding-bottom:16px;">
                      Wallet Funded Successfully
                    </h1>

                    <p style="margin:0;font-size:16px;line-height:28px;color:#4B5563;">
                      Hi ${to}, your wallet has been credited successfully.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:36px 0;">
                    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:16px;padding:28px;min-width:280px;display:inline-block;">
                      
                      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1px;">
                        Amount Deposited
                      </p>

                      <h2 style="margin:0;color:#111827;font-size:36px;font-weight:800;">
                        ₦${amount}
                      </h2>

                    </div>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:22px;">
                      <p style="margin:0;font-size:14px;line-height:24px;color:#4B5563;">
                        Your funds are now available in your Finx wallet and ready for transfers or savings.
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;text-align:center;">
                    <p style="font-size:12px;color:#9CA3AF;margin:0;">
                      &copy; 2026 Finx Africa. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `
  }
};
