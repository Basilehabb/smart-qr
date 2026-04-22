import { cn } from "@/lib/utils";

export function IconButton({ children, className, ...props }: any) {
  return (
    <button
      className={cn(
        "p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
