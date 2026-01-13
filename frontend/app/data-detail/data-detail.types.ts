export type NewColumn = {
	name: string;
	description: string;
	type?: "int" | "str" | "bool" | "float";
};

export type SchemaField = {
	name: string;
	description: string;
	isOriginal: boolean;
};
