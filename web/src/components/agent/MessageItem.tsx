import type { AgentMessage, AssistantMessage } from "@/lib/agent/types";
import { MvpOutlineBlock } from "./MvpOutlineBlock";
import { SuggestionCard } from "./SuggestionCard";
import { XrayPipeline } from "./XrayPipeline";

export type MessageItemProps = {
  message: AgentMessage;
  isFirstAssistantMessage: boolean;
};

export function MessageItem({ message, isFirstAssistantMessage }: MessageItemProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser ? "bg-accent text-accent-foreground" : "bg-surface-muted text-text"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <AssistantContent message={message} isFirstAssistantMessage={isFirstAssistantMessage} />
        )}
      </div>
    </div>
  );
}

// SDD-05/06/07 §4.1 — X-ray (process) above the text, MVP outline and
// suggestion cards below it: execution -> result -> next action.
function AssistantContent({
  message,
  isFirstAssistantMessage,
}: {
  message: AssistantMessage;
  isFirstAssistantMessage: boolean;
}) {
  const showPlaceholder = message.status === "streaming" && message.text === "";
  const showErrorOnly = message.status === "error" && message.text === "";

  return (
    <div>
      <XrayPipeline message={message} isFirstAssistantMessage={isFirstAssistantMessage} />

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

      {message.blocks.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">
          {message.blocks.map((block, index) => (
            <MvpOutlineBlock key={index} block={block} />
          ))}
        </div>
      ) : null}

      {message.suggestions.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {message.suggestions.map((suggestion, index) => (
            <SuggestionCard key={index} suggestion={suggestion} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
