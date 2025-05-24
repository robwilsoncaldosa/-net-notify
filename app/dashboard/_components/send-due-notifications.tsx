'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SendDueNotifications() {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<{
    notifiedCustomers: number;
    suspendedCustomers: number;
    errors: string[];
  } | null>(null);

  const sendNotifications = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      const notifyResponse = await fetch('/api/send-due-notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const notifyData = await notifyResponse.json();
      
      if (!notifyData.success) {
        throw new Error(notifyData.error || 'Failed to process notifications');
      }

      const { notifiedCustomers, suspendedCustomers, errors } = notifyData.data;
      
      setResult({
        notifiedCustomers: notifiedCustomers.length,
        suspendedCustomers: suspendedCustomers.length,
        errors
      });

      if (errors.length === 0) {
        toast.success('Notifications Sent Successfully', {
          description: `Notified ${notifiedCustomers.length} customers and suspended ${suspendedCustomers.length} accounts.`,
        });
      } else {
        toast.warning('Notifications Sent with Errors', {
          description: `Completed with ${errors.length} errors. Check the error log for details.`,
        });
      }

      toast.info('Refresh Required', {
        description: 'Please refresh the page to see the updated customer statuses.',
      });

    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Bell className="h-5 w-5" />
        Send SMS to Overdue Customers
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Due Date Notifications
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="mt-2">
              <AlertDescription className="text-sm">
                <p className="font-medium mb-1">This action will:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Send SMS to customers with due dates within 3 days</li>
                  <li>Send SMS to customers with due dates tomorrow or today</li>
                  <li>Mark overdue accounts as "overdue" payment status</li>
                  <li>Suspend accounts that are significantly overdue</li>
                </ul>
                <p className="mt-2 text-xs italic flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Refresh the page after processing to see status updates
                </p>
              </AlertDescription>
            </Alert>

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

            <Button 
              onClick={sendNotifications} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Notifications and Updates...
                </>
              ) : (
                'Process Due Date Notifications'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}