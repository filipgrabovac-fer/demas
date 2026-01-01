"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DataPreviewProps } from "./data-preview.types"

export const DataPreview = ({ data }: DataPreviewProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground sm:p-8 sm:text-base">
        No data to preview. Please upload a file.
      </div>
    )
  }

  const allColumns = new Set<string>()
  data.forEach((row) => {
    Object.keys(row).forEach((key) => allColumns.add(key))
  })
  const columns = Array.from(allColumns).sort()

  const previewRows = data.slice(0, 100)
  const totalRows = data.length
  const showingAll = totalRows <= 100

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold sm:text-lg">Data Preview</h2>
        <div className="text-xs text-muted-foreground sm:text-sm">
          {showingAll
            ? `Showing all ${totalRows} rows`
            : `Showing first 100 of ${totalRows} rows`}
        </div>
      </div>
      <div className="max-h-[400px] overflow-auto rounded-md border border-border sm:max-h-[600px]">
        <div className="min-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column}
                    className="min-w-[120px] text-xs sm:min-w-[150px] sm:text-sm"
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => {
                    const value = row[column]
                    let displayValue = ""
                    let isJson = false
                    
                    if (value === null || value === undefined) {
                      displayValue = ""
                    } else if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
                      try {
                        const parsed = JSON.parse(value)
                        displayValue = JSON.stringify(parsed, null, 2)
                        isJson = true
                      } catch {
                        displayValue = String(value)
                      }
                    } else {
                      displayValue = String(value)
                    }
                    
                    return (
                      <TableCell
                        key={column}
                        className="text-xs sm:text-sm"
                      >
                        {isJson ? (
                          <div className="max-w-[200px] sm:max-w-[400px]">
                            <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-tight sm:text-xs">
                              {displayValue}
                            </pre>
                          </div>
                        ) : (
                          <div className="max-w-[200px] truncate sm:max-w-none" title={displayValue}>
                            {displayValue}
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

