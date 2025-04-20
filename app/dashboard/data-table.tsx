"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useState, useEffect } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [tableInitialized, setTableInitialized] = useState(false);
  
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];

  // Initialize the table
  const table = useReactTable({
    data: safeData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: false,
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Set table as initialized after it's created
  useEffect(() => {
    setTableInitialized(true);
  }, []);

  // Only check for columns after table is initialized
  const hasNameColumn = tableInitialized && !!table.getColumn("name");
  const hasPlanColumn = tableInitialized && !!table.getColumn("plan");
  const hasAreaColumn = tableInitialized && !!table.getColumn("area");
  const hasPaymentStatusColumn = tableInitialized && !!table.getColumn("payment_status");
  const hasAccountStatusColumn = tableInitialized && !!table.getColumn("account_status");
  const hasPriceColumn = tableInitialized && !!table.getColumn("price");

  // Extract unique values only if table is initialized and columns exist
  const uniquePlans = tableInitialized && hasPlanColumn
    ? Array.from(
        new Set(
          safeData.map((row: any) => {
            const plan = row.plan;
            return plan ? (plan.label || plan.value) : null;
          })
        )
      ).filter(Boolean)
    : [];

  const uniqueAreas = tableInitialized && hasAreaColumn
    ? Array.from(
        new Set(
          safeData.map((row: any) => {
            const area = row.area;
            return area ? area.name : null;
          })
        )
      ).filter(Boolean)
    : [];

  const paymentStatuses = ["paid", "unpaid", "overdue"];
  const accountStatuses = ["active", "suspended"];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Only show filters if table is initialized */}
          {tableInitialized && (
            <>
              {/* Name filter */}
              {hasNameColumn && (
                <Input
                  placeholder="Filter names..."
                  value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
              )}

              {/* Plan filter */}
              {hasPlanColumn && uniquePlans.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-xs sm:text-sm">
                      {table.getColumn("plan")?.getFilterValue()
                        ? `Plan: ${table.getColumn("plan")?.getFilterValue()}`
                        : "Filter by Plan"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem
                      checked={!table.getColumn("plan")?.getFilterValue()}
                      onCheckedChange={() => 
                        table.getColumn("plan")?.setFilterValue(undefined)
                      }
                    >
                      All Plans
                    </DropdownMenuCheckboxItem>
                    {uniquePlans.map((plan) => (
                      <DropdownMenuCheckboxItem
                        key={plan}
                        checked={table.getColumn("plan")?.getFilterValue() === plan}
                        onCheckedChange={() => 
                          table.getColumn("plan")?.setFilterValue(
                            table.getColumn("plan")?.getFilterValue() === plan 
                              ? undefined 
                              : plan
                          )
                        }
                      >
                        {plan}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Area filter */}
              {hasAreaColumn && uniqueAreas.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-xs sm:text-sm">
                      {table.getColumn("area")?.getFilterValue()
                        ? `Area: ${table.getColumn("area")?.getFilterValue()}`
                        : "Filter by Area"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem
                      checked={!table.getColumn("area")?.getFilterValue()}
                      onCheckedChange={() => 
                        table.getColumn("area")?.setFilterValue(undefined)
                      }
                    >
                      All Areas
                    </DropdownMenuCheckboxItem>
                    {uniqueAreas.map((area) => (
                      <DropdownMenuCheckboxItem
                        key={area}
                        checked={table.getColumn("area")?.getFilterValue() === area}
                        onCheckedChange={() => 
                          table.getColumn("area")?.setFilterValue(
                            table.getColumn("area")?.getFilterValue() === area 
                              ? undefined 
                              : area
                          )
                        }
                      >
                        {area}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Payment status filter */}
              {hasPaymentStatusColumn && (
                <div className="flex flex-wrap gap-2">
                  {paymentStatuses.map((status) => (
                    <Button
                      key={status}
                      variant={
                        table.getColumn("payment_status")?.getFilterValue() === status
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        const currentFilter = table
                          .getColumn("payment_status")
                          ?.getFilterValue();
                        table
                          .getColumn("payment_status")
                          ?.setFilterValue(
                            currentFilter === status ? undefined : status
                          );
                      }}
                      className="text-xs sm:text-sm"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              )}

              {/* Account status filter */}
              {hasAccountStatusColumn && (
                <div className="flex flex-wrap gap-2">
                  {accountStatuses.map((status) => (
                    <Button
                      key={status}
                      variant={
                        table.getColumn("account_status")?.getFilterValue() === status
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        const currentFilter = table
                          .getColumn("account_status")
                          ?.getFilterValue();
                        table
                          .getColumn("account_status")
                          ?.setFilterValue(
                            currentFilter === status ? undefined : status
                          );
                      }}
                      className="text-xs sm:text-sm"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border overflow-hidden">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id}
                      className="font-semibold text-center py-3"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className="text-center py-3"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
