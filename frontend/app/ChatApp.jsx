"use client";
import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "frontend-user", question: input }),
      });

      const data = await res.json();
      const botMessage = {
        role: "assistant",
        content: data.output,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Error: " + err.message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-100 font-sans">
      <div className="flex flex-col w-full max-w-3xl h-[90vh] bg-white shadow-lg rounded-lg border overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center font-bold text-xl py-3">
          🧠 AI Chatbot
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 italic">
              Start a conversation...
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} {...msg} />
          ))}

          {loading && <div className="text-gray-500 italic text-sm">Assistant is typing...</div>}
          <div ref={chatEndRef} />
        </main>

        {/* Input */}
        <footer className="border-t p-3 flex gap-2 bg-gray-50">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring focus:ring-blue-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            disabled={loading}
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
}
