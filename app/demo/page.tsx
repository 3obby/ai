import { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/app/shared/components/ui/skeleton";
import GroupChatDemo from "./components/GroupChatDemo";

export const metadata: Metadata = {
  title: "Demo | AI Group Chat",
  description: "Experience a live demo of our AI group chat system with pre-configured companions",
};

export default async function DemoPage() {
  return (
    <div className="flex flex-col h-full w-full">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <GroupChatDemo />
      </Suspense>
    </div>
  );
} 