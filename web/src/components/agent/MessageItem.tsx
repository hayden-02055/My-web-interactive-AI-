import type { AgentMessage, AssistantMessage } from "@/lib/agent/types";
import { DebugTraceView } from "./DebugTraceView";

export type MessageItemProps = { message: AgentMessage };

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser ? "bg-accent text-accent-foreground" : "bg-surface-muted text-text"
        }`}
      >
        {isUser ? <p className="whitespace-pre-wrap">{message.text}</p> : <AssistantContent message={message} />}
      </div>
    </div>
  );
}

function AssistantContent({ message }: { message: AssistantMessage }) {
  const showPlaceholder = message.status === "streaming" && message.text === "";
  const showErrorOnly = message.status === "error" && message.text === "";

  return (
    <div>
      {/* U-06 — streaming text lives in a polite live region. */}
      <div aria-live={message.status === "streaming" ? "polite" : undefined} className="whitespace-pre-wrap">
        {showErrorOnly ? (
          <span className="text-text-muted">{message.error?.message ?? "Something went wrong."}</span>
        ) : (
          message.text
        )}
        {showPlaceholder ? <span className="inline-block animate-pulse text-text-muted">···</span> : null}
      </div>
      {message.status === "error" && message.text !== "" ? (
        <p className="mt-1 text-xs text-text-muted">{message.error?.message ?? "Something went wrong."}</p>
      ) : null}
      <DebugTraceView message={message} />
    </div>
  );
}
