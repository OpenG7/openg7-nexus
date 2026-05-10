interface UsersPermissionsAdvancedSettings {
  allow_register?: boolean;
  default_role?: string;
  email_confirmation?: boolean;
  email_confirmation_redirection?: string | null;
  email_reset_password?: string | null;
  unique_email?: boolean;
}

interface EmailTemplateOptions {
  from?: {
    name?: string;
    email?: string;
  };
  response_email?: string | null;
  object?: string;
  message?: string;
}

interface UsersPermissionsEmailTemplate {
  display?: string;
  icon?: string;
  options?: EmailTemplateOptions;
}

interface UsersPermissionsEmailSettings {
  email_confirmation?: UsersPermissionsEmailTemplate;
  reset_password?: UsersPermissionsEmailTemplate;
}

function normalizeEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function shouldReplaceFromEmail(currentEmail: string | null): boolean {
  if (!currentEmail) {
    return true;
  }

  const normalized = currentEmail.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized.endsWith('@strapi.io');
}

function updateTemplateSender(
  template: UsersPermissionsEmailTemplate | undefined,
  options: { fromName: string; fromEmail: string; replyTo: string },
): { template: UsersPermissionsEmailTemplate; changed: boolean } {
  const nextTemplate: UsersPermissionsEmailTemplate = template ? { ...template } : {};
  const nextOptions: EmailTemplateOptions = { ...(nextTemplate.options ?? {}) };
  const currentFrom = nextOptions.from ?? {};
  const currentFromEmail = normalizeEnv(currentFrom.email);
  const currentFromName = normalizeEnv(currentFrom.name);
  const currentReplyTo = normalizeEnv(nextOptions.response_email ?? undefined);

  let changed = false;

  if (shouldReplaceFromEmail(currentFromEmail)) {
    if (currentFromEmail !== options.fromEmail || currentFromName !== options.fromName) {
      nextOptions.from = { name: options.fromName, email: options.fromEmail };
      changed = true;
    }
  } else {
    nextOptions.from = {
      name: currentFromName ?? options.fromName,
      email: currentFromEmail,
    };
  }

  if (!currentReplyTo) {
    nextOptions.response_email = options.replyTo;
    changed = true;
  }

  nextTemplate.options = nextOptions;
  return { template: nextTemplate, changed };
}

export default async () => {
  const advancedStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
    key: 'advanced',
  });

  const currentAdvanced =
    ((await advancedStore.get()) as UsersPermissionsAdvancedSettings | null) ?? {};
  const nextAdvanced: UsersPermissionsAdvancedSettings = {
    ...currentAdvanced,
    email_confirmation: true,
  };

  if (currentAdvanced.email_confirmation !== true) {
    await advancedStore.set({ value: nextAdvanced });
    strapi.log?.info?.('[seed:13-auth-settings] Enabled users-permissions email confirmation.');
  }

  const emailStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
    key: 'email',
  });

  const currentEmailSettings =
    ((await emailStore.get()) as UsersPermissionsEmailSettings | null) ?? {};

  const fromEmail =
    normalizeEnv(process.env.SMTP_DEFAULT_FROM) ??
    normalizeEnv(process.env.SMTP_USERNAME) ??
    'notify@openg7.org';
  const fromName = normalizeEnv(process.env.SMTP_DEFAULT_FROM_NAME) ?? 'OpenG7';
  const replyTo = normalizeEnv(process.env.SMTP_DEFAULT_REPLY_TO) ?? fromEmail;

  let changed = false;
  const nextEmailSettings: UsersPermissionsEmailSettings = { ...currentEmailSettings };

  const confirmationTemplate = updateTemplateSender(currentEmailSettings.email_confirmation, {
    fromName,
    fromEmail,
    replyTo,
  });
  if (confirmationTemplate.changed) {
    changed = true;
  }
  nextEmailSettings.email_confirmation = confirmationTemplate.template;

  const resetTemplate = updateTemplateSender(currentEmailSettings.reset_password, {
    fromName,
    fromEmail,
    replyTo,
  });
  if (resetTemplate.changed) {
    changed = true;
  }
  nextEmailSettings.reset_password = resetTemplate.template;

  if (changed) {
    await emailStore.set({ value: nextEmailSettings });
    strapi.log?.info?.('[seed:13-auth-settings] Updated users-permissions email sender defaults.');
  }
};
