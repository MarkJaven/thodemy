import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
};

const EmptyIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    className="text-slate-600"
  >
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const DataTable = <T,>({
  columns,
  data,
  emptyMessage,
  emptyIcon,
  onRowClick,
}: DataTableProps<T>) => {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-y border-white/10 px-6 py-16 text-center">
        <div className="mb-4">{emptyIcon || <EmptyIcon />}</div>
        <p className="text-sm text-slate-400">{emptyMessage || "No records available."}</p>
        <p className="mt-1 text-xs text-slate-500">Items will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full border-collapse text-left text-sm">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400 ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/5">
            {data.map((row, index) => (
              <tr
                key={`row-${index}`}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                className={`group transition-colors duration-150 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-white/[0.03]"
                    : "hover:bg-white/[0.02]"
                } ${index % 2 === 1 ? "bg-white/[0.01]" : ""}`}
              >
                {columns.map((column) => (
                  <td
                    key={`${column.key}-${index}`}
                    className={`px-5 py-4 text-slate-200 ${
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                        ? "text-center"
                        : "text-left"
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer with count */}
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-400">{data.length}</span>{" "}
          {data.length === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
};

export default DataTable;
