// AI provider settings, read from server environment variables only. The key
// never reaches the browser or the database.

export type AiProvider = "anthropic" | "openai-compatible";
export type AiConfig = { provider: AiProvider; model: string; url: string; host: string; key: string | null; ready: boolean };

export type ServiceSettings = {
  ai_enabled: boolean;
  ai_no_retention_confirmed: boolean;
  external_translation: boolean;
  external_spelling: boolean;
  remote_meetings: boolean;
  circular_enabled: boolean;
  pack_requires_disclosure: boolean;
  hide_contacts: boolean;
};

type Env = Record<string, string | undefined>;

const DEFAULTS: Record<AiProvider, { url: string; model: string }> = {
  anthropic: { url: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-5-5" },
  "openai-compatible": { url: "", model: "" },
};

/**
 * AI_PROVIDER: "anthropic" (default) or "openai-compatible" (a self-hosted
 * model or a private cloud deployment); AI_API_KEY; AI_MODEL; AI_BASE_URL
 * (the chat completions URL, required for openai-compatible).
 */
export function aiConfig(env: Env): AiConfig {
  const provider: AiProvider = env.AI_PROVIDER === "openai-compatible" ? "openai-compatible" : "anthropic";
  const url = env.AI_BASE_URL?.trim() || DEFAULTS[provider].url;
  const model = env.AI_MODEL?.trim() || DEFAULTS[provider].model;
  const key = env.AI_API_KEY?.trim() || null;
  let host = "";
  try {
    host = url ? new URL(url).host : "";
  } catch {
    host = "";
  }
  // A self-hosted model may need no key.
  const ready = Boolean(host && model && (key || provider === "openai-compatible") && url.startsWith("https://"));
  return { provider, model, url, host, key, ready };
}

/** The request body and headers for one prompt; nothing here is logged or cached. */
export function aiRequest(cfg: AiConfig, system: string, prompt: string, maxTokens = 2000): { headers: Record<string, string>; body: string } {
  if (cfg.provider === "anthropic")
    return {
      headers: { "content-type": "application/json", "x-api-key": cfg.key ?? "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
    };
  return {
    headers: { "content-type": "application/json", ...(cfg.key ? { authorization: `Bearer ${cfg.key}` } : {}) },
    body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
  };
}

/** The answer's text from either provider's response. */
export function aiAnswer(cfg: AiConfig, data: unknown): string | null {
  const d = data as { content?: { type: string; text?: string }[]; choices?: { message?: { content?: string } }[] };
  const text = cfg.provider === "anthropic" ? d.content?.filter((c) => c.type === "text").map((c) => c.text).join("") : d.choices?.[0]?.message?.content;
  return text?.trim() || null;
}
