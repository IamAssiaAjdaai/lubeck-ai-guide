export const SOCIAL_DELETE_FRESH_AGE_MS = 5 * 60 * 1000;

export function hasFreshSocialDeleteSession(input: {
  sessionCreatedAt: Date;
  hasSocialProvider: boolean;
  now?: Date;
}) {
  if (!input.hasSocialProvider) return false;
  const now = input.now ?? new Date();
  return input.sessionCreatedAt.getTime() >= now.getTime() - SOCIAL_DELETE_FRESH_AGE_MS;
}
