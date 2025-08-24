import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useLogoutMutation } from '@/services/authApi'
import { clearCredentials } from '@/features/auth/authSlice'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Settings } from 'lucide-react'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const [logout] = useLogoutMutation()

  if (!user) return null

  const handleLogout = async () => {
    try {
      await logout().unwrap()
      dispatch(clearCredentials())
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      // Even if logout API fails, clear local state
      dispatch(clearCredentials())
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPrimaryRole = () => {
    // Return the highest priority role
    const rolePriority = ['CEO', 'Director', 'Manager', 'Team Head', 'Team Lead', 'Recruiter']
    return user.roles.find(role => rolePriority.includes(role)) || user.roles[0] || 'User'
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">
                {getPrimaryRole()}
              </Badge>
              {user.roles.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  +{user.roles.length - 1} more
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        {user.permissions.includes('manage:users') && (
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
