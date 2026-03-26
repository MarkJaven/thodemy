/**
 * MFA Email Template
 * Light-mode base that Gmail auto-darkens beautifully in dark mode.
 * Uses Thodemy purple (#7C5CFF) accent branding.
 * @module templates/mfaEmail
 */

const buildMfaEmail = ({ code, firstName, expiresMinutes }) => {
  const name = firstName || "there";
  const digits = code.split("");

  const digitBox = (d) =>
    `<td style="padding:0 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="48" height="56" align="center" valign="middle" bgcolor="#F0ECFF" style="width:48px;height:56px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#2D1B6E;background-color:#F0ECFF;border:2px solid #7C5CFF;border-radius:12px;">
            ${d}
          </td>
        </tr>
      </table>
    </td>`;

  const leftDigits = digits.slice(0, 3).map(digitBox).join("");
  const rightDigits = digits.slice(3).map(digitBox).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Thodemy Verification Code</title>
</head>
<body bgcolor="#EEEDF5" style="margin:0;padding:0;background-color:#EEEDF5;font-family:Arial,Helvetica,sans-serif;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#EEEDF5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your Thodemy sign-in verification code &#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEEDF5" style="background-color:#EEEDF5;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://jpgerwmjhtjhcpjvdiut.supabase.co/storage/v1/object/public/avatars/public/logo-thodemy.png" alt="Thodemy" width="140" style="display:block;height:auto;border:0;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;">

                <!-- Purple accent bar -->
                <tr>
                  <td bgcolor="#7C5CFF" height="4" style="height:4px;background-color:#7C5CFF;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:32px 32px 28px;">

                    <!-- Shield + Title -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-bottom:18px;">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;width:44px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td bgcolor="#F0ECFF" width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;text-align:center;background-color:#F0ECFF;border-radius:12px;font-size:20px;">
                                &#128737;&#65039;
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#1A1A2E;">
                            Verification Code
                          </p>
                          <p style="margin:2px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7C5CFF;">
                            Sign-in security check
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#EEEDF5" height="1" style="height:1px;background-color:#EEEDF5;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Greeting -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:18px 0 22px;">
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A5E;line-height:1.7;">
                            Hey <strong style="color:#1A1A2E;">${name}</strong>, someone is trying to sign in to your Thodemy account. Use the code below to complete the process.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Code Container -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#F7F5FF" style="background-color:#F7F5FF;border:1px solid #E8E2FF;border-radius:14px;padding:24px 16px;text-align:center;">

                          <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7C5CFF;">
                            Your code
                          </p>

                          <!-- Digits -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                            <tr>
                              ${leftDigits}
                              <td style="width:14px;text-align:center;vertical-align:middle;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                                  <tr>
                                    <td bgcolor="#7C5CFF" width="6" height="6" style="width:6px;height:6px;background-color:#7C5CFF;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td>
                                  </tr>
                                </table>
                              </td>
                              ${rightDigits}
                            </tr>
                          </table>

                          <!-- Timer -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0;">
                            <tr>
                              <td style="vertical-align:middle;padding-right:6px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td bgcolor="#7C5CFF" width="6" height="6" style="width:6px;height:6px;background-color:#7C5CFF;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td>
                                  </tr>
                                </table>
                              </td>
                              <td style="vertical-align:middle;">
                                <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:#7C5CFF;">Expires in ${expiresMinutes} minutes</span>
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td height="14" style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>

                    <!-- Warning -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#FFF8F0" style="background-color:#FFF8F0;border:1px solid #FFE8CC;border-radius:10px;padding:14px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align:top;padding-right:10px;padding-top:1px;">
                                <span style="font-size:15px;">&#9888;&#65039;</span>
                              </td>
                              <td>
                                <p style="margin:0 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#1A1A2E;">
                                  Don't share this code.
                                </p>
                                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5E4B;line-height:1.5;">
                                  Thodemy will never ask for your verification code via phone, SMS, or any other channel.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#D0CDD8" width="4" height="4" style="width:4px;height:4px;background-color:#D0CDD8;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                  <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#D0CDD8" width="4" height="4" style="width:4px;height:4px;background-color:#D0CDD8;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                  <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#D0CDD8" width="4" height="4" style="width:4px;height:4px;background-color:#D0CDD8;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                </tr>
              </table>

              <p style="margin:14px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8B8B9E;line-height:1.6;">
                This is an automated security email from <strong style="color:#4A4A5E;">Thodemy</strong>.
              </p>
              <p style="margin:4px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#A8A8B8;line-height:1.6;">
                If you didn't try to sign in, you can safely ignore this email.
              </p>
              <p style="margin:18px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#C8C8D4;">
                &copy; ${new Date().getFullYear()} Thodemy &mdash; Secure employee training platform
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
};

module.exports = { buildMfaEmail };
