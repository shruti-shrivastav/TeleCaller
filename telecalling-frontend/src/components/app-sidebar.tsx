import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users2,
  UsersRound,
  UserCog,
  PhoneOutgoing,
  PhoneCall,
  Target,
  Bell,
  ActivitySquare,
  BarChart3,
  LogOut,
  ChevronUp,
  Group,
  TargetIcon,
  MailQuestion,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const AppSidebar = () => {
  const { user, role, logout } = useAuth();

  const commonMain = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Leads', icon: UsersRound, path: '/leads?page=1&pageSize=10' },
];

const adminMenu = [
  ...commonMain,
  { label: 'Telecallers', icon: PhoneOutgoing, path: '/telecallers' },
  { label: 'Leaders', icon: UserCog, path: '/leaders' },
  // { label: 'Goals', icon: Target, path: '/goals' },
  // { label: 'Activity Logs', icon: ActivitySquare, path: '/activity' },
  { label: 'Performance', icon: TargetIcon, path: '/calls' },
  // { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Users', icon: Users2, path: '/users' },
  { label: 'Website Enquiries', icon: MailQuestion, path: '/web-enquiries' },
];

const leaderMenu = [
  ...commonMain,
  { label: 'My Team', icon: Group, path: '/team' },
  // { label: 'Goals', icon: Target, path: '/goals' },
  { label: 'Performance', icon: TargetIcon, path: '/calls' },
  // { label: 'Activity', icon: ActivitySquare, path: '/activity' },
];

const telecallerMenu = [
  ...commonMain,
  // { label: 'Call Logs', icon: PhoneCall, path: '/calls' },
  { label: 'My Team', icon: Group, path: '/team' },
  // { label: 'Goals', icon: Target, path: '/goals' },
  // { label: 'Notifications', icon: Bell, path: '/notifications' },
];

  const items =
    role === 'admin'
      ? adminMenu
      : role === 'leader'
      ? leaderMenu
      : telecallerMenu;

  /** ---------- Render ---------- */
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>TeleCRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ label, icon: Icon, path }) => (
                <SidebarMenuItem key={path}>
                  <NavLink to={path}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={label}
                        className="truncate"
                      >
                        <Icon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ---------- Footer with dropdown ---------- */}
      <SidebarFooter className="border-t border-border bg-muted/30 py-2 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-md focus:outline-none">
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarImage
                    src={user?.avatar || undefined}
                    alt={user?.fullName}
                  />
                  <AvatarFallback>
                    {user?.fullName?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                    {user?.fullName || user?.email}
                  </span>

                  {/* 🎨 Role badge */}
                  <span
                    className={`inline-flex items-center w-fit mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                      role === 'admin'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
                        : role === 'leader'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                        : role === 'telecaller'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
                        : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {role}
                  </span>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 opacity-60 shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" className="w-56">
            <DropdownMenuLabel className="text-sm font-semibold truncate">
              {user?.fullName || 'My Account'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/calls">My Call Logs</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/activity">Recent Activity</NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/notifications">Notifications</NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
