// Form helpers for the Profiel and Wachtwoord wijzigen screens.

/** Field errors of a Laravel 422 response (`{ errors: { email: ['...'] } }`): the first message per field. */
export function veldFouten(err: any): Record<string, string> {
  const errors = err?.response?.data?.errors;
  const fouten: Record<string, string> = {};
  if (!errors || typeof errors !== 'object') return fouten;
  for (const [veld, berichten] of Object.entries(errors)) {
    if (Array.isArray(berichten) && typeof berichten[0] === 'string') fouten[veld] = berichten[0];
  }
  return fouten;
}

/** Very loose e-mail check for instant feedback; the server does the real validation. */
export function lijktOpEmail(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waarde);
}
