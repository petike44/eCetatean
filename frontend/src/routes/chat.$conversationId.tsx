import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/lib/auth-guard";
import { Chat } from "./chat";

export const Route = createFileRoute("/chat/$conversationId")({
  head: () => ({ meta: [{ title: "ClaudIA — eCetățean" }] }),
  component: () => (
    <Protected>
      <ChatWithId />
    </Protected>
  ),
});

function ChatWithId() {
  const { conversationId } = Route.useParams();
  return <Chat conversationId={conversationId} />;
}
