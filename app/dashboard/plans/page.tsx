"use client";

import { PlanTable } from "../_components/plan-table";

export default function PlansPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Internet Plans</h1>
      <PlanTable />
    </div>
  );
}