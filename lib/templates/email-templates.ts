/**
 * Email Templates
 * Template rendering utilities for email notifications
 * Reference: EP_Compliance_Notification_Messaging_Specification.md Section 2
 */

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Render template with variable substitution
 * Variables use {{variable_name}} syntax
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Base email template wrapper
 */
function baseEmailTemplate(content: string, companyName?: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: #026A67; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Oblicore</h1>
    </div>
    
    <!-- Body -->
    <div style="background-color: #f9fafb; padding: 30px;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background-color: #E2E6E7; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">${companyName || 'Oblicore'} | Compliance Management</p>
      ${unsubscribeUrl ? `<p style="margin: 5px 0;"><a href="${unsubscribeUrl}" style="color: #026A67;">Unsubscribe</a></p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Pack Distribution Email Template
 */
export function packDistributionEmail(variables: {
  pack_name: string;
  distribution_method: 'EMAIL' | 'SHARED_LINK';
  recipient_name?: string;
  pack_download_url?: string;
  shared_link?: string;
  expires_at?: string;
  company_name?: string;
}): { subject: string; html: string; text: string } {
  const subject = renderTemplate('📤 Pack Distributed: {{pack_name}}', variables);
  
  let content = `
    <h2 style="color: #026A67; margin-top: 0;">Pack Distributed</h2>
    <p>Hello${variables.recipient_name ? ` ${variables.recipient_name}` : ''},</p>
    <p>You have been sent a compliance pack:</p>
    <div style="background-color: white; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0;">
      <strong>${variables.pack_name}</strong>
    </div>
  `;
  
  if (variables.distribution_method === 'EMAIL' && variables.pack_download_url) {
    content += `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.pack_download_url}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Pack</a>
      </div>
    `;
  } else if (variables.distribution_method === 'SHARED_LINK' && variables.shared_link) {
    content += `
      <p><strong>Shared Link:</strong> <a href="${variables.shared_link}">${variables.shared_link}</a></p>
      ${variables.expires_at ? `<p><small>Link expires: ${variables.expires_at}</small></p>` : ''}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.shared_link}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Pack</a>
      </div>
    `;
  }
  
  const html = baseEmailTemplate(content, variables.company_name);
  const text = stripHtml(html);
  
  return { subject, html, text };
}

/**
 * User Invitation Email Template
 */
export function userInvitationEmail(variables: {
  recipient_email: string;
  inviter_name?: string;
  company_name: string;
  invitation_url: string;
  expires_in_days?: number;
}): { subject: string; html: string; text: string } {
  const subject = renderTemplate('Invitation to join {{company_name}} on Oblicore', variables);
  
  const content = `
    <h2 style="color: #026A67; margin-top: 0;">You're Invited!</h2>
    <p>Hello,</p>
    <p>${variables.inviter_name || 'You'} have been invited to join <strong>${variables.company_name}</strong> on Oblicore.</p>
    <p>Oblicore helps manage environmental compliance obligations and deadlines.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${variables.invitation_url}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
    </div>
    ${variables.expires_in_days ? `<p><small>This invitation expires in ${variables.expires_in_days} days.</small></p>` : ''}
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
  `;
  
  const html = baseEmailTemplate(content, variables.company_name);
  const text = stripHtml(html);
  
  return { subject, html, text };
}

/**
 * Consultant Client Assignment Email Template
 */
export function consultantClientAssignedEmail(variables: {
  consultant_name: string;
  client_company_name: string;
  assigned_at: string;
  client_dashboard_url: string;
  site_count?: number;
}): { subject: string; html: string; text: string } {
  const subject = renderTemplate('👥 New Client Assigned: {{client_company_name}}', variables);
  
  const content = `
    <h2 style="color: #026A67; margin-top: 0;">New Client Assignment</h2>
    <p>Hello ${variables.consultant_name},</p>
    <p>You have been assigned as a consultant to <strong>${variables.client_company_name}</strong>.</p>
    ${variables.site_count ? `<p>This client has ${variables.site_count} site(s) to manage.</p>` : ''}
    <div style="background-color: white; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0;">
      <strong>Client:</strong> ${variables.client_company_name}<br>
      <strong>Assigned:</strong> ${variables.assigned_at}
    </div>
    <p>You can now access their compliance dashboard and help manage their obligations.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${variables.client_dashboard_url}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Client Dashboard</a>
    </div>
  `;
  
  const html = baseEmailTemplate(content);
  const text = stripHtml(html);
  
  return { subject, html, text };
}

/**
 * Lab Result Threshold Alert Email Template
 */
export function labResultThresholdAlertEmail(variables: {
  recipient_name?: string;
  site_name: string;
  parameter_name: string;
  current_value: number;
  limit_value: number;
  percentage_of_limit: number;
  threshold: number; // 80, 90, or 100
  consent_id?: string;
  action_url?: string;
  company_name?: string;
}): { subject: string; html: string; text: string } {
  const thresholdLabels: Record<number, string> = {
    80: 'Warning',
    90: 'Critical Warning',
    100: 'CRITICAL: Limit Exceeded',
  };
  
  const thresholdColors: Record<number, string> = {
    80: '#CB7C00',
    90: '#CB7C00',
    100: '#B13434',
  };
  
  const label = thresholdLabels[variables.threshold] || 'Alert';
  const color = thresholdColors[variables.threshold] || '#026A67';
  
  const subject = renderTemplate(`⚠️ ${label}: ${variables.parameter_name} at ${variables.percentage_of_limit}% of limit`, variables);
  
  const content = `
    <h2 style="color: ${color}; margin-top: 0;">${label}: Parameter Limit Alert</h2>
    <p>Hello${variables.recipient_name ? ` ${variables.recipient_name}` : ''},</p>
    <p>A monitoring parameter has reached ${variables.threshold}% of its consent limit.</p>
    <div style="background-color: white; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0;">
      <strong>Site:</strong> ${variables.site_name}<br>
      <strong>Parameter:</strong> ${variables.parameter_name}<br>
      <strong>Current Value:</strong> ${variables.current_value}<br>
      <strong>Limit Value:</strong> ${variables.limit_value}<br>
      <strong>Percentage of Limit:</strong> ${variables.percentage_of_limit}%
    </div>
    ${variables.threshold === 100 ? '<p style="color: #B13434;"><strong>⚠️ This parameter has exceeded its consent limit. Immediate action may be required.</strong></p>' : ''}
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Lab Results</a>
      </div>
    ` : ''}
  `;
  
  const html = baseEmailTemplate(content, variables.company_name);
  const text = stripHtml(html);
  
  return { subject, html, text };
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
    .replace(/\s+/g, ' ')
    .trim();
}

