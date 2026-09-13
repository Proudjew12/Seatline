function readText(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function normalizeApiBaseUrl(value: string): string {
  const normalized = value.trim();
  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    const hasControlCharacter = [...normalized].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
    });
    if (
      normalized.includes("?") ||
      normalized.includes("#") ||
      normalized.includes("\\") ||
      hasControlCharacter
    ) {
      throw new Error(
        "VITE_API_BASE_URL must be a clean root-relative path without URL extras.",
      );
    }
    return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("VITE_API_BASE_URL must be an HTTP(S) URL or a root-relative path.");
  }
  if (!(["http:", "https:"] as const).includes(parsed.protocol as "http:" | "https:")) {
    throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("VITE_API_BASE_URL must not include credentials, a query, or a fragment.");
  }
  return parsed.href.replace(/\/+$/, "");
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isStaticDeployment = import.meta.env.VITE_STATIC_DEPLOYMENT === "true";

export const env = Object.freeze({
  appName: readText(import.meta.env.VITE_APP_NAME, "Seatline"),
  apiBaseUrl: normalizeApiBaseUrl(readText(configuredApiBaseUrl, "/api")),
  apiEnabled: !isStaticDeployment || Boolean(configuredApiBaseUrl),
});
