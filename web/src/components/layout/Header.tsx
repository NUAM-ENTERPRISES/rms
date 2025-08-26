import { useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Settings } from "lucide-react";
import { useAppDispatch } from "@/app/hooks";
import { clearCredentials } from "@/features/auth/authSlice";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";

export function Header() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    try {
      await dispatch(authApi.endpoints.logout.initiate()).unwrap();
      dispatch(clearCredentials());
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const isAdmin =
    user?.roles.includes("CEO") || user?.roles.includes("Director");
  const isManager = isAdmin || user?.roles.includes("Manager");

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Affiniks RMS</h2>
        {isAdmin && (
          <Badge variant="destructive" className="text-xs">
            Admin
          </Badge>
        )}
        {isManager && !isAdmin && (
          <Badge variant="secondary" className="text-xs">
            Manager
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {user?.name} ({user?.email})
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
