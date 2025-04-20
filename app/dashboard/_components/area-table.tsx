"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Area } from "../page";
import { createClient } from "@/utils/supabase/client";
import { AreaDialog } from "./area-dialog";
import { DataTable } from "../data-table";
import { columns } from "./area-columns";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner"; // Changed from useToast hook to direct import

export function AreaTable() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const supabase = createClient();
  // Removed useToast hook

  // Fetch areas on component mount
  useEffect(() => {
    fetchAreas();
  }, []);

  // Set up event listeners for edit and delete actions
  useEffect(() => {
    const handleEditArea = (e: CustomEvent<Area>) => {
      setEditingArea(e.detail);
      setIsDialogOpen(true);
    };

    const handleDeleteArea = async (e: CustomEvent<Area>) => {
      if (confirm(`Are you sure you want to delete ${e.detail.name}?`)) {
        await deleteArea(e.detail.id);
      }
    };

    document.addEventListener('edit-area', handleEditArea as EventListener);
    document.addEventListener('delete-area', handleDeleteArea as unknown as EventListener);

    return () => {
      document.removeEventListener('edit-area', handleEditArea as EventListener);
      document.removeEventListener('delete-area', handleDeleteArea as unknown as EventListener);
    };
  }, []);

  // Fetch all areas from the database
  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from("area")
      .select("*")
      .order("id");

    if (error) {
      toast.error("Error fetching areas", {
        description: error.message,
      });
      return;
    }

    setAreas(data || []);
  };

  // Delete an area
  const deleteArea = async (id: number) => {
    const { error } = await supabase
      .from("area")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error deleting area", {
        description: error.message,
      });
      return;
    }

    setAreas(areas.filter((area) => area.id !== id));
    toast.success("Area deleted", {
      description: "The area has been deleted successfully.",
    });
  };

  // Handle saving an area (create or update)
  const handleSave = async (areaData: Partial<Area>) => {
    try {
      // If updating an area
      if (editingArea) {
        const { data, error } = await supabase
          .from("area")
          .update({
            name: areaData.name,
          })
          .eq("id", editingArea.id)
          .select();
        
        if (error) {
          toast.error("Error updating area", {
            description: error.message,
          });
          return;
        }
        
        if (data) {
          setAreas(
            areas.map((a) => (a.id === editingArea.id ? data[0] : a))
          );
          toast.success("Area updated", {
            description: "The area has been updated successfully.",
          });
        }
      } 
      // If creating a new area
      else {
        const { data, error } = await supabase
          .from("area")
          .insert({
            name: areaData.name,
          })
          .select();
        
        if (error) {
          toast.error("Error creating area", {
            description: error.message,
          });
          return;
        }
        
        if (data) {
          setAreas([...areas, data[0]]);
          toast.success("Area created", {
            description: "The area has been created successfully.",
          });
        }
      }
      setIsDialogOpen(false);
      setEditingArea(null);
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "An unexpected error occurred",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Areas</h2>
        <Button onClick={() => {
          setEditingArea(null);
          setIsDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Area
        </Button>
      </div>
      
      <DataTable columns={columns} data={areas} />
      
      <AreaDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        area={editingArea}
        onSave={handleSave}
      />
    </div>
  );
}