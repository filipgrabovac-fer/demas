"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataUploadForm } from "./data-upload-form/data-upload-form.component";
import { DataPreview } from "./data-preview/data-preview.component";
import type { ParsedData } from "./data-upload-form/data-upload-form.types";
import type { ColumnMetadataMap } from "./data-preview/data-preview.types";

export default function DataEnhancementPage() {
	const [parsedData, setParsedData] = useState<ParsedData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [columnMetadata, setColumnMetadata] = useState<ColumnMetadataMap>({});

	const handleDataParsed = (data: ParsedData) => {
		setParsedData(data);
		setError(null);
		setColumnMetadata({});
	};

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		setParsedData(null);
	};

	const handleEnhance = () => {
		if (!parsedData || parsedData.length === 0) {
			return;
		}
		console.log("Enhance button clicked", { parsedData, columnMetadata });
	};

	return (
		<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="mb-6 sm:mb-8">
				<h1 className="text-2xl font-bold sm:text-3xl">Data Enhancement</h1>
				<p className="mt-2 text-sm text-muted-foreground sm:text-base">
					Upload a CSV or JSON file to preview and enhance your data
				</p>
			</div>

			<div className="mb-6 sm:mb-8">
				<DataUploadForm onDataParsed={handleDataParsed} onError={handleError} />
			</div>

			{error && (
				<div className="mb-6 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive sm:mb-8 sm:p-4 sm:text-base">
					{error}
				</div>
			)}

			<DataPreview
				data={parsedData}
				columnMetadata={columnMetadata}
				onColumnMetadataChange={setColumnMetadata}
			/>

			{parsedData && parsedData.length > 0 && (
				<div className="mt-6 flex justify-center sm:mt-8">
					<Button
						onClick={handleEnhance}
						size="lg"
						className="w-full sm:w-auto"
					>
						Enhance
					</Button>
				</div>
			)}
		</div>
	);
}
