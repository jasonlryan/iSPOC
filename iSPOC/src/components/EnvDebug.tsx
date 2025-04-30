import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface EnvDebugProps {
  vectorStoreId?: string;
}

export function EnvDebug({ vectorStoreId }: EnvDebugProps = {}) {
  const [showDebug, setShowDebug] = useState(false);

  const envVars = {
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY
      ? `${import.meta.env.VITE_OPENAI_API_KEY.substring(
          0,
          5
        )}...${import.meta.env.VITE_OPENAI_API_KEY.substring(
          import.meta.env.VITE_OPENAI_API_KEY.length - 4
        )}`
      : "Not set",
    VITE_ASST_API_KEY: import.meta.env.VITE_ASST_API_KEY || "Not set",
    VITE_OPENAI_VECTOR_STORE_ID:
      import.meta.env.VITE_OPENAI_VECTOR_STORE_ID || "Not set",
    CURRENT_VECTOR_STORE: vectorStoreId || "Not provided",
    STORE_TYPE:
      vectorStoreId === "vs_68121a5f918c81919040f9caa54ff5ce"
        ? "Guides"
        : "Policies",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setShowDebug(!showDebug)}
        variant="outline"
        size="sm"
        className="mb-2"
      >
        {showDebug ? "Hide" : "Debug"}
      </Button>

      {showDebug && (
        <Card className="p-4 bg-white shadow-lg w-80">
          <h3 className="font-bold mb-2">Environment Variables</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-mono">{key}:</span>
                <span className="font-mono">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
