/**
 * CamTrust Email Service
 * Sends PDF progress reports to the project owner via email.
 */
import nodemailer from 'nodemailer';

/**
 * Creates an SMTP transporter.
 * Configure via environment variables:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
 *   or it will use a Ethereal test account in development.
 */
async function getTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fall back to Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  console.log('Email test account:', testAccount.user, '/ Preview: https://ethereal.email/messages');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Sends a progress report email to the project owner.
 * @param {Object} opts
 * @param {string} opts.toEmail - Recipient email address
 * @param {string} opts.toName  - Recipient name
 * @param {string} opts.projectTitle
 * @param {string} opts.engineerName
 * @param {number} opts.progressPercentage
 * @param {string} opts.summary
 * @param {Buffer|null} opts.pdfBuffer  - PDF as Buffer (optional)
 * @param {string} opts.pdfFileName
 */
export async function sendReportEmail({ toEmail, toName, projectTitle, engineerName, progressPercentage, summary, pdfBuffer, pdfFileName }) {
  try {
    const transporter = await getTransporter();

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: pdfFileName || 'CamTrust_Progress_Report.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const info = await transporter.sendMail({
      from: `"CamTrust Platform" <${process.env.EMAIL_USER || 'noreply@camtrust.com'}>`,
      to: `"${toName}" <${toEmail}>`,
      subject: `📋 New Construction Progress Report: ${projectTitle} (${progressPercentage}% Complete)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: #0f172a; color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
            <div style="font-size: 28px; font-weight: 900; color: white;">🏗️ CAMTRUST</div>
            <div style="font-size: 12px; color: #f97316; font-weight: bold; margin-top: 4px;">VERIFIED SITE MONITORING SYSTEM</div>
          </div>

          <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <p style="font-size: 14px; color: #64748b;">Dear ${toName},</p>
            
            <p style="font-size: 14px; color: #334155;">
              A new official construction progress report has been submitted for your project:
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <div style="font-size: 18px; font-weight: 900; color: #0f172a;">${projectTitle}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Supervised by: <strong>${engineerName}</strong> ✓ Verified Professional</div>
              
              <div style="margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 4px;">
                  <span>Overall Progress</span>
                  <span style="color: #f97316; font-weight: bold;">${progressPercentage}%</span>
                </div>
                <div style="background: #e2e8f0; border-radius: 99px; height: 8px; overflow: hidden;">
                  <div style="background: #f97316; width: ${progressPercentage}%; height: 100%; border-radius: 99px;"></div>
                </div>
              </div>
            </div>

            ${summary ? `
            <div style="margin: 16px 0;">
              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;">Report Summary</div>
              <p style="font-size: 13px; color: #334155; background: #f8fafc; border-left: 3px solid #f97316; padding: 12px; border-radius: 0 8px 8px 0; margin: 0;">${summary}</p>
            </div>` : ''}

            ${pdfBuffer ? `
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 13px; color: #9a3412;">
              📎 The official progress report PDF (with site photos & GPS verification) is attached to this email.
            </div>` : ''}

            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              This is an automated notification from the CamTrust Verified Site Monitoring System. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `CamTrust Progress Report\n\nProject: ${projectTitle}\nEngineer: ${engineerName}\nProgress: ${progressPercentage}%\n\n${summary || ''}\n\nThis is an automated notification from CamTrust.`,
      attachments,
    });

    console.log('Report email sent:', info.messageId);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (err) {
    console.error('Email send error:', err);
    throw err;
  }
}

export default { sendReportEmail };
