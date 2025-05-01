interface EnvDebugProps {
  className?: string;
}

export function EnvDebug({ className }: EnvDebugProps) {
  return (
    <div
      className={`fixed bottom-4 right-4 bg-slate-800 text-green-400 p-4 rounded-lg shadow-lg text-xs font-mono z-50 ${
        className || ""
      }`}
      style={{ maxWidth: "20rem", maxHeight: "50vh", overflow: "auto" }}
    >
      <h3 className="mb-2 text-sm font-bold text-white">
        Environment Variables
      </h3>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <div className="font-bold">API Key:</div>
        <div>
          {import.meta.env.VITE_OPENAI_API_KEY ? "✅ Set" : "❌ Missing"}
        </div>

        <div className="font-bold">Vector Store:</div>
        <div>{import.meta.env.VITE_OPENAI_VECTOR_STORE_ID || "❌ Missing"}</div>

        <div className="font-bold">Mode:</div>
        <div>{import.meta.env.MODE}</div>

        <div className="font-bold">DEV:</div>
        <div>{import.meta.env.DEV ? "true" : "false"}</div>

        <div className="font-bold">PROD:</div>
        <div>{import.meta.env.PROD ? "true" : "false"}</div>
      </div>
    </div>
  );
}
