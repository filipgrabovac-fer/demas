import { apiClientFetch } from "@/api/apiClient";
import { useMutation } from "@tanstack/react-query";

export const INTERNAL__useDeleteEnhancedData = () => {
	return useMutation({
		mutationFn: async ({ id }: { id: number }) => {
			const response = await apiClientFetch.DELETE("/api/enhanced-data/{id}/", {
				params: {
					path: { id },
				},
			});
			return response.data;
		},
	});
};
