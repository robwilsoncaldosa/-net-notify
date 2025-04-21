"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plan } from "../page";
import { createClient } from "@/utils/supabase/client";
import { PlanDialog } from "./plan-dialog";
import { DataTable } from "../data-table";
import { columns } from "./plan-columns";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner"; // Changed from useToast hook to direct import

export function PlanTable() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const supabase = createClient();
  // Removed useToast hook

  // Fetch plans on component mount
  useEffect(() => {
    fetchPlans();
  }, []);

  // Set up event listeners for edit and delete actions
  useEffect(() => {
    const handleEditPlan = (e: CustomEvent<Plan>) => {
      setEditingPlan(e.detail);
      setIsDialogOpen(true);
    };

    const handleDeletePlan = async (e: CustomEvent<Plan>) => {
      if (confirm(`Are you sure you want to delete ${e.detail.label}?`)) {
        await deletePlan(e.detail.id);
      }
    };

    document.addEventListener('edit-plan', handleEditPlan as EventListener);
    document.addEventListener('delete-plan', handleDeletePlan as unknown as EventListener);

    return () => {
      document.removeEventListener('edit-plan', handleEditPlan as EventListener);
      document.removeEventListener('delete-plan', handleDeletePlan as unknown as EventListener);
    };
  }, []);

  // Fetch all plans from the database
  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("plan")
      .select("*")
      .order("id");

    if (error) {
      toast.error("Error fetching plans", {
        description: error.message,
      });
      return;
    }

    setPlans(data || []);
  };

  // Delete a plan
  const deletePlan = async (id: number) => {
    const { error } = await supabase
      .from("plan")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error deleting plan", {
        description: error.message,
      });
      return;
    }

    setPlans(plans.filter((plan) => plan.id !== id));
    toast.success("Plan deleted", {
      description: "The plan has been deleted successfully.",
    });
  };

  // Handle saving a plan (create or update)
  const handleSave = async (planData: Partial<Plan>) => {
    try {
      // If updating a plan
      if (editingPlan) {
        const { data, error } = await supabase
          .from("plan")
          .update({
            label: planData.label,
    //   @ts-expect-error will fix this later
            value: planData.value,
          })
          .eq("id", editingPlan.id)
          .select();
        
        if (error) {
          toast.error("Error updating plan", {
            description: error.message,
          });
          return;
        }
        
        if (data) {
          setPlans(
            plans.map((p) => (p.id === editingPlan.id ? data[0] : p))
          );
          toast.success("Plan updated", {
            description: "The plan has been updated successfully.",
          });
        }
      } 
      // If creating a new plan
      else {
        const { data, error } = await supabase
          .from("plan")
          .insert({
            label: planData.label,
    //   @ts-expect-error will fix this later
            value: planData.value,
          })
          .select();
        
        if (error) {
          toast.error("Error creating plan", {
            description: error.message,
          });
          return;
        }
        
        if (data) {
          setPlans([...plans, data[0]]);
          toast.success("Plan created", {
            description: "The plan has been created successfully.",
          });
        }
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "An unexpected error occurred",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Internet Plans</h2>
        <Button onClick={() => {
          setEditingPlan(null);
          setIsDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </div>
      
      <DataTable columns={columns} data={plans} />
      
      <PlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plan={editingPlan}
        onSave={handleSave}
      />
    </div>
  );
}