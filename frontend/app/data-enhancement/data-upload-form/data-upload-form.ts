import type {
	ParsedData,
	JsonValue,
	JsonObject,
	JsonArray,
} from "./data-upload-form.types";

export function detectFileType(file: File): "csv" | "json" {
	const extension = file.name.split(".").pop()?.toLowerCase();
	if (extension === "csv") return "csv";
	if (extension === "json") return "json";
	throw new Error("Unsupported file type. Please upload a CSV or JSON file.");
}

function normalizeJsonValue(
	value: JsonValue,
): string | number | boolean | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return JSON.stringify(value);
	}

	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	return String(value);
}

function preserveJsonStructure(
	obj: JsonObject,
): Record<string, string | number | boolean | null> {
	const preserved: Record<string, string | number | boolean | null> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (value === null || value === undefined) {
			preserved[key] = null;
		} else if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			preserved[key] = value;
		} else if (Array.isArray(value) || typeof value === "object") {
			preserved[key] = JSON.stringify(value);
		} else {
			preserved[key] = String(value);
		}
	}

	return preserved;
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === "," && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}

	result.push(current.trim());
	return result;
}

export async function parseCSV(file: File): Promise<ParsedData> {
	const text = await file.text();
	const lines = text
		.trim()
		.split(/\r?\n/)
		.filter((line) => line.trim());

	if (lines.length === 0) {
		throw new Error("CSV file is empty");
	}

	const firstLineValues = parseCSVLine(lines[0]);
	const hasHeaders = !firstLineValues.every((cell) => {
		const trimmed = cell.trim();
		return !isNaN(Number(trimmed)) || trimmed === "";
	});

	let headers: string[];
	let dataLines: string[];

	if (hasHeaders) {
		headers = firstLineValues.map((h) => h.trim().replace(/^"|"$/g, ""));
		dataLines = lines.slice(1);
	} else {
		headers = firstLineValues.map((_, index) => `column_${index + 1}`);
		dataLines = lines;
	}

	const parsed: ParsedData = [];

	for (const line of dataLines) {
		if (!line.trim()) continue;

		const values = parseCSVLine(line);
		const row: Record<string, string | number | boolean | null> = {};

		headers.forEach((header, index) => {
			let value = values[index] || "";
			value = value.replace(/^"|"$/g, "");

			if (value === "") {
				row[header] = null;
			} else if (!isNaN(Number(value)) && value !== "" && value.trim() !== "") {
				const numValue = Number(value);
				if (Number.isInteger(numValue)) {
					row[header] = numValue;
				} else {
					row[header] = numValue;
				}
			} else if (
				value.toLowerCase() === "true" ||
				value.toLowerCase() === "false"
			) {
				row[header] = value.toLowerCase() === "true";
			} else {
				row[header] = value;
			}
		});

		parsed.push(row);
	}

	return parsed;
}

export async function parseJSON(file: File): Promise<ParsedData> {
	const text = await file.text();
	let data: unknown;

	try {
		data = JSON.parse(text);
	} catch (error) {
		throw new Error("Invalid JSON file. Please check the file format.");
	}

	if (data === null || data === undefined) {
		throw new Error("JSON file contains null or undefined");
	}

	if (Array.isArray(data)) {
		if (data.length === 0) {
			throw new Error("JSON array is empty");
		}

		const parsed: ParsedData = [];

		for (const item of data) {
			if (item === null || item === undefined) {
				parsed.push({});
				continue;
			}

			if (typeof item === "object" && !Array.isArray(item)) {
				const preserved = preserveJsonStructure(item as JsonObject);
				parsed.push(preserved);
			} else if (Array.isArray(item)) {
				parsed.push({ value: JSON.stringify(item) });
			} else {
				parsed.push({ value: normalizeJsonValue(item) });
			}
		}

		return parsed;
	}

	if (typeof data === "object") {
		const preserved = preserveJsonStructure(data as JsonObject);
		return [preserved];
	}

	if (
		typeof data === "string" ||
		typeof data === "number" ||
		typeof data === "boolean"
	) {
		return [{ value: normalizeJsonValue(data) }];
	}

	throw new Error(
		"JSON file must contain an object, array, or primitive value",
	);
}
