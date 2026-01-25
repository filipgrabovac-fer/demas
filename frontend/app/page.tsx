"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataUploadForm } from "./data-upload-form/DataUploadForm.component";
import { DataPreview } from "./data-preview/DataPreview.component";
import type { ParsedData } from "./data-upload-form/data-upload-form.types";
import type { ColumnMetadataMap } from "./data-preview/data-preview.types";
import { api } from "@/api/api";
import {
	convertToBackendFormat,
	inferSchema,
} from "./data-upload-form/data-upload-form";

export default function DataEnhancementPage() {
	const router = useRouter();
	const [parsedData, setParsedData] = useState<ParsedData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [columnMetadata, setColumnMetadata] = useState<ColumnMetadataMap>({});

	const saveMutation = api.dataUploadForm.usePostOriginalData();

	const handleDataParsed = (data: ParsedData) => {
		setParsedData(data);
		setError(null);
		setColumnMetadata({});
	};

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		setParsedData(null);
	};

	const handleSave = async () => {
		if (!parsedData || parsedData.length === 0) {
			return;
		}

		setError(null);

		try {
			const backendData = convertToBackendFormat(parsedData);
			const schema = inferSchema(parsedData);

			const result = await saveMutation.mutateAsync({
				data: backendData,
				schema: schema,
			});

			if (result?.id) {
				router.push(`/data/${result.id}`);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: typeof err === "object" && err !== null && "error" in err
						? String(err.error)
						: "Failed to save data. Please try again.";
			setError(errorMessage);
		}
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
						onClick={handleSave}
						size="lg"
						className="w-full sm:w-auto"
						disabled={saveMutation.isPending}
					>
						{saveMutation.isPending ? "Saving..." : "Save"}
					</Button>
				</div>
			)}
		</div>
	);
}
