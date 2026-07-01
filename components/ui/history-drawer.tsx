"use client";

import { useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { z } from "zod";
import { Badge } from "./badge";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { CitationSchema } from "@/lib/schemas/evidence";

type Citation = z.infer<typeof CitationSchema>;

export type HistoryEntry = {
  id: string;
  query: string;
  vatRate: "zero" | "reduced" | "standard" | "exempt";
  date: string;
  citations: Citation[];
};

const RATE_LABELS: Record<HistoryEntry["vatRate"], string> = {
  zero: "Zero-rated",
  reduced: "Reduced rate · 5%",
  standard: "Standard-rated · 20%",
  exempt: "Exempt",
};

const columns: ColumnDef<HistoryEntry>[] = [
  {
    accessorKey: "query",
    header: "Supply",
    cell: ({ row }) => (
      <div className="truncate max-w-40 text-t-xs font-medium">
        {row.getValue("query")}
      </div>
    ),
  },
  {
    accessorKey: "vatRate",
    header: "Rate",
    cell: ({ row }) => {
      const rate = row.getValue("vatRate") as HistoryEntry["vatRate"];
      return (
        <Badge variant="neutral" className={`rate-badge--${rate}`}>
          {RATE_LABELS[rate]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-t-xs text-gray-500">{row.getValue("date")}</span>
    ),
  },
];

export function HistoryDrawer() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((rows: any[]) =>
        setEntries(
          rows.map((row) => ({
            id: row.id,
            query: row.query,
            vatRate: row.vatRate,
            citations: row.citations,
            date: new Date(row.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            }),
          })),
        ),
      );
  }, []);

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed right-0 top-0 h-full z-49 flex items-stretch transition-transform duration-200"
        style={{
          transform: open
            ? "translateX(0)"
            : "translateX(calc(100% - var(--drawer-tab-w)))",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close search history" : "Open search history"}
          aria-expanded={open}
          className="self-center w-(--drawer-tab-w) h-(--drawer-tab-h) bg-foreground text-background border-2 border-border flex items-center justify-center cursor-pointer"
        >
          <span className="[writing-mode:vertical-rl] rotate-180 text-t-2xs font-bold tracking-widest uppercase whitespace-nowrap">
            History
          </span>
        </button>

        <div className="w-(--history-drawer-w) h-full overflow-hidden bg-background border-l-2 border-border">
          <div
            className="w-full h-full flex flex-col"
            style={{ zoom: "var(--drawer-zoom)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-border shrink-0">
              <div>
                <p className="text-t-xs font-bold tracking-widest uppercase text-gray-500">
                  Recent
                </p>
                <p className="text-t-lg font-bold text-foreground">
                  Search history
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                aria-label="Close history panel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="font-heading sticky top-0 z-10 bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      className="bg-secondary-background text-foreground border-b-2 border-border"
                      key={headerGroup.id}
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead className="text-foreground" key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <Popover key={row.id}>
                        <PopoverTrigger asChild>
                          <TableRow className="bg-secondary-background text-foreground cursor-pointer hover:bg-background">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell className="px-4 py-2" key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          style={{ zoom: "var(--drawer-zoom)" }}
                        >
                          {row.original.citations.length > 0 ? (
                            <div className="flex flex-col divide-y divide-white/20">
                              <p className="text-t-xs font-bold py-3 tracking-widest uppercase text-white">
                                Sources
                              </p>
                              {row.original.citations.map((c, i) => (
                                <a
                                  key={i}
                                  href={c.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex flex-col gap-1 hover:opacity-80 py-3"
                                >
                                  <span className="text-t-xs text-white line-clamp-3">
                                    {c.snippet}
                                  </span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-t-xs text-white">
                              No sources available.
                            </p>
                          )}
                        </PopoverContent>
                      </Popover>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-sp-8 text-center text-t-xs text-gray-500"
                      >
                        No searches yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t-2 border-border shrink-0">
              <span className="text-t-xs text-gray-500">
                Showing{" "}
                <span className="font-bold text-foreground">
                  {entries.length}
                </span>{" "}
                searches
              </span>
              <Button variant="neutral">Clear all</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
