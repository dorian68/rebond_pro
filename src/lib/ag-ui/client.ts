import type { AGUIEvent, RunAgentInput } from "./types";

/** Client AG-UI : POST + parsing du flux SSE, appelle onEvent pour chaque événement. */
export async function runAgUI(input: RunAgentInput, onEvent: (e: AGUIEvent) => void, signal?: AbortSignal, endpoint = "/api/ag-ui/run"): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`;
    try { const j = await response.json(); detail = j.error ?? detail; } catch { /* noop */ }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const dataLines = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.replace(/^data:\s?/, ""));
      if (!dataLines.length) continue;
      const raw = dataLines.join("\n");
      if (raw === "[DONE]") return;
      try {
        onEvent(JSON.parse(raw) as AGUIEvent);
      } catch (e) {
        console.error("[ag-ui] event parse error", raw, e);
      }
    }
  }
}
