"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Area, Customer, Plan } from "../page";
import { createClient } from "@/utils/supabase/client";
import { CustomerDialog } from "./customer-dialog";
import { DataTable } from "../data-table";
import { columns } from "./customer-columns";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmsTemplateDialog } from "./sms-template-dialog"; // We'll create this component

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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => {
        const customer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(customer.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setIsDialogOpen(true);
          }}
        >
          Add Customer
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsSmsDialogOpen(true)}
        >
          Manage SMS Templates
        </Button>
      </div>
    
      <DataTable columns={tableColumns} data={customers} />

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
    </div>
  );
}
