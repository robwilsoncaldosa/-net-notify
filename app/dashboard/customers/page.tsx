
import { createClient } from "@/utils/supabase/server";
import CustomerTable from "../_components/customer-table";
import { Customer, Plan, Area } from "../page";
import { SendDueNotifications } from "../_components/send-due-notifications";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MousePointer } from "lucide-react";

export default async function CustomersPage() {
  const supabase = await createClient();
  
  // Fetch customers with their related plan and area data
  const { data: customers, error: customersError } = await supabase.from("customer")
    .select(`
      *,
      plan:plan(*),
      area:area(*)
    `)
    .order("id");
    
  // Fetch all plans for the dropdown
  const { data: plans, error: plansError } = await supabase
    .from("plan")
    .select("*")
    .order("id");
    
  // Fetch all areas for the dropdown
  const { data: areas, error: areasError } = await supabase
    .from("area")
    .select("*")
    .order("id");
  
  if (customersError || plansError || areasError) {
    console.error("Error fetching data:", { customersError, plansError, areasError });
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Customers</h1>

      <div className="flex gap-2">
      </div>
      <CustomerTable 
        initialCustomers={customers || []} 
        plans={plans || []} 
        areas={areas || []} 
      />
    </div>
  );
}