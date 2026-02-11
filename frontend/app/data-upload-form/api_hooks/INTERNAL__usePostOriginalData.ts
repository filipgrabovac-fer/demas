import { apiClientFetch } from "@/api/apiClient";
import { components } from "@/api/schema";
import { useMutation } from "@tanstack/react-query";

export const INTERNAL__usePostOriginalData = () => {
	return useMutation({
		mutationFn: async (data: {
			data: components["schemas"]["OriginalData"]["data"];
			schema?: Record<string, "int" | "str" | "bool" | "float">;
		}) => {
			const response = await apiClientFetch.POST("/api/original-data/", {
				body: {
					...data,
					id: 1,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			});
			return response.data;
		},
	});
};
