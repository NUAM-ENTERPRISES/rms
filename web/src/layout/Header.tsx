import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/organisms/NotificationBell";
import UserMenu from "@/components/organisms/UserMenu";
import { RNRReminderBadge } from "@/features/candidates/components/RNRReminderBadge";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0e1a] border-b border-violet-500/20">
      <div className="relative z-10 flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden text-violet-200 hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <img src="/logo.png" alt="Affiniks RMS" className="h-11 object-contain" />
        </div>

        <div className="flex items-center gap-3">
          <RNRReminderBadge />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
