import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { INTERNAL__dataOverviewQueries } from "@/app/data-overview/_data-overview.queries";

export const queries = mergeQueryKeys(INTERNAL__dataOverviewQueries);
