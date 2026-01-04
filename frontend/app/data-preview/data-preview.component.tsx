"use client";

import { useState, useEffect } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DataPreviewProps, ColumnMetadataMap } from "./data-preview.types";
import {
	initializeColumnMetadata,
	getDisplayColumns,
	applyColumnRenaming,
} from "./data-preview";

export const DataPreview = ({
	data,
	columnMetadata,
	onColumnMetadataChange,
}: DataPreviewProps) => {
	const [editingColumn, setEditingColumn] = useState<string | null>(null);
	const [editingDescription, setEditingDescription] = useState<string | null>(
		null,
	);
	const [localMetadata, setLocalMetadata] = useState<ColumnMetadataMap>({});

	useEffect(() => {
		if (data && data.length > 0) {
			const allColumns = new Set<string>();
			data.forEach((row) => {
				Object.keys(row).forEach((key) => allColumns.add(key));
			});
			const columns = Array.from(allColumns).sort();

			if (!columnMetadata || Object.keys(columnMetadata).length === 0) {
				const newMetadata = initializeColumnMetadata(columns);
				setLocalMetadata(newMetadata);
				onColumnMetadataChange?.(newMetadata);
			} else {
				setLocalMetadata(columnMetadata);
			}
		}
	}, [data, columnMetadata, onColumnMetadataChange]);

	if (!data || data.length === 0) {
		return (
			<div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground sm:p-8 sm:text-base">
				No data to preview. Please upload a file.
			</div>
		);
	}

	const displayColumns =
		Object.keys(localMetadata).length > 0
			? getDisplayColumns(localMetadata)
			: (() => {
					const allColumns = new Set<string>();
					data.forEach((row) => {
						Object.keys(row).forEach((key) => allColumns.add(key));
					});
					return Array.from(allColumns).sort();
				})();

	const displayData =
		Object.keys(localMetadata).length > 0
			? applyColumnRenaming(data, localMetadata)
			: data;

	const previewRows = displayData.slice(0, 100);
	const totalRows = displayData.length;
	const showingAll = totalRows <= 100;

	const handleColumnNameChange = (originalName: string, newName: string) => {
		if (!newName.trim()) {
			setEditingColumn(null);
			return;
		}

		const updated = { ...localMetadata };
		if (updated[originalName]) {
			const trimmedName = newName.trim();

			const isDuplicate = Object.entries(updated).some(
				([key, meta]) =>
					key !== originalName && meta.displayName === trimmedName,
			);

			if (isDuplicate) {
				alert(
					`Column name "${trimmedName}" already exists. Please choose a different name.`,
				);
				setEditingColumn(null);
				return;
			}

			updated[originalName] = {
				...updated[originalName],
				displayName: trimmedName,
			};
			setLocalMetadata(updated);
			onColumnMetadataChange?.(updated);
		}
		setEditingColumn(null);
	};

	const handleDescriptionChange = (
		originalName: string,
		description: string,
	) => {
		const updated = { ...localMetadata };
		if (updated[originalName]) {
			updated[originalName] = {
				...updated[originalName],
				description,
			};
			setLocalMetadata(updated);
			onColumnMetadataChange?.(updated);
		}
		setEditingDescription(null);
	};

	const getOriginalName = (displayName: string): string => {
		const entry = Object.entries(localMetadata).find(
			([_, meta]) => meta.displayName === displayName,
		);
		return entry ? entry[0] : displayName;
	};

	const getMetadata = (displayName: string) => {
		const originalName = getOriginalName(displayName);
		return (
			localMetadata[originalName] || {
				originalName: displayName,
				displayName: displayName,
				description: "",
			}
		);
	};

	return (
		<div className="flex flex-col gap-3 sm:gap-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-base font-semibold sm:text-lg">Data Preview</h2>
				<div className="text-xs text-muted-foreground sm:text-sm">
					{showingAll
						? `Showing all ${totalRows} rows`
						: `Showing first 100 of ${totalRows} rows`}
				</div>
			</div>
			<div className="max-h-[400px] overflow-auto rounded-md border border-border sm:max-h-[600px]">
				<div className="min-w-full overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								{displayColumns.map((displayName) => {
									const meta = getMetadata(displayName);
									const originalName = meta.originalName;
									const isEditing = editingColumn === originalName;
									const isEditingDesc = editingDescription === originalName;

									return (
										<TableHead
											key={originalName}
											className="min-w-[120px] text-xs sm:min-w-[150px] sm:text-sm"
										>
											<div className="flex flex-col gap-1">
												<div className="flex items-center gap-1">
													{isEditing ? (
														<Input
															value={meta.displayName}
															onChange={(e) => {
																const updated = { ...localMetadata };
																if (updated[originalName]) {
																	updated[originalName] = {
																		...updated[originalName],
																		displayName: e.target.value,
																	};
																	setLocalMetadata(updated);
																}
															}}
															onBlur={() => {
																handleColumnNameChange(
																	originalName,
																	meta.displayName,
																);
															}}
															onKeyDown={(e) => {
																if (e.key === "Enter") {
																	handleColumnNameChange(
																		originalName,
																		meta.displayName,
																	);
																}
																if (e.key === "Escape") {
																	setEditingColumn(null);
																}
															}}
															className="h-7 text-xs sm:h-8 sm:text-sm"
															autoFocus
														/>
													) : (
														<>
															<span
																className="cursor-pointer hover:text-primary"
																onClick={() => setEditingColumn(originalName)}
																title="Click to edit column name"
															>
																{meta.displayName}
															</span>
															{meta.description && (
																<button
																	type="button"
																	onClick={() =>
																		setEditingDescription(
																			editingDescription === originalName
																				? null
																				: originalName,
																		)
																	}
																	className="ml-1 text-muted-foreground hover:text-foreground"
																	title={meta.description}
																>
																	ℹ️
																</button>
															)}
															{!meta.description && (
																<button
																	type="button"
																	onClick={() =>
																		setEditingDescription(originalName)
																	}
																	className="ml-1 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
																	title="Add description"
																>
																	+
																</button>
															)}
														</>
													)}
												</div>
												{isEditingDesc && (
													<div className="mt-1 flex flex-col gap-1">
														<Textarea
															value={meta.description}
															onChange={(e) => {
																const updated = { ...localMetadata };
																if (updated[originalName]) {
																	updated[originalName] = {
																		...updated[originalName],
																		description: e.target.value,
																	};
																	setLocalMetadata(updated);
																}
															}}
															onBlur={() => {
																handleDescriptionChange(
																	originalName,
																	meta.description,
																);
															}}
															onKeyDown={(e) => {
																if (e.key === "Escape") {
																	setEditingDescription(null);
																}
															}}
															placeholder="Enter column description..."
															className="min-h-[60px] text-xs sm:text-sm"
															autoFocus
														/>
														<button
															type="button"
															onClick={() => setEditingDescription(null)}
															className="self-end text-xs text-muted-foreground hover:text-foreground"
														>
															Close
														</button>
													</div>
												)}
											</div>
										</TableHead>
									);
								})}
							</TableRow>
						</TableHeader>
						<TableBody>
							{previewRows.map((row, rowIndex) => (
								<TableRow key={rowIndex}>
									{displayColumns.map((displayName) => {
										const value = row[displayName];
										let displayValue = "";
										let isJson = false;

										if (value === null || value === undefined) {
											displayValue = "";
										} else if (
											typeof value === "string" &&
											(value.startsWith("{") || value.startsWith("["))
										) {
											try {
												const parsed = JSON.parse(value);
												displayValue = JSON.stringify(parsed, null, 2);
												isJson = true;
											} catch {
												displayValue = String(value);
											}
										} else {
											displayValue = String(value);
										}

										return (
											<TableCell
												key={displayName}
												className="text-xs sm:text-sm"
											>
												{isJson ? (
													<div className="max-w-[200px] sm:max-w-[400px]">
														<pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-tight sm:text-xs">
															{displayValue}
														</pre>
													</div>
												) : (
													<div
														className="max-w-[200px] truncate sm:max-w-none"
														title={displayValue}
													>
														{displayValue}
													</div>
												)}
											</TableCell>
										);
									})}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
};
