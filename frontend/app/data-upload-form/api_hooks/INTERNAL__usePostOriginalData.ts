import { apiClientFetch } from "@/api/apiClient";
import { components } from "@/api/schema";
import { useMutation } from "@tanstack/react-query";

export const INTERNAL__usePostOriginalData = () => {
	return useMutation({
		mutationFn: async (
			data: {
				data: components["schemas"]["OriginalData"]["data"];
			},
		) => {
			const response = await apiClientFetch.POST("/api/original-data/", {
				body: data,
			});
			return response.data;
		},
	});
};
