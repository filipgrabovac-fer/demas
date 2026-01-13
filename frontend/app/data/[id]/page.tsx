"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataPreview } from "@/app/data-preview/DataPreview.component";
import { api } from "@/api/api";
import { queries } from "@/api/queries";
import { inferSchema } from "@/app/data-upload-form/data-upload-form";
import { exportToCSV } from "@/app/data-overview/data-overview";
import type { ParsedData } from "@/app/data-upload-form/data-upload-form.types";
import type { NewColumn } from "@/app/data-detail/data-detail.types";

export default function DataDetailPage() {
	const params = useParams();
	const queryClient = useQueryClient();
	const id = Number(params.id);

	const { data: originalData, isLoading: isLoadingOriginal } =
		api.dataOverview.useGetOriginalDataDetail({ id });
	const { data: enhancedDataList } = api.dataOverview.useGetEnhancedDataList();
	const enhanceMutation = api.dataUploadForm.usePostEnhanceData();

	const [newColumns, setNewColumns] = useState<NewColumn[]>([]);
	const [newColumnName, setNewColumnName] = useState("");
	const [newColumnDescription, setNewColumnDescription] = useState("");
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

	const enhancedDataParsed = useMemo(() => {
		if (!enhancedData) return null;
		return Array.isArray(enhancedData.data)
			? (enhancedData.data as unknown as ParsedData)
			: null;
	}, [enhancedData]);

	const handleAddColumn = () => {
		if (!newColumnName.trim()) {
			return;
		}

		if (
			newColumns.some(
				(col) => col.name.toLowerCase() === newColumnName.toLowerCase(),
			)
		) {
			setError("Column with this name already exists");
			return;
		}

		if (
			originalDataParsed &&
			originalDataParsed.length > 0 &&
			Object.keys(originalDataParsed[0]).some(
				(key) => key.toLowerCase() === newColumnName.toLowerCase(),
			)
		) {
			setError("Column with this name already exists in the data");
			return;
		}

		setNewColumns([
			...newColumns,
			{
				name: newColumnName.trim(),
				description: newColumnDescription.trim(),
				type: "str",
			},
		]);
		setNewColumnName("");
		setNewColumnDescription("");
		setError(null);
	};

	const handleRemoveColumn = (index: number) => {
		setNewColumns(newColumns.filter((_, i) => i !== index));
	};

	const handleEnhance = async () => {
		if (!originalDataParsed || originalDataParsed.length === 0) {
			setError("No data to enhance");
			return;
		}

		setError(null);

		try {
			const baseSchema = inferSchema(originalDataParsed);

			const newColumnsSchema: Record<string, "int" | "str" | "bool" | "float"> =
				{};
			for (const col of newColumns) {
				newColumnsSchema[col.name] = col.type || "str";
			}

			const mergedSchema = { ...baseSchema, ...newColumnsSchema };

			const result = await enhanceMutation.mutateAsync({
				original_data_id: id,
				schema: mergedSchema,
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
						<Button onClick={handleExportEnhanced} variant="outline">
							Export Enhanced Data (CSV)
						</Button>
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
					<div className="rounded-md border border-border p-6">
						<h3 className="mb-4 text-lg font-semibold">
							Add New Columns (Optional)
						</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							Before enhancing, you can add new columns that you want the AI to
							generate. These columns will be included in the enhancement
							schema.
						</p>

						<div className="mb-4 space-y-4">
							<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
								<div className="flex-1">
									<Label htmlFor="column-name">Column Name</Label>
									<Input
										id="column-name"
										value={newColumnName}
										onChange={(e) => setNewColumnName(e.target.value)}
										placeholder="e.g., age, net_worth"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleAddColumn();
											}
										}}
									/>
								</div>
								<div className="flex-1">
									<Label htmlFor="column-description">Description</Label>
									<Textarea
										id="column-description"
										value={newColumnDescription}
										onChange={(e) => setNewColumnDescription(e.target.value)}
										placeholder="Describe what this column should contain"
										className="min-h-[40px]"
									/>
								</div>
								<div className="flex items-end">
									<Button onClick={handleAddColumn} type="button">
										Add Column
									</Button>
								</div>
							</div>
						</div>

						{newColumns.length > 0 && (
							<div className="mb-4 rounded-md border border-border bg-muted/30 p-4">
								<h4 className="mb-2 text-sm font-medium">Added Columns:</h4>
								<div className="space-y-2">
									{newColumns.map((col, idx) => (
										<div
											key={col.name}
											className="flex items-start justify-between rounded border border-border bg-background p-2"
										>
											<div className="flex-1">
												<div className="font-medium">{col.name}</div>
												{col.description && (
													<div className="text-xs text-muted-foreground">
														{col.description}
													</div>
												)}
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveColumn(idx)}
											>
												Remove
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

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
						<h3 className="mb-4 text-lg font-semibold">
							Add New Columns (Optional)
						</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							Before enhancing, you can add new columns that you want the AI to
							generate. These columns will be included in the enhancement
							schema.
						</p>

						<div className="mb-4 space-y-4">
							<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
								<div className="flex-1">
									<Label htmlFor="column-name">Column Name</Label>
									<Input
										id="column-name"
										value={newColumnName}
										onChange={(e) => setNewColumnName(e.target.value)}
										placeholder="e.g., age, net_worth"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleAddColumn();
											}
										}}
									/>
								</div>
								<div className="flex-1">
									<Label htmlFor="column-description">Description</Label>
									<Textarea
										id="column-description"
										value={newColumnDescription}
										onChange={(e) => setNewColumnDescription(e.target.value)}
										placeholder="Describe what this column should contain"
										className="min-h-[40px]"
									/>
								</div>
								<div className="flex items-end">
									<Button onClick={handleAddColumn} type="button">
										Add Column
									</Button>
								</div>
							</div>
						</div>

						{newColumns.length > 0 && (
							<div className="mb-4 rounded-md border border-border bg-muted/30 p-4">
								<h4 className="mb-2 text-sm font-medium">Added Columns:</h4>
								<div className="space-y-2">
									{newColumns.map((col, idx) => (
										<div
											key={col.name}
											className="flex items-start justify-between rounded border border-border bg-background p-2"
										>
											<div className="flex-1">
												<div className="font-medium">{col.name}</div>
												{col.description && (
													<div className="text-xs text-muted-foreground">
														{col.description}
													</div>
												)}
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveColumn(idx)}
											>
												Remove
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

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
