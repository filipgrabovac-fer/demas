"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ParsedData } from "./data-upload-form.types"
import { detectFileType, parseCSV, parseJSON } from "./data-upload-form"

export type DataUploadFormProps = {
  onDataParsed: (data: ParsedData) => void
  onError: (error: string) => void
}

export const DataUploadForm = ({
  onDataParsed,
  onError,
}: DataUploadFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    onError("")

    try {
      const fileType = detectFileType(file)
      let parsedData: ParsedData

      if (fileType === "csv") {
        parsedData = await parseCSV(file)
      } else {
        parsedData = await parseJSON(file)
      }

      if (parsedData.length === 0) {
        throw new Error("File contains no data")
      }

      onDataParsed(parsedData)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to parse file"
      onError(errorMessage)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="file-upload" className="text-sm sm:text-base">
          Upload Data File
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <Input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={handleButtonClick}
            disabled={isLoading}
            variant="default"
            className="w-full sm:w-auto"
            size="default"
          >
            {isLoading ? "Processing..." : "Choose File"}
          </Button>
          <span className="text-xs text-muted-foreground sm:text-sm">
            CSV or JSON files only
          </span>
        </div>
      </div>
    </div>
  )
}

