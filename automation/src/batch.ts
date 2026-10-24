import OpenAI, { toFile } from "openai";
import { need } from "./env.js";
import { requestBody, supportsReasoning, type CaptionMode, type PromptInput } from "./captions.js";
import { log } from "./time.js";

export interface BatchItem {
  customId: string;
  postId: string;
  productId: string;
  mode: CaptionMode;
  angle: string;
  input: PromptInput;
}

export const openai = () => new OpenAI({ apiKey: need("OPENAI_API_KEY"), timeout: 180_000, maxRetries: 2 });

/** Sends every request as ONE Batch API job against /v1/responses (24 h window, 50 % cheaper). Returns the batch id. */
export async function submitBatch(items: Pick<BatchItem, "customId" | "input">[]): Promise<string> {
  const reasoning = await supportsReasoning();
  const jsonl = items
    .map((i) => JSON.stringify({ custom_id: i.customId, method: "POST", url: "/v1/responses", body: requestBody(i.input, { reasoning }) }))
    .join("\n");
  const client = openai();
  const file = await client.files.create({ file: await toFile(Buffer.from(jsonl, "utf8"), "requests.jsonl"), purpose: "batch" });
  const batch = await client.batches.create({ input_file_id: file.id, endpoint: "/v1/responses", completion_window: "24h", metadata: { kind: "hattah-daily" } });
  log(`OpenAI batch ${batch.id} created (${items.length} requests, input file ${file.id})`);
  return batch.id;
}

export interface BatchLine {
  text: string | null;
  usage: any;
  error: string | null;
}

/** Output text of a Responses API body (raw batch lines have no `output_text` convenience field). */
export function textFromBody(body: any): string | null {
  for (const item of body?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) if (part?.type === "output_text" && typeof part.text === "string") return part.text;
  }
  return null;
}

async function readFile(client: OpenAI, id: string): Promise<string> {
  return await (await client.files.content(id)).text();
}

/** Parses the output (and error) files of a finished batch into `custom_id → result`. */
export async function readBatchResults(client: OpenAI, batch: { output_file_id?: string | null; error_file_id?: string | null }): Promise<Map<string, BatchLine>> {
  const out = new Map<string, BatchLine>();
  for (const [fileId, isError] of [[batch.output_file_id, false], [batch.error_file_id, true]] as const) {
    if (!fileId) continue;
    for (const line of (await readFile(client, fileId)).split("\n").filter(Boolean)) {
      const j = JSON.parse(line);
      const body = j.response?.body;
      const failed = isError || j.error || (j.response?.status_code ?? 200) >= 400 || body?.status === "incomplete";
      out.set(j.custom_id, {
        text: failed ? null : textFromBody(body),
        usage: body?.usage ?? null,
        error: failed ? (j.error?.message ?? body?.error?.message ?? body?.incomplete_details?.reason ?? `status ${j.response?.status_code}`) : null,
      });
    }
  }
  return out;
}
