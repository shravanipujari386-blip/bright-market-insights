import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import type { z } from "zod";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

/** Runs one structured AI call through Lovable AI Gateway (streamed, schema-enforced). */
export async function runStructured<T>(opts: {
  instructions: string;
  prompt: string;
  schema: z.ZodType<T>;
  name: string;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured (missing key).", 401);
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID_HEADER, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      if (!res.ok) {
        const text = await res.clone().text().catch(() => "");
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j?.error?.message ?? j?.message ?? text;
        } catch {
          /* keep raw */
        }
        throw new AiError(
          res.status === 402
            ? `AI credits exhausted: ${msg}`
            : res.status === 429
              ? "AI rate limit reached. Please wait a minute and try again."
              : `AI request failed (${res.status}): ${String(msg).slice(0, 300)}`,
          res.status,
        );
      }
      return res;
    },
  });

  let streamError: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: opts.instructions,
    prompt: opts.prompt,
    output: Output.object({ schema: opts.schema, name: opts.name }),
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return (await result.output) as T;
  } catch (e) {
    if (streamError instanceof AiError) throw streamError;
    if (e instanceof AiError) throw e;
    if (NoObjectGeneratedError.isInstance(e)) throw new AiError("The AI returned an incomplete answer for this stage.");
    console.error("AI error", e, streamError);
    throw new AiError("The AI analysis stage failed.");
  }
}
