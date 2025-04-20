

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { Users, MapPin, Package, MessageSquare, UserPlus, Trash, Edit, Database } from "lucide-react";
import Link from "next/link";
import { Overview } from "./_components/overview";

export interface Customer {
  id: number;
  name: string;
  phone_number: string;
  address: string;
  plan: number;
  area: number;
  payment_status: "paid" | "unpaid" | "overdue";
  account_status: "active" | "suspended";
  due_date: string;
}

export interface Plan {
  id: number;
  label: string;
  price: number;
  description?: string;
}

export interface Area {
  id: number;
  name: string;
}

// Interface for activity items
interface ActivityItem {
  id: number;
  description: string;
  created_at: string;
  type: string;
}

// Updated ActivityItem interface
interface ActivityItem {
  id: string;
  timestamp: string;
  action: string;
  schema: string;
  table: string;
  record_id?: string;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState({
    customers: 0,
    areas: 0,
    plans: 0,
    messages: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCounts() {
      // Fetch customer count
      const { count: customerCount, error: customerError } = await supabase
        .from("customer")
        .select("*", { count: "exact", head: true });

      // Fetch area count
      const { count: areaCount, error: areaError } = await supabase
        .from("area")
        .select("*", { count: "exact", head: true });

      // Fetch plan count
      const { count: planCount, error: planError } = await supabase
        .from("plan")
        .select("*", { count: "exact", head: true });

      // Fetch message count (assuming you have a messages table)
      // If you don't have a messages table yet, you can set this to 0
      const { count: messageCount, error: messageError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      setCounts({
        customers: customerCount || 0,
        areas: areaCount || 0,
        plans: planCount || 0,
        messages: messageCount || 0,
      });
    }

    async function fetchRecentActivities() {
      setIsLoading(true);
      try {
        // Fetch recent database changes from Supabase's audit log
        const { data, error } = await supabase.from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching audit logs:", error);
          
          // Fallback to mock data if audit logs are not accessible
          const mockActivities = [
            {
              id: '1',
              timestamp: new Date().toISOString(),
              action: 'INSERT',
              schema: 'public',
              table: 'customer',
              record_id: '123'
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              action: 'UPDATE',
              schema: 'public',
              table: 'plan',
              record_id: '456'
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              action: 'DELETE',
              schema: 'public',
              table: 'messages',
              record_id: '789'
            }
          ];
          setRecentActivities(mockActivities);
          return;
        }

        if (data) {
          setRecentActivities(data);
        }
      } catch (error) {
        console.error("Error processing activities:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCounts();
    fetchRecentActivities();
  }, [supabase]);

  // Function to format the relative time (e.g., "2 hours ago")
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    } else {
      return activityTime.toLocaleDateString();
    }
  };

  // Function to get appropriate icon for activity
  const getActivityIcon = (action: string, table: string) => {
    switch (action) {
      case 'INSERT':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'DELETE':
        return <Trash className="h-4 w-4 text-red-500" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  // Function to format activity description
  const getActivityDescription = (activity: ActivityItem) => {
    const action = activity.action.toLowerCase();
    const table = activity.table;
    
    switch (action) {
      case 'insert':
        return `Added a new ${table.replace('_', ' ')}`;
      case 'delete':
        return `Removed a ${table.replace('_', ' ')}`;
      case 'update':
        return `Updated a ${table.replace('_', ' ')}`;
      default:
        return `${action} operation on ${table}`;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/customers">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.customers}</div>
              <p className="text-xs text-muted-foreground">
                Manage your customer base
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/areas">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Service Areas
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.areas}</div>
              <p className="text-xs text-muted-foreground">
                Locations you provide service to
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/plans">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Internet Plans
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.plans}</div>
              <p className="text-xs text-muted-foreground">
                Available service packages
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/send-sms">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Messages Sent
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.messages}</div>
              <p className="text-xs text-muted-foreground">
                SMS notifications sent to customers
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Customer growth over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-muted-foreground">Loading activities...</p>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-4 border-b border-border/40 pb-3 last:border-0">
                    <div className="mt-0.5">
                      {getActivityIcon(activity.action, activity.table)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {getActivityDescription(activity)}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          <span className="px-1.5 py-0.5 bg-muted rounded text-xs mr-2">{activity.table}</span>
                          {activity.record_id && <span>ID: {activity.record_id}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{getRelativeTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-40">
                <p className="text-muted-foreground">No recent activities found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
