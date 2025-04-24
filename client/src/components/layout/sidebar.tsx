import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, ChevronRight, LayoutDashboard, Package, Users, FileBarChart, Settings, LogOut, Repeat } from "lucide-react";
import { UserRole } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
      allowedRoles: Object.values(UserRole)
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: <Package className="h-5 w-5" />,
      allowedRoles: Object.values(UserRole)
    },
    {
      title: "Allocations",
      href: "/allocations",
      icon: <Repeat className="h-5 w-5" />,
      allowedRoles: Object.values(UserRole)
    },
    {
      title: "Users",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      allowedRoles: [UserRole.CEO, UserRole.ADMIN]
    },
    {
      title: "Reports",
      href: "/reports",
      icon: <FileBarChart className="h-5 w-5" />,
      allowedRoles: [UserRole.CEO, UserRole.ADMIN, UserRole.STOCK_MANAGER]
    },
  ];

  const filteredNavItems = navItems.filter(
    item => item.allowedRoles.includes(user.role as UserRole)
  );

  const initials = user.fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase();

  const sidebarContent = (
    <div className={cn("flex h-full flex-col py-4", className)}>
      <div className="px-4 py-2 flex items-center mb-6">
        <div className="flex items-center gap-2 text-primary font-semibold text-lg">
          <Package className="h-6 w-6" />
          <span>PharmStock</span>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.fullName}</p>
            <p className="text-muted-foreground text-xs">{user.role}</p>
          </div>
        </div>
      </div>

      <Separator className="mb-4" />

      <ScrollArea className="flex-1">
        <nav className="grid gap-1 px-2">
          {filteredNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => setOpen(false)}
            >
              <span
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  location === item.href ? "bg-accent text-accent-foreground" : "transparent"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
                {location === item.href && (
                  <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </span>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      
      <div className="mt-auto px-4">
        <Separator className="my-4" />
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground" 
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 bg-background w-[270px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden border-r bg-background md:flex md:w-[270px] md:flex-col md:fixed md:inset-y-0 z-30">
      {sidebarContent}
    </div>
  );
}
