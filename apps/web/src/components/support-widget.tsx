import { useState, useRef, useEffect } from "react";
import { getLogs } from "@/lib/logger";


type Message = {
  role: "user" | "assistant";
  content: string;
};

type TicketDraft = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  reproSteps: string;
};

type WidgetState = "closed" | "chat" | "review";

export function SupportWidget() {
  const [state, setState] = useState<WidgetState>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);
  const [editedDraft, setEditedDraft] = useState<TicketDraft | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openWidget() {
    if (state !== "closed") return;
    setState("chat");
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your support agent. I've captured the current page context and any browser logs. Are you reporting a bug or requesting a new feature?",
      },
    ]);
  }

  function closeWidget() {
    setState("closed");
    setMessages([]);
    setInput("");
    setTicketDraft(null);
    setEditedDraft(null);
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    const documentClone = document.cloneNode(true) as Document;
    const reader = new Readability(documentClone);
    const article = reader.parse();

    try {
      const logs = getLogs();
      const pageContext = {
      path: window.location.pathname,
     title: document.title,
      textContent: "",
};
      // Strip the UI greeting — LLMs require the conversation to start with a user message
      const firstUserIdx = updatedMessages.findIndex((m) => m.role === "user");
      const apiMessages = firstUserIdx >= 0 ? updatedMessages.slice(firstUserIdx) : updatedMessages;

      const response = await fetch("http://localhost:3000/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          logs,
          pageContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Server error ${response.status}`);
      }

      if (data.ticketDraft) {
        setTicketDraft(data.ticketDraft);
        setEditedDraft(data.ticketDraft);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
        setState("review");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[SupportWidget] chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${detail}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitTicket() {
    if (!editedDraft) return;
    setIsLoading(true);

    try {
      const logs = getLogs();
      const response = await fetch("http://localhost:3000/api/agent/submit", {        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editedDraft,
          rawLogs: JSON.stringify(logs),
          messages,
        }),
      });

      if (response.ok) {
        setMessages([
          {
            role: "assistant",
            content:
              "Your ticket has been submitted successfully. Our team will look into it shortly.",
          },
        ]);
        setState("chat");
        setTicketDraft(null);
        setEditedDraft(null);
      }
    } catch {
      alert("Failed to submit ticket. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      {state === "closed" && (
        <button
          onClick={openWidget}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:opacity-90 transition-opacity"
        >
          ?
        </button>
      )}

      {/* Chat Popup */}
      {state !== "closed" && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[560px] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div>
              <p className="font-semibold text-sm">Support Agent</p>
              <p className="text-xs text-muted-foreground">
                {state === "review" ? "Review your ticket" : "How can I help?"}
              </p>
            </div>
            <button
              onClick={closeWidget}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Chat View */}
          {state === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t flex gap-2">
                <input
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Describe your issue..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          )}

          {/* Review View */}
          {state === "review" && editedDraft && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Review and edit your ticket before submitting.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Title
                  </label>
                  <input
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={editedDraft.title}
                    onChange={(e) =>
                      setEditedDraft({ ...editedDraft, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={4}
                    value={editedDraft.description}
                    onChange={(e) =>
                      setEditedDraft({
                        ...editedDraft,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Severity
                  </label>
                  <select
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={editedDraft.severity}
                    onChange={(e) =>
                      setEditedDraft({
                        ...editedDraft,
                        severity: e.target.value as "low" | "medium" | "high",
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Steps to Reproduce
                  </label>
                  <textarea
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={3}
                    value={editedDraft.reproSteps}
                    onChange={(e) =>
                      setEditedDraft({
                        ...editedDraft,
                        reproSteps: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setState("chat")}
                  className="flex-1 border rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={submitTicket}
                  disabled={isLoading}
                  className="flex-1 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}