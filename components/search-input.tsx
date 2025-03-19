"use client";

import qs from "query-string";
import { ChangeEventHandler, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";

export const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("categoryId");
  const name = searchParams.get("name");

  const [value, setValue] = useState(name || "");
  const debouncedValue = useDebounce<string>(value, 500);

  const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setValue(e.target.value);
  };
  
  const clearSearch = () => {
    setValue("");
  };

  useEffect(() => {
    const query = { 
      name: debouncedValue, 
      categoryId: categoryId,
    };

    const url = qs.stringifyUrl({
      url: window.location.href,
      query
    }, { skipNull: true, skipEmptyString: true });

    router.push(url);
  }, [debouncedValue, router, categoryId])

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <Search className="absolute h-4 w-4 top-3.5 left-4 text-muted-foreground" />
      <Input
        onChange={onChange}
        value={value}
        placeholder="Search companions..."
        className="pl-10 pr-10 bg-primary/10 rounded-full h-11 text-base sm:text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
      />
      {value && (
        <Button 
          onClick={clearSearch}
          size="sm" 
          variant="ghost" 
          className="absolute right-1 top-2 h-7 w-7 rounded-full p-0 flex items-center justify-center"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
};
