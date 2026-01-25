import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SchemaField } from "./data-detail.types";

export type SchemaEditorProps = {
	fields: SchemaField[];
	onFieldsChange: (fields: SchemaField[]) => void;
	originalFieldNames?: string[];
};

const toSnakeCase = (input: string): string => {
	return input
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_]/g, "")
		.replace(/^[0-9]/, "")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.toLowerCase();
};

export const SchemaEditor = ({ fields, onFieldsChange }: SchemaEditorProps) => {
	const [userInputs, setUserInputs] = useState<Record<number, string>>({});
	const [touchedFields, setTouchedFields] = useState<Set<number>>(new Set());

	const mergedUserInputs = useMemo(() => {
		const merged: Record<number, string> = { ...userInputs };
		fields.forEach((field, index) => {
			if (!(index in merged)) {
				merged[index] = field.name || "";
			}
		});
		return merged;
	}, [userInputs, fields]);

	const handleFieldNameChange = (index: number, userInput: string) => {
		setUserInputs((prev) => ({ ...prev, [index]: userInput }));
		setTouchedFields((prev) => new Set(prev).add(index));
		const updatedFields = [...fields];
		const snakeCaseName = toSnakeCase(userInput);
		updatedFields[index] = {
			...updatedFields[index],
			name: snakeCaseName,
		};
		onFieldsChange(updatedFields);
	};

	const handleFieldDescriptionChange = (
		index: number,
		newDescription: string,
	) => {
		const updatedFields = [...fields];
		updatedFields[index] = {
			...updatedFields[index],
			description: newDescription,
		};
		onFieldsChange(updatedFields);
	};

	const handleRemoveField = (index: number) => {
		const updatedFields = fields.filter((_, i) => i !== index);
		setUserInputs((prev) => {
			const updated = { ...prev };
			delete updated[index];
			const reindexed: Record<number, string> = {};
			Object.entries(updated).forEach(([key, value]) => {
				const oldIndex = Number(key);
				if (oldIndex > index) {
					reindexed[oldIndex - 1] = value;
				} else if (oldIndex < index) {
					reindexed[oldIndex] = value;
				}
			});
			return reindexed;
		});
		setTouchedFields((prev) => {
			const updated = new Set(prev);
			updated.delete(index);
			const reindexed = new Set<number>();
			updated.forEach((idx) => {
				if (idx > index) {
					reindexed.add(idx - 1);
				} else if (idx < index) {
					reindexed.add(idx);
				}
			});
			return reindexed;
		});
		onFieldsChange(updatedFields);
	};

	const handleAddField = () => {
		const newField: SchemaField = {
			name: "",
			description: "",
			type: "str",
			isOriginal: false,
		};
		const updatedFields = [newField, ...fields];
		setUserInputs((prev) => {
			const reindexed: Record<number, string> = { 0: "" };
			Object.entries(prev).forEach(([key, value]) => {
				reindexed[Number(key) + 1] = value;
			});
			return reindexed;
		});
		setTouchedFields((prev) => {
			const reindexed = new Set<number>();
			prev.forEach((idx) => {
				reindexed.add(idx + 1);
			});
			return reindexed;
		});
		onFieldsChange(updatedFields);
	};

	const validateFieldName = (
		name: string,
		index: number,
		isTouched: boolean,
	): string | null => {
		if (!isTouched && !name.trim()) {
			return null;
		}

		if (!name.trim()) {
			return "Field name cannot be empty";
		}

		const duplicateIndex = fields.findIndex(
			(field, i) =>
				i !== index && field.name.toLowerCase() === name.toLowerCase().trim(),
		);

		if (duplicateIndex !== -1) {
			return "Field name already exists";
		}

		return null;
	};

	const canAddNewField = useMemo(() => {
		if (fields.length === 0) return true;

		return fields.every((field, index) => {
			const trimmedName = field.name?.trim();
			if (!trimmedName) return false;

			const duplicateIndex = fields.findIndex(
				(f, i) =>
					i !== index && f.name.toLowerCase() === trimmedName.toLowerCase(),
			);
			return duplicateIndex === -1;
		});
	}, [fields]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Label className="text-base font-semibold">Schema Fields</Label>
				<Button
					onClick={handleAddField}
					type="button"
					size="sm"
					disabled={!canAddNewField}
				>
					Add Field
				</Button>
			</div>

			{fields.length === 0 ? (
				<div className="rounded-md border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
					No fields defined. Click &quot;Add Field&quot; to add a field.
				</div>
			) : (
				<div className="space-y-4">
					{fields.map((field, index) => {
						const userInput = mergedUserInputs[index] ?? (field.name || "");
						const isTouched = touchedFields.has(index);
						const nameError = validateFieldName(field.name, index, isTouched);
						const displayName = toSnakeCase(userInput);

						return (
							<div
								key={`field-${index}-${field.isOriginal ? "orig" : "new"}`}
								className="flex flex-col gap-4 rounded-md border border-border bg-background p-4"
							>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
									<div className="flex-1">
										<Label
											htmlFor={`field-name-${index}`}
											className="text-xs text-muted-foreground"
										>
											Field Name
										</Label>
										<Input
											id={`field-name-${index}`}
											value={userInput}
											onChange={(e) => {
												handleFieldNameChange(index, e.target.value);
											}}
											placeholder="Enter field name (e.g., New Field Name)"
											className={
												nameError
													? "border-destructive focus-visible:ring-destructive"
													: ""
											}
										/>
										{userInput && (
											<p className="mt-2 pt-1 text-xs text-muted-foreground">
												Variable name:{" "}
												<code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
													{displayName || "(empty)"}
												</code>
											</p>
										)}
										{nameError && (
											<p className="mt-1 text-xs text-destructive">
												{nameError}
											</p>
										)}
									</div>
									<div className="flex items-start sm:items-center">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveField(index)}
											type="button"
											className="text-destructive hover:text-destructive"
										>
											Remove
										</Button>
									</div>
								</div>
								<div className="flex-1">
									<Label
										htmlFor={`field-description-${index}`}
										className="text-xs text-muted-foreground"
									>
										Description
									</Label>
									<Textarea
										id={`field-description-${index}`}
										value={field.description}
										onChange={(e) =>
											handleFieldDescriptionChange(index, e.target.value)
										}
										placeholder="Describe what this field should contain"
										className="min-h-[60px]"
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
