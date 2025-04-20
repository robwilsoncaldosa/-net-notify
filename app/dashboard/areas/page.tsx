"use client";

import { AreaTable } from "../_components/area-table";

export default function AreasPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Areas</h1>
      <AreaTable />
    </div>
  );
}