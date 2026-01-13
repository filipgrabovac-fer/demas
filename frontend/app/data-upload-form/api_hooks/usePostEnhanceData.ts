import { apiClientFetch } from "@/api/apiClient";
import { components } from "@/api/schema";
import { useMutation } from "@tanstack/react-query";

export const INTERNAL__usePostEnhanceData = () => {
	return useMutation({
		mutationFn: async (
			data: components["schemas"]["EnhancedDataEnhanceRequest"],
		) => {
			const response = await apiClientFetch.POST(
				"/api/enhanced-data/enhance/",
				{
					body: data,
				},
			);
			return response.data;
		},
	});
};
