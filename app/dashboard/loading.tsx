import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}