import { cn } from "@/lib/utils";

// Centralized list of Tailwind tag colors
export const TAG_COLORS = [
  "bg-slate-100 text-slate-800",
  "bg-red-100 text-red-800",
  "bg-orange-100 text-orange-800",
  "bg-amber-100 text-amber-800",
  "bg-yellow-100 text-yellow-800",
  "bg-lime-100 text-lime-800",
  "bg-green-100 text-green-800",
  "bg-emerald-100 text-emerald-800",
  "bg-teal-100 text-teal-800",
  "bg-cyan-100 text-cyan-800",
  "bg-sky-100 text-sky-800",
  "bg-blue-100 text-blue-800",
  "bg-indigo-100 text-indigo-800",
  "bg-violet-100 text-violet-800",
  "bg-purple-100 text-purple-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-pink-100 text-pink-800",
  "bg-rose-100 text-rose-800",
];

interface TagColorPickerProps {
  selectedColor?: string | null;
  onSelect: (color: string | null) => void;
  className?: string;
  allowNoColor?: boolean;
}

export function TagColorPicker({ 
  selectedColor, 
  onSelect, 
  className,
  allowNoColor = true 
}: TagColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {allowNoColor && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer",
            !selectedColor 
              ? "ring-2 ring-primary ring-offset-2 bg-muted text-muted-foreground" 
              : "border-border hover:bg-muted/50"
          )}
          title="Default (No color)"
        >
          <span className="text-xs">/</span>
        </button>
      )}
      
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className={cn(
            "w-8 h-8 rounded-full transition-all cursor-pointer",
            c,
            selectedColor === c 
              ? "ring-2 ring-primary ring-offset-2 scale-110" 
              : "hover:scale-105 opacity-80 hover:opacity-100"
          )}
          title="Select color"
        />
      ))}
    </div>
  );
}
