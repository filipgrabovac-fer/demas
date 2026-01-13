import type { ParsedData } from "../data-upload-form/data-upload-form.types";

export type DataPreviewInfo = {
	rowCount: number;
	columnCount: number;
	columnNames: string[];
	firstRow: Record<string, string | number | boolean | null>;
};

export type ExportData = ParsedData;
