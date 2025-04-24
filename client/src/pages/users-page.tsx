import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserRole } from "@shared/schema";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  const filteredUsers = users?.filter(
    user => user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
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
  
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[270px]">
        <Header title="Users" />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-xl font-semibold">User Management</h1>
            
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage users across different roles in the organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(user.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.fullName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getRoleBadgeColor(user.role as UserRole)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.department || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6">
                            {searchQuery 
                              ? "No users found matching your search."
                              : "No users found."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
