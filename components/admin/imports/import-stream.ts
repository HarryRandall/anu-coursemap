/**
 * Shared SSE reader for the course and programme import endpoints. Both
 * streams use the same `data: {...}\n\n` frame shape.
 */
export async function readImportStream(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Import stream was empty.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      const event = JSON.parse(payload) as Record<string, unknown>;
      if (event.type === "error") {
        throw new Error(
          typeof event.message === "string" ? event.message : "Import failed.",
        );
      }
      onEvent(event);
    }

    if (done) return;
  }
}
