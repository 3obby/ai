"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ConfigPanel } from "@/components/chat-config/config-panel";
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
      <ConfigPanel companionId={companionId} groupChatId={groupChatId} />
    </ConfigProvider>
  );
}; 