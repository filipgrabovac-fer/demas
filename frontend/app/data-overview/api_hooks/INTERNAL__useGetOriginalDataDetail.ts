import { useQuery } from "@tanstack/react-query";
import { queries } from "@/api/queries";

export const INTERNAL__useGetOriginalDataDetail = ({ id }: { id: number }) => {
	return useQuery({
		...queries.dataOverview.getOriginalDataDetail({ id }),
	});
};
