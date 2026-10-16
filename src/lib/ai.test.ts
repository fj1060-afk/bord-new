import { describe, expect, it } from "vitest";
import { aiAnswer, aiConfig, aiRequest } from "./ai";

describe("aiConfig", () => {
  it("is not ready without a key", () => {
    expect(aiConfig({}).ready).toBe(false);
    expect(aiConfig({ AI_API_KEY: "k" })).toMatchObject({ provider: "anthropic", host: "api.anthropic.com", ready: true });
  });
  it("needs an https URL for a self-hosted model", () => {
    expect(aiConfig({ AI_PROVIDER: "openai-compatible", AI_MODEL: "m" }).ready).toBe(false);
    expect(aiConfig({ AI_PROVIDER: "openai-compatible", AI_MODEL: "m", AI_BASE_URL: "http://x/v1/chat/completions" }).ready).toBe(false);
    expect(aiConfig({ AI_PROVIDER: "openai-compatible", AI_MODEL: "m", AI_BASE_URL: "https://ai.local/v1/chat/completions" }).ready).toBe(true);
  });
});

describe("aiRequest and aiAnswer", () => {
  it("speaks each provider's format", () => {
    const a = aiConfig({ AI_API_KEY: "k" });
    expect(JSON.parse(aiRequest(a, "s", "p").body)).toMatchObject({ system: "s", messages: [{ role: "user", content: "p" }] });
    expect(aiAnswer(a, { content: [{ type: "text", text: " ok " }] })).toBe("ok");
    const o = aiConfig({ AI_PROVIDER: "openai-compatible", AI_MODEL: "m", AI_BASE_URL: "https://h/v1" });
    expect(aiRequest(o, "s", "p").headers.authorization).toBeUndefined();
    expect(aiAnswer(o, { choices: [{ message: { content: "ok" } }] })).toBe("ok");
  });
});
