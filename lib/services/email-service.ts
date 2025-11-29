/**
 * Email Notification Service
 * Handles email sending via Resend
 * Reference: EP_Compliance_Notification_Messaging_Specification.md
 */

import { env } from '../env';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('No email service configured (RESEND_API_KEY not set)');
      return {
        success: false,
        error: 'Email service not configured - RESEND_API_KEY required',
      };
    }
    
    return await sendEmailViaResend(options, apiKey);
  } catch (error: any) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send email via Resend
 */
async function sendEmailViaResend(options: EmailOptions, apiKey: string): Promise<EmailResult> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL || 'noreply@oblicore.com';
    const toEmails = Array.isArray(options.to) ? options.to : [options.to];
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: toEmails,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      reply_to: options.replyTo,
    });
    
    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Resend API error',
      };
    }
    
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Resend API error',
    };
  }
}


/**
 * Strip HTML tags to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

