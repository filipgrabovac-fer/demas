import { useQuery } from "@tanstack/react-query";
import { queries } from "@/api/queries";

export const INTERNAL__useGetEnhancedDataDetail = ({
	id,
	enabled,
	refetchInterval,
}: {
	id: number;
	enabled?: boolean;
	refetchInterval?: number | false | ((data: unknown) => number | false);
}) => {
	return useQuery({
		...queries.dataOverview.getEnhancedDataDetail({ id }),
		enabled: enabled !== false && !!id,
		refetchInterval: refetchInterval,
	});
};
