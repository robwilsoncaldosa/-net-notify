"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Customer } from "../page";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, XCircle, ArrowUpDown, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className=" h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "phone_number",
    header: "Phone Number",
  },
  {
    accessorKey: "plan",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Plan
          <ArrowUpDown className=" h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const plan = row.original.plan;
    //   @ts-expect-error will fix this later
      return plan ? plan.label || plan.value : "N/A";
    },
    //   @ts-expect-error will fix this later
    filterFn: (row, id, value) => {
      const plan = row.getValue(id);
    //   @ts-expect-error will fix this later
      return plan && (plan.label === value || plan.value === value);
    },
  },
  {
    accessorKey: "area",
    header: "Area",
    cell: ({ row }) => {
      const area = row.original.area;
    //   @ts-expect-error will fix this later
      return area ? area.name : "N/A";
    },
    //   @ts-expect-error will fix this later
    filterFn: (row, id, value) => {
      const area = row.getValue(id);
    //   @ts-expect-error will fix this later
      return area && area.name === value;
    },
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className=" h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dueDate = row.original.due_date;
      if (!dueDate) return "N/A";
      return format(new Date(dueDate), "MMM d, yyyy");
    },
    sortingFn: "datetime",
  },
  {
    accessorKey: "payment_status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Payment Status
          <ArrowUpDown className=" h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.original.payment_status;
      
      const statusConfig = {
        paid: {
          icon: CheckCircle,
          variant: "success" as const,
          label: "Paid"
        },
        unpaid: {
          icon: Clock,
          variant: "warning" as const,
          label: "Unpaid"
        },
        overdue: {
          icon: AlertCircle,
          variant: "destructive" as const,
          label: "Overdue"
        }
      };
      
      const config = statusConfig[status] || statusConfig.unpaid;
      const Icon = config.icon;
      
      return (
        <div className="flex items-center justify-center gap-2">
          <Badge 
    //   @ts-expect-error will fix this later
            variant={config.variant}
            className="flex items-center gap-1 px-2 py-1 border-0"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "account_status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Account Status
          <ArrowUpDown className=" h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.original.account_status;
      
      const statusConfig = {
        active: {
          icon: CheckCircle2,
          variant: "outline" as const,
          className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
          label: "Active"
        },
        suspended: {
          icon: XCircle,
          variant: "outline" as const,
          className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          label: "Suspended"
        }
      };
      
      const config = statusConfig[status] || statusConfig.active;
      const Icon = config.icon;
      
      return (
        <div className="flex items-center justify-center gap-2">
          <Badge 
            variant={config.variant}
            className={`flex items-center gap-1 px-2 py-1 ${config.className}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </Badge>
        </div>
      );
    },
  },
];