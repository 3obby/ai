import { getCategories, Category } from '@/app/features/companions/utils/companion-service';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CategoryListProps {
  activeCategoryId?: string;
}

export default async function CategoryList({ activeCategoryId }: CategoryListProps) {
  const categories = await getCategories();
  
  return (
    <div className="mb-4">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">
        Categories
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <Link 
          href="/companions"
          className={cn(
            "px-3 py-1 rounded-full text-sm",
            !activeCategoryId 
              ? "bg-primary/20 text-primary hover:bg-primary/30" 
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          All
        </Link>
        
        {categories.map((category: Category) => (
          <Link 
            key={category.id} 
            href={`/companions?category=${category.id}`}
            className={cn(
              "px-3 py-1 rounded-full text-sm",
              activeCategoryId === category.id 
                ? "bg-primary/20 text-primary hover:bg-primary/30" 
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
} 