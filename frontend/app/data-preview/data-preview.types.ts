import type { ParsedData } from "../data-upload-form/data-upload-form.types";

export type ColumnMetadata = {
	originalName: string;
	displayName: string;
	description: string;
};

export type ColumnMetadataMap = Record<string, ColumnMetadata>;

export type DataPreviewProps = {
	data: ParsedData | null;
	columnMetadata?: ColumnMetadataMap;
	onColumnMetadataChange?: (metadata: ColumnMetadataMap) => void;
	headerAction?: React.ReactNode;
};
