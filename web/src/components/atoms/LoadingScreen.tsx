import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background dark:bg-black">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-300" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
