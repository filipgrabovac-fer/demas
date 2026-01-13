"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataPreview } from "@/app/data-preview/DataPreview.component";
import { api } from "@/api/api";
import { queries } from "@/api/queries";
import { inferSchema } from "@/app/data-upload-form/data-upload-form";
import { exportToCSV } from "@/app/data-overview/data-overview";
import type { ParsedData } from "@/app/data-upload-form/data-upload-form.types";
import type { SchemaField } from "@/app/data-detail/data-detail.types";
import { SchemaEditor } from "@/app/data-detail/SchemaEditor.component";

export default function DataDetailPage() {
	const params = useParams();
	const queryClient = useQueryClient();
	const id = Number(params.id);

	const { data: originalData, isLoading: isLoadingOriginal } =
		api.dataOverview.useGetOriginalDataDetail({ id });
	const { data: enhancedDataList } = api.dataOverview.useGetEnhancedDataList();
	const enhanceMutation = api.dataUploadForm.usePostEnhanceData();
	const deleteMutation = api.dataOverview.useDeleteEnhancedData();

	const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [enhancedDataId, setEnhancedDataId] = useState<number | null>(null);

	const enhancedDataFromList = useMemo(() => {
		if (!enhancedDataList) return null;
		return enhancedDataList.find((ed) => ed.original_data === id) || null;
	}, [enhancedDataList, id]);

	// Determine which ID to poll for - prioritize manually set ID, then pending from list
	const pollId = useMemo(() => {
		if (enhancedDataId) return enhancedDataId;
		if (enhancedDataFromList) {
			const status = (enhancedDataFromList as { status?: string })?.status;
			if (status === "pending") {
				return enhancedDataFromList.id;
			}
		}
		return null;
	}, [enhancedDataId, enhancedDataFromList]);

	const shouldPoll = pollId !== null;

	const { data: enhancedDataDetail } =
		api.dataOverview.useGetEnhancedDataDetail({
			id: pollId ?? 0,
			enabled: shouldPoll,
			refetchInterval: (data) => {
				const status = (data as { status?: string })?.status;
				if (status === "pending") {
					return 2000;
				}
				return false;
			},
		});

	useEffect(() => {
		if (enhancedDataDetail) {
			const status = (enhancedDataDetail as { status?: string })?.status;
			if (status === "complete" || status === "failed") {
				queryClient.invalidateQueries({
					queryKey: queries.dataOverview.getEnhancedDataList().queryKey,
				});
			}
		}
	}, [enhancedDataDetail, queryClient]);

	const enhancedData = enhancedDataDetail || enhancedDataFromList;

	const enhancedDataStatus = (enhancedData as { status?: string })?.status;

	// Check if we're in a pending state (either from data or from polling)
	const isPending =
		enhancedDataStatus === "pending" || (shouldPoll && !enhancedData);

	const originalDataParsed = useMemo(() => {
		if (!originalData?.data) return null;
		return Array.isArray(originalData.data)
			? (originalData.data as ParsedData)
			: null;
	}, [originalData]);

	useEffect(() => {
		if (originalDataParsed && originalDataParsed.length > 0) {
			const inferredSchema = inferSchema(originalDataParsed);
			const fields: SchemaField[] = Object.entries(inferredSchema).map(
				([name]) => ({
					name,
					description: "",
					isOriginal: true,
				}),
			);
			setSchemaFields(fields);
		}
	}, [originalDataParsed]);

	const enhancedDataParsed = useMemo(() => {
		if (!enhancedData) return null;
		return Array.isArray(enhancedData.data)
			? (enhancedData.data as unknown as ParsedData)
			: null;
	}, [enhancedData]);


	const handleEnhance = async () => {
		if (!originalDataParsed || originalDataParsed.length === 0) {
			setError("No data to enhance");
			return;
		}

		if (schemaFields.length === 0) {
			setError("At least one schema field is required");
			return;
		}

		const invalidFields = schemaFields.filter(
			(field) => !field.name.trim(),
		);
		if (invalidFields.length > 0) {
			setError("All fields must have a name");
			return;
		}

		setError(null);

		try {
			const schemaDict: Record<string, "int" | "str" | "bool" | "float"> =
				{};
			for (const field of schemaFields) {
				if (field.name.trim()) {
					schemaDict[field.name.trim()] = "str";
				}
			}

			const result = await enhanceMutation.mutateAsync({
				original_data_id: id,
				schema: schemaDict,
			});

			if (result?.id) {
				setEnhancedDataId(result.id);
				// Start polling for the new enhanced data
				await queryClient.invalidateQueries({
					queryKey: queries.dataOverview.getEnhancedDataDetail({
						id: result.id,
					}).queryKey,
				});
			}

			await queryClient.invalidateQueries({
				queryKey: queries.dataOverview.getEnhancedDataList().queryKey,
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: typeof err === "object" && err !== null && "error" in err
						? String(err.error)
						: "Failed to enhance data. Please try again.";
			setError(errorMessage);
		}
	};

	const handleExportOriginal = () => {
		if (!originalDataParsed) return;
		exportToCSV(originalDataParsed, `original-data-${id}.csv`);
	};

	const handleExportEnhanced = () => {
		if (!enhancedDataParsed) return;
		exportToCSV(enhancedDataParsed, `enhanced-data-${id}.csv`);
	};

	const handleDeleteEnhancedData = async () => {
		if (!enhancedData) return;

		setError(null);

		try {
			await deleteMutation.mutateAsync({ id: enhancedData.id });

			setEnhancedDataId(null);

			await queryClient.invalidateQueries({
				queryKey: queries.dataOverview.getEnhancedDataList().queryKey,
			});

			if (enhancedData.id) {
				await queryClient.invalidateQueries({
					queryKey: queries.dataOverview.getEnhancedDataDetail({
						id: enhancedData.id,
					}).queryKey,
				});
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: typeof err === "object" && err !== null && "error" in err
						? String(err.error)
						: "Failed to delete enhanced data. Please try again.";
			setError(errorMessage);
		}
	};

	if (isLoadingOriginal) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="text-center text-muted-foreground">Loading...</div>
			</div>
		);
	}

	if (!originalData) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
					Data not found
				</div>
				<div className="mt-4">
					<Link href="/data">
						<Button variant="outline">Back to Data Overview</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="mb-6 flex items-center justify-between sm:mb-8">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Data #{id}</h1>
					<p className="mt-2 text-sm text-muted-foreground sm:text-base">
						Created: {new Date(originalData.created_at).toLocaleString()}
					</p>
				</div>
				<Link href="/data">
					<Button variant="outline">Back to Overview</Button>
				</Link>
			</div>

			{error && (
				<div className="mb-6 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive sm:mb-8 sm:p-4 sm:text-base">
					{error}
				</div>
			)}

			{enhancedData && enhancedDataStatus === "complete" ? (
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Enhanced Data</h2>
						<div className="flex gap-2">
							<Button onClick={handleExportEnhanced} variant="outline">
								Export Enhanced Data (CSV)
							</Button>
							<Button
								onClick={handleDeleteEnhancedData}
								variant="destructive"
								disabled={deleteMutation.isPending}
							>
								{deleteMutation.isPending ? "Deleting..." : "Delete Enhanced Data"}
							</Button>
						</div>
					</div>
					<div className="rounded-md border border-green-500 bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
						This data has been enhanced. You can view it below or export it.
					</div>
					<DataPreview data={enhancedDataParsed} columnMetadata={{}} />

					<div className="mt-6 border-t pt-6">
						<h2 className="mb-4 text-xl font-semibold">Original Data</h2>
						<div className="mb-4 flex justify-end">
							<Button onClick={handleExportOriginal} variant="outline">
								Export Original Data (CSV)
							</Button>
						</div>
						<DataPreview data={originalDataParsed} columnMetadata={{}} />
					</div>
				</div>
			) : isPending ? (
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Original Data</h2>
						<Button onClick={handleExportOriginal} variant="outline">
							Export Original Data (CSV)
						</Button>
					</div>
					<DataPreview data={originalDataParsed} columnMetadata={{}} />
					<div className="rounded-md border border-blue-500 bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
						<div className="flex items-center gap-2">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
							<span>Enhancement in progress... Please wait.</span>
						</div>
					</div>
				</div>
			) : enhancedData && enhancedDataStatus === "failed" ? (
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Original Data</h2>
						<Button onClick={handleExportOriginal} variant="outline">
							Export Original Data (CSV)
						</Button>
					</div>
					<DataPreview data={originalDataParsed} columnMetadata={{}} />
					<div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
						Enhancement failed. Please try again.
					</div>
					<div className="flex justify-center gap-2 mb-6">
						<Button
							onClick={handleDeleteEnhancedData}
							variant="destructive"
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete Enhanced Data"}
						</Button>
					</div>
					<div className="rounded-md border border-border p-6">
						<h3 className="mb-4 text-lg font-semibold">Edit Schema</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							Configure the schema for data enhancement. You can edit field
							names, change types, remove fields, or add new ones.
						</p>

						<SchemaEditor
							fields={schemaFields}
							onFieldsChange={setSchemaFields}
							originalFieldNames={
								originalDataParsed && originalDataParsed.length > 0
									? Object.keys(originalDataParsed[0])
									: []
							}
						/>

						<div className="mt-6 flex justify-center">
							<Button
								onClick={handleEnhance}
								size="lg"
								disabled={enhanceMutation.isPending}
							>
								{enhanceMutation.isPending
									? "Enhancing..."
									: "Retry Enhancement"}
							</Button>
						</div>
					</div>
				</div>
			) : (
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Original Data</h2>
						<Button onClick={handleExportOriginal} variant="outline">
							Export Original Data (CSV)
						</Button>
					</div>
					<DataPreview data={originalDataParsed} columnMetadata={{}} />

					<div className="rounded-md border border-border p-6">
						<h3 className="mb-4 text-lg font-semibold">Edit Schema</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							Configure the schema for data enhancement. You can edit field
							names, change types, remove fields, or add new ones.
						</p>

						<SchemaEditor
							fields={schemaFields}
							onFieldsChange={setSchemaFields}
							originalFieldNames={
								originalDataParsed && originalDataParsed.length > 0
									? Object.keys(originalDataParsed[0])
									: []
							}
						/>

						<div className="mt-6 flex justify-center">
							<Button
								onClick={handleEnhance}
								size="lg"
								disabled={enhanceMutation.isPending}
							>
								{enhanceMutation.isPending ? "Enhancing..." : "Enhance Data"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
