import { useState } from "react";
// ... existing imports

// Add this import for the toggle component
import { Toggle } from "./ui/toggle";

// Add these icons for the toggle
import { BookOpen, FileText } from "lucide-react";

interface SidebarProps {
  // ... existing props
  onVectorStoreChange?: (storeId: string) => void; // Add this prop
}

export default function Sidebar({
  // ... existing props
  onVectorStoreChange,
}: SidebarProps) {
  // ... existing state

  // Add state for active vector store
  const [activeStore, setActiveStore] = useState<"policy" | "guide">("policy");

  // Handle vector store toggle
  const handleStoreToggle = (type: "policy" | "guide") => {
    setActiveStore(type);

    // Pass the selected vector store ID to parent component
    if (onVectorStoreChange) {
      const storeId =
        type === "policy"
          ? "vs_S49gTBhlXwOSZFht2AqbPIsf" // Policy vector store
          : "vs_68121a5f918c81919040f9caa54ff5ce"; // Guide vector store
      onVectorStoreChange(storeId);
    }
  };

  return (
    <div className="sidebar fixed left-0 top-0 bottom-0 w-[11.6rem] bg-pink-700 text-white shadow-lg flex flex-col overflow-hidden">
      <div className="sidebar-header p-4 flex flex-col items-center">
        {/* Existing logo and content */}
        <div className="logo-container">{/* ... existing logo code */}</div>

        {/* Add vector store selector below the logo */}
        <div className="vector-store-selector w-full mt-6 mb-2">
          <h3 className="text-xs uppercase font-semibold text-pink-200 mb-2">
            Knowledge Base
          </h3>
          <div className="flex flex-col space-y-1 w-full">
            <Toggle
              variant="outline"
              size="sm"
              pressed={activeStore === "policy"}
              onPressedChange={() => handleStoreToggle("policy")}
              className={`flex justify-start items-center w-full rounded-md px-2 py-1.5 text-sm ${
                activeStore === "policy"
                  ? "bg-white text-pink-700 font-medium hover:bg-gray-100"
                  : "bg-pink-800/50 text-white hover:bg-pink-600/50"
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Policies
            </Toggle>
            <Toggle
              variant="outline"
              size="sm"
              pressed={activeStore === "guide"}
              onPressedChange={() => handleStoreToggle("guide")}
              className={`flex justify-start items-center w-full rounded-md px-2 py-1.5 text-sm ${
                activeStore === "guide"
                  ? "bg-white text-pink-700 font-medium hover:bg-gray-100"
                  : "bg-pink-800/50 text-white hover:bg-pink-600/50"
              }`}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Guides
            </Toggle>
          </div>
        </div>
      </div>

      {/* Rest of the sidebar content */}
      <div className="sidebar-content">{/* ... existing content */}</div>
    </div>
  );
}

// Add these styles at the end of the file or in your CSS
// .vector-store-selector {
//   padding: 0 1rem;
// }
