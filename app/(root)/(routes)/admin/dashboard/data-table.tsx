"use client";

import { useState, useEffect } from "react";

interface Companion {
  id: string;
  name: string;
  userName: string;
  private: boolean;
  createdAt: string;
  // ... other fields
}

interface UserUsage {
  id: string;
  userId: string;
  email: string;
  totalMoneySpent: number;
  totalSpent: number;
  availableTokens: number;
  createdAt: string;
  updatedAt: string;
}

interface Column {
  accessorKey: string;
  header: string;
  cell?: ({ row }: { row: { original: any } }) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: (Companion | UserUsage)[];
  pageSize?: number;
}

export function DataTable({ columns, data: initialData, pageSize = 10 }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data] = useState(initialData);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [initialData]);

  const totalPages = Math.ceil(initialData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = initialData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="rounded-md border border-input">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-input bg-muted">
              {columns.map((column) => (
                <th 
                  key={column.accessorKey}
                  className="p-2 md:p-4 text-left text-xs md:text-sm font-medium text-foreground whitespace-nowrap"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr key={i} className="border-b border-input hover:bg-muted/50">
                {columns.map((column) => (
                  <td 
                    key={column.accessorKey}
                    className="p-2 md:p-4 text-xs md:text-sm text-muted-foreground whitespace-nowrap"
                  >
                    {column.cell ? column.cell({ row: { original: row } }) : (row as any)[column.accessorKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-2 md:py-4 px-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 md:p-2 rounded-md disabled:opacity-50 bg-secondary text-secondary-foreground hover:opacity-90 transition"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <span className="text-xs md:text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 md:p-2 rounded-md disabled:opacity-50 bg-secondary text-secondary-foreground hover:opacity-90 transition"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
} 