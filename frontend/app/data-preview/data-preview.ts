import type { ParsedData } from "../data-upload-form/data-upload-form.types";
import type { ColumnMetadataMap } from "./data-preview.types";

export function initializeColumnMetadata(columns: string[]): ColumnMetadataMap {
	const metadata: ColumnMetadataMap = {};
	columns.forEach((column) => {
		metadata[column] = {
			originalName: column,
			displayName: column,
			description: "",
		};
	});
	return metadata;
}

export function applyColumnRenaming(
	data: ParsedData,
	metadata: ColumnMetadataMap,
): ParsedData {
	return data.map((row) => {
		const newRow: Record<string, string | number | boolean | null> = {};
		Object.entries(metadata).forEach(([originalName, meta]) => {
			if (originalName in row) {
				newRow[meta.displayName] = row[originalName];
			}
		});
		return newRow;
	});
}

export function getDisplayColumns(metadata: ColumnMetadataMap): string[] {
	return Object.values(metadata)
		.map((meta) => meta.displayName)
		.sort();
}
