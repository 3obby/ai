"use client";

import qs from "query-string";
import { Category } from "@prisma/client"
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

interface CategoriesProps {
  data: Category[]
}

export const Categories = ({
  data
}: CategoriesProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("categoryId");

  const onClick = (id: string | undefined) => {
    const query = { categoryId: id };

    const url = qs.stringifyUrl({
      url: window.location.href,
      query
    }, { skipNull: true });

    router.push(url);
  };

  return (
    <div className="w-full max-w-full overflow-x-auto pb-1 flex gap-1.5 px-0.5 no-scrollbar">
      <div className="flex gap-1.5 min-w-max">
        <button
          onClick={() => onClick(undefined)}
          className={cn(`
            flex 
            items-center 
            justify-center
            whitespace-nowrap
            text-xs 
            md:text-sm 
            px-3
            py-1.5
            md:py-2
            rounded-full
            font-medium
            border
            border-primary/10
            hover:bg-primary/20
            transition
          `,
            !categoryId ? 'bg-primary/25 border-primary/30' : 'bg-primary/5'
          )}
        >
          Newest
        </button>
        {data.map((item) => (
          <button
            onClick={() => onClick(item.id)}
            className={cn(`
              flex 
              items-center 
              justify-center
              whitespace-nowrap
              text-xs 
              md:text-sm 
              px-3
              py-1.5
              md:py-2
              rounded-full
              font-medium
              border
              border-primary/10
              hover:bg-primary/20 
              transition
            `,
              item.id === categoryId ? 'bg-primary/25 border-primary/30' : 'bg-primary/5'
            )}
            key={item.id}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  )
}