import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/viewer";
import { AssistantWorkspace } from "@/ui/assistant/assistant-workspace";

export default async function CompassChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  if (
    chatId !== "new" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
      chatId,
    )
  )
    notFound();
  const { viewer } = await getAuthContext();
  if (!viewer)
    redirect(`/login?next=${encodeURIComponent(`/compass/${chatId}`)}`);
  return <AssistantWorkspace />;
}
