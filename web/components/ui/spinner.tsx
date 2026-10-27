import { LoaderCircleIcon } from "lucide-react";
import { cn } from "cn";

// A spinning loader with what's on its way, e.g. "Preparando tu cuenta…".
function Spinner({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="status"
      data-slot="spinner"
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      {...props}
    >
      <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-primary" />
      {children}
    </div>
  );
}

export { Spinner };
