'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

export function SendDueNotifications() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    notifiedCustomers: number;
    suspendedCustomers: number;
    errors: string[];
  } | null>(null);

  const sendNotifications = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      const response = await fetch('/api/send-due-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysAhead: 3, checkOverdue: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          notifiedCustomers: data.data.notifiedCustomers.length,
          suspendedCustomers: data.data.suspendedCustomers.length,
          errors: data.data.errors
        });
        toast.success('Notifications Sent Successfully', {
          description: `Notified ${data.data.notifiedCustomers.length} customers and suspended ${data.data.suspendedCustomers.length} accounts.`,
        });
      } else {
        toast.error('Error', {
          description: data.error || 'Failed to send notifications',
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Error', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Due Date Notifications
        </CardTitle>
        <CardDescription>
          Send notifications for upcoming due dates and manage overdue accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                {result.notifiedCustomers} Notified
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
                {result.suspendedCustomers} Suspended
              </Badge>
            </div>
            
            {result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Errors ({result.errors.length})</h4>
                <div className="max-h-32 overflow-y-auto text-sm bg-muted p-2 rounded">
                  {result.errors.map((error, i) => (
                    <div key={i} className="text-xs text-muted-foreground mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={sendNotifications} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Send Due Date Notifications'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}