import Image from "next/image";
import Link from "next/link";
import { GroupChat } from "@prisma/client";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";

interface GroupCardsProps {
  data: GroupChat[];
}

export const GroupCards = ({ data }: GroupCardsProps) => {
  if (data.length === 0) {
    return (
      <div className="pt-10 flex flex-col items-center justify-center space-y-3">
        <div className="relative w-60 h-60">
          <Image
            fill
            sizes="(max-width: 768px) 240px, 240px"
            className="grayscale"
            src="/empty.png"
            alt="Empty"
          />
        </div>
        <p className="text-sm text-muted-foreground">No groups found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
        {data.map((group) => (
          <Card key={group.id} className="bg-[#DEDEDE] dark:bg-zinc-800 rounded-2xl cursor-pointer border-2 border-zinc-300/50 dark:border-zinc-700 shadow-lg overflow-hidden flex flex-col h-full">
            <Link href={`/group-chat/${group.id}`} className="flex flex-col h-full">
              <CardHeader className="flex items-center justify-center text-center p-4 space-y-3">
                <div className="relative w-32 h-32">
                  <Image
                    src="https://label-engine.com/news/wp-content/uploads/2021/04/groupchat.png"
                    fill
                    sizes="(max-width: 768px) 100px, 128px"
                    className="rounded-2xl object-cover shadow-md"
                    alt="Group"
                  />
                </div>
                <p className="font-semibold text-lg text-zinc-800 dark:text-foreground">
                  {group.name}
                </p>
              </CardHeader>
              <CardFooter className="flex items-center justify-between px-4 py-3 border-t border-zinc-300/50 dark:border-zinc-700 bg-[#BDBDBD] dark:bg-zinc-900/50 mt-auto">
                <p className="text-xs text-zinc-600 dark:text-muted-foreground font-medium">Created by you</p>
              </CardFooter>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupCards; 