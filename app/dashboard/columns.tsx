"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Check, X, CheckCircle, XCircle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  plan_name: string;
  plan_price: number;
  due_date: string;
  last_paid_date: string | null;
  grace_cutoff: string;
  status: "paid" | "unpaid" | "overdue";
  account_status: "active" | "suspended";
};

export const columns: ColumnDef<Customer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "phone",
    header: "Phone Number",
  },
  {
    accessorKey: "plan_name",
    header: "Plan",
  },
  {
    accessorKey: "plan_price",
    header: "Monthly Fee",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("plan_price"));
      const formatted = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("due_date"));
      const formatted = date.toLocaleDateString("en-PH");
      return <div>{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Payment Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Customer["status"];
      const variantMap: Record<Customer["status"], BadgeProps["variant"]> = {
        paid: "default",
        unpaid: "secondary",
        overdue: "destructive",
      };
      return <Badge variant={variantMap[status]}>{status.toUpperCase()}</Badge>;
    },
  },
  {
    accessorKey: "account_status",
    header: "Account Status",
    cell: ({ row }) => {
      const status = row.getValue(
        "account_status"
      ) as Customer["account_status"];
      return status === "active" ? (
        <span className="flex gap-2">
            <CircleCheck className="h-5 w-5 text-primary" /> 
            Active
        </span>
      ) : (
        <span className="flex gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Inactive
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(customer.id)}
            >
              Copy Customer ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              {customer.account_status === "active"
                ? "Suspend Account"
                : "Reactivate Account"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
