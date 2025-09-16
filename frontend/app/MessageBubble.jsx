export default function MessageBubble({ role, content, time }) {
  const isUser = role === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-sm">
          🤖
        </div>
      )}

      {/* Bubble */}
      <div
        className={`rounded-xl px-4 py-3 max-w-[70%] shadow ${
          isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
        }`}
      >
        <span className="block text-sm font-semibold mb-1">
          {isUser ? "You" : "Assistant"}
        </span>
        <span className="block">{content}</span>
        <span className="block text-xs text-red-500 mt-1 text-right">{time}</span>
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
          🧑
        </div>
      )}
    </div>
  );
}
