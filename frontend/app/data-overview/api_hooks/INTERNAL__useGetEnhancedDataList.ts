import { useQuery } from "@tanstack/react-query";
import { queries } from "@/api/queries";

export const INTERNAL__useGetEnhancedDataList = () => {
	return useQuery({
		...queries.dataOverview.getEnhancedDataList(),
	});
};
