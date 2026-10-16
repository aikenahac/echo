import {
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

export type DataTableColumnMeta = {
  /** Name in the column toggle; defaults to the column id */
  label?: string;
  /** Applied to the header and every cell of the column */
  className?: string;
};

// Admin tables page and sort on the server, so no client row models are
// registered: TanStack only holds the state and renders.
export const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof features;
