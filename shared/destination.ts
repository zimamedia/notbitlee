const MAX_DESTINATION_LENGTH = 2000;

export function destinationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a destination URL.";
  if (trimmed.length > MAX_DESTINATION_LENGTH) return "That destination is too long.";
  if (hasControlCharacter(trimmed)) return "Destination must be a valid URL.";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Destination must start with http:// or https://.";
    }
    if (url.hostname.length === 0) return "Destination must include a host.";
  } catch {
    return "Destination must be a valid URL.";
  }

  return null;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}
