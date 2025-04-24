import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@shared/schema";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  
  if (!user) return null;

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.CEO:
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case UserRole.ADMIN:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case UserRole.MARKETER:
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case UserRole.SALES_MANAGER:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case UserRole.STOCK_MANAGER:
        return "bg-pink-100 text-pink-800 hover:bg-pink-100";
      case UserRole.MEDICAL_REP:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const initials = user.fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center gap-4 md:pl-[270px]">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Badge variant="outline" className={`ml-2 ${getRoleBadgeColor(user.role as UserRole)}`}>
          {user.role}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4">
        <form className="relative hidden md:flex">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-8"
          />
        </form>
        
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
          <span className="sr-only">Notifications</span>
        </Button>
        
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
