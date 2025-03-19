import { Resend } from 'resend';

// Initialize the Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Hardcoded version for Edge compatibility
const PROJECT_VERSION = 'v0.3.x';

// Email template with logo and styling
const createEmailHtml = (message: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>GCBB</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #111827;
            color: #e5e7eb;
            padding: 20px;
            margin: 0;
            line-height: 1.6;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            padding: 30px;
            background-color: #1f2937;
            border-radius: 8px;
            border: 1px solid #374151;
          }
          .button-container {
            text-align: center;
            margin-bottom: 40px;
          }
          .button {
            display: inline-block;
            padding: 14px 40px;
            background-color: #f97316;
            color: white !important;
            border-radius: 4px;
            font-weight: bold;
            text-decoration: none;
            font-size: 18px;
          }
          .bottom-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            border-top: 1px solid #374151;
            padding-top: 20px;
          }
          .brand {
            font-size: 18px;
            font-weight: bold;
            color: #f97316;
          }
          .version {
            font-size: 12px;
            color: #9ca3af;
          }
          .logo {
            width: 40px;
            height: auto;
          }
          .note {
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
            margin-top: 10px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #6b7280;
          }
          a {
            color: #f97316;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Top section with login button -->
          <div class="button-container">
            ${message}
          </div>
          
          <!-- Bottom section with logo and branding -->
          <div class="bottom-section">
            <div class="brand">GCBB</div>
            <img src="https://groupchatbotbuilder.com/feather.png" alt="GCBB Logo" class="logo">
            <div class="version">${PROJECT_VERSION}</div>
          </div>
          
          <div class="footer">
            &copy; ${new Date().getFullYear()} GroupChatBotBuilder • <a href="https://groupchatbotbuilder.com">groupchatbotbuilder.com</a>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Send a styled email
export const sendEmail = async ({
  to,
  subject,
  message,
  from = 'GCBB <auth@groupchatbotbuilder.com>'
}: {
  to: string;
  subject: string;
  message: string;
  from?: string;
}): Promise<boolean> => {
  try {
    const htmlContent = createEmailHtml(message);
    
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html: htmlContent
    });
    
    if (error) {
      console.error('Error sending email with Resend:', error);
      return false;
    }
    
    console.log('Email sent successfully with Resend:', data);
    return true;
  } catch (error) {
    console.error('Exception when sending email with Resend:', error);
    return false;
  }
}; 