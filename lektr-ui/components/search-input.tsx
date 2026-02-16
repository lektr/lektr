import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  wrapperClassName?: string;
}

export function SearchInput({ className, wrapperClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        className={cn(
          "w-full h-10 min-h-0 py-0 pl-10 pr-4 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 text-sm transition-all leading-10 hover:bg-muted/80 font-sans placeholder:text-muted-foreground/70",
          className
        )}
        {...props}
      />
    </div>
  );
}
