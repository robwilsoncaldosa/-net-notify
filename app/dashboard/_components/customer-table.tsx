"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Area, Customer, Plan } from "../page";
import { createClient } from "@/utils/supabase/client";
import { CustomerDialog } from "./customer-dialog";
import { DataTable } from "../data-table";
import { columns } from "./customer-columns";
import { Pencil, Trash2, MoreHorizontal, CheckCircle, MousePointer, Info, MessageSquare, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmsTemplateDialog } from "./sms-template-dialog"; // We'll create this component
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SendDueNotifications } from "./send-due-notifications";

// Update the props interface to include plans and areas
interface CustomerTableProps {
  initialCustomers: Customer[];
  plans: Plan[];
  areas: Area[];
}

export default function CustomerTable({
  initialCustomers,
  plans,
  areas,
}: CustomerTableProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const supabase = createClient();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      const { error } = await supabase.from("customer").delete().eq("id", id);

      if (!error) {
        setCustomers(customers.filter((customer) => customer.id !== id));
      }
    }
  };

  const handleEdit = (customer: Customer) => {
    // Ensure the customer object has all required properties
    const customerToEdit = {
      ...customer,
      // Make sure plan and area are properly structured
      plan: typeof customer.plan === 'object' ? customer.plan : { id: customer.plan as unknown as number },
      area: typeof customer.area === 'object' ? customer.area : { id: customer.area as unknown as number },
    };
    //   @ts-expect-error will fix this later
    setEditingCustomer(customerToEdit);
    setIsDialogOpen(true);
  };

  // When saving a customer, handle the foreign key relationships
  const handleSave = async (customerData: Partial<Customer>) => {
    try {
      console.log('Saving customer data:', customerData);

      // If updating a customer
      if (editingCustomer) {
        const { data, error } = await supabase
          .from("customer")
          .update({
            name: customerData.name,
            phone_number: customerData.phone_number,
            plan: customerData.plan, // This should be just the ID
            area: customerData.area, // This should be just the ID
            due_date: customerData.due_date,
            payment_status: customerData.payment_status,
            account_status: customerData.account_status,
          })
          .eq("id", editingCustomer.id)
          .select(`*, plan:plan(*), area:area(*)`);

        if (error) {
          console.error('Error updating customer:', error);
          return;
        }

        if (data && data.length > 0) {
          // Make sure we're updating with the correct structure
          setCustomers(
            customers.map((c) => (c.id === editingCustomer.id ? data[0] : c))
          );
        }
      }
      // If creating a new customer
      else {
        const { data, error } = await supabase
          .from("customer")
          .insert({
            name: customerData.name,
            phone_number: customerData.phone_number,
            plan: customerData.plan,
            area: customerData.area, // This is causing the constraint violation
            due_date: customerData.due_date,
            payment_status: customerData.payment_status,
            account_status: customerData.account_status,
          })
          .select(`*, plan:plan(*), area:area(*)`);

        if (error) {
          console.error('Error creating customer:', error);
          return;
        }

        if (data) {
          setCustomers([...customers, data[0]]);
        }
      }
      setIsDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Exception in handleSave:', error);
    }
  };
  // Create a new columns definition with actions
  const tableColumns = [
    ...columns,

  ];
  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsPaymentDialogOpen(true);
  };

  const handleMarkAsPaid = async (customer: Customer) => {
    try {
      // Calculate new due date (1 month from now)
      const currentDate = new Date(customer.due_date || new Date());
      const newDueDate = new Date(currentDate);
      newDueDate.setMonth(newDueDate.getMonth() + 1);

      // Update the customer record
      const { data, error } = await supabase
        .from("customer")
        .update({
          payment_status: "paid",
          account_status: "active",
          due_date: newDueDate.toISOString(),
        })
        .eq("id", customer.id)
        .select(`*, plan:plan(*), area:area(*)`);

      if (error) {
        console.error('Error updating payment status:', error);
        return;
      }

      if (data && data.length > 0) {
        // Update the customers state
        setCustomers(
          customers.map((c) => (c.id === customer.id ? data[0] : c))
        );
      }

      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error('Exception in handleMarkAsPaid:', error);
    }
  };
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setIsDialogOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsSmsDialogOpen(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Manage SMS Templates
        </Button>
        <SendDueNotifications />

      </div>

      <DataTable
        columns={tableColumns}
        data={customers}
        onRowClick={handleRowClick}
      />

      <CustomerDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customer={editingCustomer}
        onSave={handleSave}
        plans={plans}
        areas={areas}
      />

      <SmsTemplateDialog
        open={isSmsDialogOpen}
        onOpenChange={setIsSmsDialogOpen}
        areas={areas}
      />

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-700" />
        <AlertDescription className="text-blue-700 mt-1">
          Click on any customer row to view options for editing, deleting, or processing payments. When marking a customer as paid, their payment status and due date will be automatically updated.
        </AlertDescription>
      </Alert>
      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Actions</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selected customer: <span className="font-medium">{selectedCustomer?.name}</span>
            </p>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => {
                if (selectedCustomer) {
                  handleEdit(selectedCustomer);
                  setIsPaymentDialogOpen(false);
                }
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Customer
              </Button>
              <Button variant="destructive" onClick={() => {
                if (selectedCustomer) {
                  handleDelete(selectedCustomer.id);
                  setIsPaymentDialogOpen(false);
                }
              }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Customer
              </Button>
              {selectedCustomer?.payment_status !== "paid" && (
                <Button variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100" onClick={() => {
                  if (selectedCustomer) {
                    handleMarkAsPaid(selectedCustomer);
                  }
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
