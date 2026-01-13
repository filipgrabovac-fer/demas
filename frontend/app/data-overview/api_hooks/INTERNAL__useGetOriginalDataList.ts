import { useQuery } from "@tanstack/react-query";
import { queries } from "@/api/queries";

export const INTERNAL__useGetOriginalDataList = () => {
	return useQuery({
		...queries.dataOverview.getOriginalDataList(),
	});
};
