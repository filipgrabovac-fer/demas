"use client";

import Link from "next/link";
import { api } from "@/api/api";
import { formatDataPreview } from "../data-overview/data-overview";
import { Button } from "@/components/ui/button";

export default function DataOverviewPage() {
	const {
		data: originalDataList,
		isLoading,
		error,
	} = api.dataOverview.useGetOriginalDataList();

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="text-center text-muted-foreground">Loading...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
					Error loading data: {error.message}
				</div>
			</div>
		);
	}

	if (!originalDataList || originalDataList.length === 0) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="mb-6 sm:mb-8">
					<h1 className="text-2xl font-bold sm:text-3xl">Data Overview</h1>
					<p className="mt-2 text-sm text-muted-foreground sm:text-base">
						View and manage all uploaded data
					</p>
				</div>
				<div className="rounded-md border border-border p-8 text-center text-muted-foreground">
					No data uploaded yet. Upload data from the{" "}
					<Link href="/" className="text-primary underline">
						home page
					</Link>
					.
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="mb-6 sm:mb-8">
				<h1 className="text-2xl font-bold sm:text-3xl">Data Overview</h1>
				<p className="mt-2 text-sm text-muted-foreground sm:text-base">
					View and manage all uploaded data
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{originalDataList.map((item) => {
					const preview = formatDataPreview(item.data);
					const createdDate = new Date(item.created_at).toLocaleDateString();

					return (
						<Link
							key={item.id}
							href={`/data/${item.id}`}
							className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
						>
							<div className="mb-2 flex items-center justify-between">
								<h3 className="text-lg font-semibold">Data #{item.id}</h3>
								<span className="text-xs text-muted-foreground">
									{createdDate}
								</span>
							</div>

							{preview ? (
								<div className="space-y-2 text-sm">
									<div className="flex items-center gap-2 text-muted-foreground">
										<span>{preview.rowCount} rows</span>
										<span>•</span>
										<span>{preview.columnCount} columns</span>
									</div>
									<div className="mt-2 rounded border border-border bg-muted/30 p-2">
										<div className="mb-1 text-xs font-medium text-muted-foreground">
											Preview:
										</div>
										<div className="space-y-1 text-xs">
											{preview.columnNames.slice(0, 3).map((col) => (
												<div key={col} className="truncate">
													<span className="font-medium">{col}:</span>{" "}
													<span className="text-muted-foreground">
														{String(preview.firstRow[col] ?? "—")}
													</span>
												</div>
											))}
											{preview.columnNames.length > 3 && (
												<div className="text-muted-foreground">
													+{preview.columnNames.length - 3} more columns
												</div>
											)}
										</div>
									</div>
								</div>
							) : (
								<div className="text-sm text-muted-foreground">
									No data preview available
								</div>
							)}

							<div className="mt-4 flex items-center text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
								View details →
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
