import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";

interface MobileSidebarProps {
  isPro: boolean;
  userId?: string;
}

export const MobileSidebar = ({
  isPro,
  userId
}: MobileSidebarProps) => {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden p-1.5 rounded-md hover:bg-gray-500/10 transition-colors">
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-secondary pt-10 w-72">
        <Sidebar userId={userId} />
      </SheetContent>
    </Sheet>
  );
};
