import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/organisms/NotificationBell";
import UserMenu from "@/components/organisms/UserMenu";
import { AccountStatusNavIndicator } from "@/components/molecules/AccountStatusNavIndicator";
import { RNRReminderBadge } from "@/features/candidates/components/RNRReminderBadge";
import { ProcessingRemindersBadge } from "@/features/processing/components/ProcessingRemindersBadge";
import IdleUsersNotification from "@/features/admin/components/IdleUsersNotification";
import { RecruiterNavPerformanceRating } from "@/features/candidates/components/RecruiterNavPerformanceRating";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/molecules/BrandLogo";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b relative",
        "bg-white/95 backdrop-blur-md border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
        "dark:bg-card dark:border-border dark:shadow-sm dark:backdrop-blur-none",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent dark:via-violet-500/30" />
      <div className="relative z-10 flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <BrandLogo variant="header" />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-1 hidden rounded-2xl bg-amber-400/10 blur-md sm:block"
              aria-hidden
            />
            <RecruiterNavPerformanceRating />
          </div>
          <RNRReminderBadge />
          {/* Processing team unified badge */}
          <ProcessingRemindersBadge />
          {/* <SessionAvailabilityToggles /> */}
          <IdleUsersNotification />
          <NotificationBell />
          <ThemeToggle />
          <AccountStatusNavIndicator />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
