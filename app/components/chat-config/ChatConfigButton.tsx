"use client";

import { Settings, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ConfigPanel } from "@/components/chat-config/config-panel";
import { AIWizard } from "@/components/chat-config/ai-wizard";
import { ConfigProvider } from "@/components/chat-config/config-provider";

interface ChatConfigButtonProps {
  companionId?: string;
  groupChatId?: string;
}

export const ChatConfigButton = ({
  companionId,
  groupChatId,
}: ChatConfigButtonProps) => {
  return (
    <ConfigProvider initialCompanionId={companionId} initialGroupChatId={groupChatId}>
      <div className="flex items-center space-x-2">
        <AIWizard companionId={companionId} groupChatId={groupChatId} />
        <ConfigPanel companionId={companionId} groupChatId={groupChatId} />
      </div>
    </ConfigProvider>
  );
}; 