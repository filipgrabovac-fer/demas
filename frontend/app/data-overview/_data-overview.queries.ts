import { createQueryKeys } from "@lukemorales/query-key-factory";
import { apiClientFetch } from "@/api/apiClient";

export const INTERNAL__dataOverviewQueries = createQueryKeys("dataOverview", {
	getOriginalDataList: () => ({
		queryKey: ["getOriginalDataList"],
		queryFn: async () => {
			const response = await apiClientFetch.GET("/api/original-data/");

			const { error } = response;
			if (error) {
				throw new Error("Failed to fetch original data list", { cause: error });
			}

			return response.data;
		},
	}),
	getOriginalDataDetail: ({ id }: { id: number }) => ({
		queryKey: ["getOriginalDataDetail", id],
		queryFn: async () => {
			const response = await apiClientFetch.GET("/api/original-data/{id}/", {
				params: {
					path: { id },
				},
			});

			const { error } = response;
			if (error) {
				throw new Error("Failed to fetch original data detail", {
					cause: error,
				});
			}

			return response.data;
		},
	}),
	getEnhancedDataList: () => ({
		queryKey: ["getEnhancedDataList"],
		queryFn: async () => {
			const response = await apiClientFetch.GET("/api/enhanced-data/");

			const { error } = response;
			if (error) {
				throw new Error("Failed to fetch enhanced data list", { cause: error });
			}

			return response.data;
		},
	}),
	getEnhancedDataDetail: ({ id }: { id: number }) => ({
		queryKey: ["getEnhancedDataDetail", id],
		queryFn: async () => {
			const response = await apiClientFetch.GET("/api/enhanced-data/{id}/", {
				params: {
					path: { id },
				},
			});

			const { error } = response;
			if (error) {
				throw new Error("Failed to fetch enhanced data detail", {
					cause: error,
				});
			}

			return response.data;
		},
	}),
});
