import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Outlet } from 'react-router-dom';

export const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-black">
        {/* Left Sidebar */}
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0 flex flex-col p-0">
          {/* optional top trigger / header */}
          <header className="flex items-center justify-between mb-4 mt-0">
            <SidebarTrigger />
          </header>

          <div className="flex-1 min-w-0 overflow-y-auto p-3">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
