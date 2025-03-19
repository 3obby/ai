"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ConfigPanel } from "@/components/chat-config/config-panel";
import { ConfigProvider } from "@/components/chat-config/config-provider";

interface ChatConfigButtonProps {
  companionId?: string;
  groupChatId?: string;
  userId?: string;
}

export const ChatConfigButton = ({
  companionId,
  groupChatId,
  userId,
}: ChatConfigButtonProps) => {
  return (
    <ConfigProvider 
      initialCompanionId={companionId} 
      initialGroupChatId={groupChatId}
      userId={userId}
    >
      <ConfigPanel companionId={companionId} groupChatId={groupChatId} />
    </ConfigProvider>
  );
}; 