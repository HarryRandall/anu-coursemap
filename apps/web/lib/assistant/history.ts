export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type AssistantDraft = {
  id: string;
  draft: string;
  title?: string;
  model: string;
  updatedAt: string;
  messages: AssistantMessage[];
};

export const ASSISTANT_PREVIEW_RESPONSE =
  "Let's work through your degree plan.\n\nStart with the requirements you still need to complete, then check which courses are offered and whether you meet their prerequisites. From there, you can build a balanced semester around your core courses and electives.\n\nWhich semester would you like to plan?";

export function assistantTitle(chat: AssistantDraft | undefined) {
  return (
    chat?.title?.trim() ||
    chat?.messages
      .find((message) => message.role === "user")
      ?.text?.trim()
      .replace(/\s+/g, " ")
      .slice(0, 64) ||
    "New chat"
  );
}

function readMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (message): message is AssistantMessage =>
      typeof message === "object" &&
      message !== null &&
      typeof message.id === "string" &&
      typeof message.text === "string" &&
      (message.role === "user" || message.role === "assistant"),
  );
}

export function readAssistantHistory(raw: string | null): AssistantDraft[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (chat) =>
          typeof chat === "object" &&
          chat !== null &&
          typeof chat.id === "string" &&
          typeof chat.draft === "string" &&
          typeof chat.model === "string" &&
          typeof chat.updatedAt === "string" &&
          Number.isFinite(Date.parse(chat.updatedAt)),
      )
      .slice(0, 50)
      .map((chat) => ({
        id: chat.id,
        draft: chat.draft,
        title:
          typeof chat.title === "string"
            ? chat.title.trim().slice(0, 64)
            : undefined,
        model: chat.model,
        updatedAt: chat.updatedAt,
        messages: readMessages(chat.messages),
      }));
  } catch {
    return [];
  }
}

export function assistantAge(updatedAt: string, now: number) {
  const minutes = Math.max(
    0,
    Math.floor((now - Date.parse(updatedAt)) / 60000),
  );
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return `${Math.floor(minutes / 10080)}w`;
}

export function assistantMockResponse(prompt: string, previousReplies: number) {
  if (/requirement|prerequisite/iu.test(prompt))
    return `We can start with the requirements you still need to complete.

Check your core courses first, then your major and elective requirements. For each course, look at its prerequisites and the semesters it is offered.

Which requirement would you like to work through first?`;
  if (/next semester|which courses/iu.test(prompt))
    return `Let's put together a shortlist for next semester.

Start with any core courses that unlock later subjects, then leave room for a major course or an elective. Check that each course is offered in your chosen semester and that you meet its prerequisites.

Which degree are you planning, and how many courses would you like to take?`;
  if (previousReplies)
    return `Got it. We can take this one step at a time.

Tell me the course or requirement you want to focus on, and we can work through where it fits in your plan.`;
  return ASSISTANT_PREVIEW_RESPONSE;
}
