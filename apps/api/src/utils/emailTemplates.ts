export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: {
    subject: (name: string) => `Reset your password, ${name}`,
    body: (name: string, otp: string) =>
      `
      <div style="background-color:#050505;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#0B0E11;border:1px solid #2B2F36;border-radius:12px;padding:40px;text-align:left;">
                
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FINX<span style="color:#3772FF;">.</span></span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;line-height:32px;padding-bottom:16px;">Secure Password Reset</h1>
                    <p style="margin:0;font-size:16px;line-height:24px;color:#848E9C;">
                      Hi ${name}, we received a request to access your Finx account. Use the authorization code below to verify your identity.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:32px 0;">
                    <div style="background:#14191F;border:1px solid #2B2F36;border-radius:12px;padding:24px;display:inline-block;min-width:240px;">
                      <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#3772FF;text-transform:uppercase;letter-spacing:1.5px;">Verification Code</p>
                      <span style="font-family:'Courier New', monospace;font-size:36px;font-weight:700;color:#FFFFFF;letter-spacing:8px;">${otp}</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td>
                    <p style="margin:0;font-size:14px;line-height:22px;color:#848E9C;background:#14191F;padding:16px;border-left:3px solid #3772FF;border-radius:4px;">
                      This code expires in <strong style="color:#FFFFFF;">10 minutes</strong>. If you did not request this, please secure your account immediately.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;border-top:1px solid #2B2F36;margin-top:40px;text-align:center;">
                    <p style="font-size:12px;color:#474D57;margin:0 0 8px 0;">&copy; 2026 Finx Africa. All rights reserved.</p>
                    <p style="font-size:11px;color:#474D57;margin:0;">Finx Global is a financial technology company, not a bank. Crypto services are subject to market risk.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `,
  },

  REGISTERED: {
    subject: (name: string) => `Welcome to the future of finance, ${name}`,
    body: (name: string) =>
      `
      <div style="background-color:#050505;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#0B0E11;border:1px solid #2B2F36;border-radius:12px;padding:40px;text-align:left;">
                
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FINX<span style="color:#3772FF;">.</span></span>
                  </td>
                </tr>

                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;color:#FFFFFF;font-size:28px;font-weight:700;line-height:36px;padding-bottom:16px;">Welcome aboard, ${name}</h1>
                    <p style="margin:0;font-size:16px;line-height:26px;color:#848E9C;">
                      Your Finx account is officially active. You are now cleared to send, receive, and grow your assets across local and digital borders.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:40px 0;">
                    <a href="#" style="display:inline-block;background:#3772FF;color:#FFFFFF;padding:16px 40px;border-radius:100px;font-size:15px;font-weight:700;text-decoration:none;box-shadow: 0 4px 15px rgba(55, 114, 255, 0.3);">
                      Explore Dashboard
                    </a>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style="background:#14191F;border:1px solid #2B2F36;border-radius:12px;padding:24px;">
                      <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#FFFFFF;">What's next?</p>
                      <ul style="margin:0;padding:0 0 0 20px;color:#848E9C;font-size:14px;line-height:22px;">
                        <li style="margin-bottom:8px;">Complete your KYC to unlock higher limits.</li>
                        <li style="margin-bottom:8px;">Fund your wallet via Paystack or Crypto.</li>
                        <li>Explore our high-yield investment plans.</li>
                      </ul>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;text-align:center;">
                    <p style="font-size:12px;color:#474D57;margin:0 0 8px 0;">&copy; 2026 Finx Global. All rights reserved.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `,
  },

  PASSWORD_RESET_SUCCESS: {
    subject: (name: string) => `Security Alert: Password Updated, ${name}`,
    body: (name: string) =>
      `
      <div style="background-color:#050505;padding:40px 0;font-family:'Inter', Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#0B0E11;border:1px solid #2B2F36;border-radius:12px;padding:40px;text-align:left;">
                
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FINX<span style="color:#3772FF;">.</span></span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style="text-align:center;padding-bottom:24px;">
                      <div style="display:inline-block;width:48px;height:48px;background:#00C087;border-radius:50%;margin-bottom:16px;">
                        <span style="color:#FFFFFF;font-size:24px;line-height:48px;">✓</span>
                      </div>
                      <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;">Password Updated</h1>
                    </div>
                    <p style="margin:0;font-size:16px;line-height:24px;color:#848E9C;text-align:center;">
                      Hi ${name}, your password was successfully changed. You can now use your new credentials to sign in.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px 0;">
                    <div style="background:#1F1914;border:1px solid #362F2B;border-radius:12px;padding:20px;">
                      <p style="margin:0;font-size:14px;line-height:22px;color:#F0B90B;">
                        <strong>Important:</strong> If you did not authorize this change, someone may be trying to access your account. Please click the button below to lock your account and contact our security team immediately.
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <a href="#" style="font-size:14px;font-weight:600;color:#3772FF;text-decoration:none;">Contact Support →</a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:48px;text-align:center;">
                    <p style="font-size:12px;color:#474D57;margin:0;">&copy; 2026 Finx Africa Security Lab.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
      `,
  },
};
