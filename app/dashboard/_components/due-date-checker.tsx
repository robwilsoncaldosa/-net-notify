'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { toast } from "sonner";


export function DueDateChecker() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    notifiedCustomers: number;
    suspendedCustomers: number;
    errors: string[];
  } | null>(null);

  const checkDueDates = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      const response = await fetch('/api/check-due-dates');
      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
        toast.success('Due Date Check Complete', {
          description: `Notified ${data.data.notifiedCustomers} customers and suspended ${data.data.suspendedCustomers} accounts.`,
        });
      } else {
        toast.error('Error', {
          description: data.error || 'Failed to check due dates',
        });
      }
    } catch (error) {
      console.error('Error checking due dates:', error);
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
          Check for upcoming due dates and send SMS notifications to customers
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
          onClick={checkDueDates} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Check Due Dates & Send Notifications'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}