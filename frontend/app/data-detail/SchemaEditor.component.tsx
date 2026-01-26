import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { SchemaField } from "./data-detail.types";
import {
	useSchemaEditorForm,
	type SchemaEditorFormDefaultValuesType,
} from "./data-detail";
import type { components } from "@/api/schema";

export type SchemaEditorProps = {
	fields: SchemaField[];
	onFieldsChange: (fields: SchemaField[]) => void;
	originalFieldNames?: string[];
	readonly?: boolean;
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

const typeOptions: components["schemas"]["TypeEnum"][] = ["int", "str", "bool", "float"];

export const SchemaEditor = ({
	fields,
	onFieldsChange,
	readonly = false,
}: SchemaEditorProps) => {
	const defaultValues: SchemaEditorFormDefaultValuesType = useMemo(
		() => ({
			fields: fields.map((field) => ({
				...field,
				type: field.type || "str",
			})),
		}),
		[fields],
	);

	const isInternalUpdate = useRef(false);

	const form = useSchemaEditorForm({
		defaultValues,
		onFieldsChange: (newFields) => {
			isInternalUpdate.current = true;
			onFieldsChange(newFields);
			setTimeout(() => {
				isInternalUpdate.current = false;
			}, 0);
		},
	});

	useEffect(() => {
		if (!isInternalUpdate.current) {
			form.setFieldValue("fields", fields);
		}
	}, [fields, form]);

	const canAddNewField = useMemo(() => {
		const formFields = form.state.values.fields;
		if (formFields.length === 0) return true;

		return formFields.every((field, index) => {
			const trimmedName = field.name?.trim();
			if (!trimmedName) return false;

			const duplicateIndex = formFields.findIndex(
				(f, i) =>
					i !== index && f.name.toLowerCase() === trimmedName.toLowerCase(),
			);
			return duplicateIndex === -1;
		});
	}, [form.state.values.fields]);

	const handleAddField = () => {
		const newField: SchemaField = {
			name: "",
			description: "",
			type: "str",
			isOriginal: false,
		};
		const currentFields = form.state.values.fields;
		form.setFieldValue("fields", [newField, ...currentFields]);
		form.handleSubmit();
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Label className="text-base font-semibold">Schema Fields</Label>
				{!readonly && (
					<Button
						onClick={handleAddField}
						type="button"
						size="sm"
						disabled={!canAddNewField}
					>
						Add Field
					</Button>
				)}
			</div>

			{form.state.values.fields.length === 0 ? (
				<div className="rounded-md border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
					No fields defined. Click &quot;Add Field&quot; to add a field.
				</div>
			) : (
				<div className="space-y-4">
					{form.state.values.fields.map((field, index) => {
						const fieldNameValue = field.name || "";
						const displayName = fieldNameValue;

						return (
							<div
								key={`field-${index}-${field.isOriginal ? "orig" : "new"}`}
								className={`flex flex-col gap-4 rounded-md border border-border p-4 ${
									readonly ? "bg-muted/30" : "bg-background"
								}`}
							>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
									<div className="flex-1">
										<Label
											htmlFor={`field-name-${index}`}
											className="text-xs text-muted-foreground"
										>
											Field Name
										</Label>
										<form.Field
											name={`fields[${index}].name`}
											validators={{
												onChange: ({ value }) => {
													if (typeof value !== "string" || !value.trim()) {
														return "Field name cannot be empty";
													}
													const duplicateIndex = form.state.values.fields.findIndex(
														(f, i) =>
															i !== index &&
															f.name.toLowerCase() === value.toLowerCase().trim(),
													);
													if (duplicateIndex !== -1) {
														return "Field name already exists";
													}
													return undefined;
												},
											}}
										>
											{(fieldName) => (
												<>
													<Input
														id={`field-name-${index}`}
														value={(fieldName.state.value as string) || ""}
														onChange={(e) => {
															if (!readonly) {
																fieldName.handleChange(e.target.value);
																form.handleSubmit();
															}
														}}
														onBlur={(e) => {
															if (!readonly) {
																const snakeCaseName = toSnakeCase(e.target.value);
																fieldName.handleChange(snakeCaseName);
																form.handleSubmit();
															}
															fieldName.handleBlur();
														}}
														placeholder="Enter field name (e.g., New Field Name)"
														disabled={readonly}
														className={
															fieldName.state.meta.errors.length > 0
																? "border-destructive focus-visible:ring-destructive"
																: ""
														}
													/>
													{fieldName.state.value && (
														<p className="mt-2 pt-1 text-xs text-muted-foreground">
															Variable name:{" "}
															<code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
																{toSnakeCase(displayName) || "(empty)"}
															</code>
														</p>
													)}
													{readonly && field.type && (
														<p className="mt-1 text-xs text-muted-foreground">
															Type:{" "}
															<code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
																{field.type}
															</code>
														</p>
													)}
													{fieldName.state.meta.errors.length > 0 && !readonly && (
														<p className="mt-1 text-xs text-destructive">
															{fieldName.state.meta.errors[0]}
														</p>
													)}
												</>
											)}
										</form.Field>
									</div>
									{!readonly && (
										<div className="flex items-start sm:items-center">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													form.removeFieldValue("fields", index);
													form.handleSubmit();
												}}
												type="button"
												className="text-destructive hover:text-destructive"
											>
												Remove
											</Button>
										</div>
									)}
								</div>
								<div className="flex-1">
									<Label
										htmlFor={`field-description-${index}`}
										className="text-xs text-muted-foreground"
									>
										Description
									</Label>
									<form.Field name={`fields[${index}].description`}>
										{(fieldDescription) => (
											<Textarea
												id={`field-description-${index}`}
												value={(fieldDescription.state.value as string) || ""}
												onChange={(e) => {
													if (!readonly) {
														fieldDescription.handleChange(e.target.value);
														form.handleSubmit();
													}
												}}
												onBlur={fieldDescription.handleBlur}
												placeholder="Describe what this field should contain"
												disabled={readonly}
												className="min-h-[60px]"
											/>
										)}
									</form.Field>
								</div>
								<div className="border-t border-border/50 pt-4">
									<Accordion type="single" collapsible className="w-full">
										<AccordionItem
											value={`advanced-${index}`}
											className="border-0"
										>
											<AccordionTrigger className="text-sm text-primary hover:text-primary/80 hover:no-underline py-2 px-0 -ml-1">
												Advanced
											</AccordionTrigger>
											<AccordionContent className="pt-2 pb-0">
												<form.Field name={`fields[${index}].type` as const}>
													{(fieldType) => {
														const typeValue =
															typeof fieldType.state.value === "string"
																? fieldType.state.value
																: "str";
														return (
															<div className="flex flex-col gap-2">
																<Label
																	htmlFor={`field-type-${index}`}
																	className="text-xs text-muted-foreground"
																>
																	Type
																</Label>
																<Select
																	value={typeValue}
																	onValueChange={(value) => {
																		if (!readonly) {
																			fieldType.handleChange(
																				value as components["schemas"]["TypeEnum"],
																			);
																			form.handleSubmit();
																		}
																	}}
																	disabled={readonly}
																>
																	<SelectTrigger id={`field-type-${index}`}>
																		<SelectValue placeholder="Select type" />
																	</SelectTrigger>
																	<SelectContent>
																		{typeOptions.map((option) => (
																			<SelectItem key={option} value={option}>
																				{option}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
														);
													}}
												</form.Field>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
