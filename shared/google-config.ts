export function isGoogleConfigured(clientId: string | undefined, clientSecret: string | undefined): boolean {
  const id = (clientId ?? "").trim();
  const secret = (clientSecret ?? "").trim();
  return id.endsWith(".apps.googleusercontent.com") && secret.length >= 10;
}
