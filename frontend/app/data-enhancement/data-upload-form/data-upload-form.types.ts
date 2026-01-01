export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]

export type ParsedData = Record<string, string | number | boolean | null>[]

export type FileUploadState = {
  file: File | null
  parsedData: ParsedData | null
  error: string | null
  isLoading: boolean
}

