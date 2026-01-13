import { INTERNAL__useGetOriginalDataList } from "./api_hooks/INTERNAL__useGetOriginalDataList";
import { INTERNAL__useGetOriginalDataDetail } from "./api_hooks/INTERNAL__useGetOriginalDataDetail";
import { INTERNAL__useGetEnhancedDataList } from "./api_hooks/INTERNAL__useGetEnhancedDataList";
import { INTERNAL__useGetEnhancedDataDetail } from "./api_hooks/INTERNAL__useGetEnhancedDataDetail";
import { INTERNAL__useDeleteEnhancedData } from "./api_hooks/INTERNAL__useDeleteEnhancedData";

export const INTERNAL__dataOverviewApi = {
	useGetOriginalDataList: INTERNAL__useGetOriginalDataList,
	useGetOriginalDataDetail: INTERNAL__useGetOriginalDataDetail,
	useGetEnhancedDataList: INTERNAL__useGetEnhancedDataList,
	useGetEnhancedDataDetail: INTERNAL__useGetEnhancedDataDetail,
	useDeleteEnhancedData: INTERNAL__useDeleteEnhancedData,
};
