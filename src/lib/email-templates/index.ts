import fs from 'fs';
import path from 'path';

export interface EmailTemplateOptions {
  unsubscribeToken?: string;
  [key: string]: unknown;
}

export function getEmailTemplate(templateName: string, options: EmailTemplateOptions = {}): string {
  try {
    const templatePath = path.join(process.cwd(), 'src', 'lib', 'email-templates', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace template variables
    Object.entries(options).forEach(([key, value]) => {
      const placeholder = `{{${key.toUpperCase()}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), String(value || ''));
    });
    
    return template;
  } catch (error) {
    console.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template not found: ${templateName}`);
  }
}

export const EmailTemplates = {
  NEWSLETTER_WELCOME: 'newsletter-welcome'
} as const;
