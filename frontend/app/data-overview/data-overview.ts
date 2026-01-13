import type { ParsedData } from "../data-upload-form/data-upload-form.types";
import type { DataPreviewInfo } from "./data-overview.types";

export function formatDataPreview(data: unknown): DataPreviewInfo | null {
	if (!data || !Array.isArray(data) || data.length === 0) {
		return null;
	}

	const parsedData = data as ParsedData;
	const firstRow = parsedData[0];
	const columnNames = Object.keys(firstRow);

	return {
		rowCount: parsedData.length,
		columnCount: columnNames.length,
		columnNames,
		firstRow,
	};
}

export function exportToCSV(data: ParsedData, filename: string): void {
	if (!data || data.length === 0) {
		return;
	}

	const headers = Object.keys(data[0]);
	const csvRows: string[] = [];

	csvRows.push(headers.map((header) => escapeCSVValue(header)).join(","));

	for (const row of data) {
		const values = headers.map((header) => {
			const value = row[header];
			if (value === null || value === undefined) {
				return "";
			}
			return escapeCSVValue(String(value));
		});
		csvRows.push(values.join(","));
	}

	const csvContent = csvRows.join("\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);

	link.setAttribute("href", url);
	link.setAttribute(
		"download",
		filename.endsWith(".csv") ? filename : `${filename}.csv`,
	);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

function escapeCSVValue(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
