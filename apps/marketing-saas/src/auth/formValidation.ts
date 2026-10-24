import { forgotPasswordSchema, signInSchema, signUpSchema, type AuthField } from './validation';
export type AuthView = 'signin' | 'signup' | 'forgot' | 'reset' | 'expired';
export function expiredAuthCode(value: unknown) {
  return typeof value === 'string' && ['INVALID_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_HAS_EXPIRED'].includes(value.toUpperCase());
}
export function validateAuthForm(view: AuthView, fields: FormData): Partial<Record<AuthField, string>> {
  const email = String(fields.get('email') ?? '').trim().toLowerCase();
  const password = String(fields.get('password') ?? '');
  const result = view === 'signup' ? signUpSchema.safeParse({ name: String(fields.get('name') ?? ''), email, password })
    : view === 'signin' ? signInSchema.safeParse({ email, password })
    : view === 'reset' ? signUpSchema.pick({ password: true }).safeParse({ password })
    : forgotPasswordSchema.safeParse({ email });
  const errors: Partial<Record<AuthField, string>> = {};
  if (!result.success) for (const issue of result.error.issues) {
    const field = issue.path[0] as AuthField;
    if (!['name','email','password'].includes(field)) continue;
    errors[field] = field === 'email' ? 'Bitte eine gültige E-Mail-Adresse mit höchstens 254 Zeichen eingeben.'
      : field === 'name' ? 'Bitte einen Namen mit 2 bis 100 Zeichen eingeben.'
      : view === 'signin' ? 'Bitte dein Passwort eingeben.' : 'Bitte ein Passwort mit 12 bis 128 Zeichen wählen.';
  }
  return errors;
}
