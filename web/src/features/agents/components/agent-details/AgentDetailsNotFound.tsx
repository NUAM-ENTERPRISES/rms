import { ArrowLeft, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

type AgentDetailsNotFoundProps = {
  onBack: () => void;
};

export function AgentDetailsNotFound({ onBack }: AgentDetailsNotFoundProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full bg-slate-100 p-6">
        <Handshake className="h-16 w-16 text-slate-300" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-slate-800">Agent Not Found</h2>
        <p className="text-slate-500 max-w-sm">
          The agent you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
      </div>
      <Button onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Button>
    </div>
  );
}
