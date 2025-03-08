import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";

interface MobileSidebarProps {
  isPro: boolean;
  userId: string;
}

export const MobileSidebar = ({
  isPro,
  userId
}: MobileSidebarProps) => {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden">
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-secondary pt-10 w-64">
        <Sidebar userId={userId} />
      </SheetContent>
    </Sheet>
  );
};
