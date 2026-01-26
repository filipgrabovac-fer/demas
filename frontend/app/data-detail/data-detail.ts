import { useForm } from "@tanstack/react-form";
import type { SchemaField } from "./data-detail.types";

export type SchemaEditorFormDefaultValuesType = {
	fields: SchemaField[];
};

export const schemaEditorDefaultValues: SchemaEditorFormDefaultValuesType = {
	fields: [],
};

export const useSchemaEditorForm = ({
	defaultValues,
	onFieldsChange,
}: {
	defaultValues?: SchemaEditorFormDefaultValuesType;
	onFieldsChange?: (fields: SchemaField[]) => void;
}) => {
	return useForm({
		defaultValues: defaultValues ?? schemaEditorDefaultValues,
		validators: {
			onChange: ({ value }) => {
				const errors: string[] = [];
				
				for (let i = 0; i < value.fields.length; i++) {
					const field = value.fields[i];
					if (!field.name || !field.name.trim()) {
						errors.push(`Field ${i + 1}: Field name cannot be empty`);
					}
				}

				const names = value.fields.map((f) => f.name.toLowerCase().trim());
				const uniqueNames = new Set(names);
				if (names.length !== uniqueNames.size) {
					errors.push("Field names must be unique");
				}

				if (errors.length > 0) {
					return errors.join(", ");
				}
				return undefined;
			},
		},
		onSubmit: async ({ value }) => {
			onFieldsChange?.(value.fields);
		},
	});
};
