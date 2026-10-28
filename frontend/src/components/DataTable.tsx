"use client";

import * as React from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import AdvancedSearchModal, {
  AdvancedSearchFilters,
} from "./AdvancedSearchModal";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";
import StatusBadge from "./StatusBadge";

export type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode; //eslint-disable-line @typescript-eslint/no-explicit-any
};

interface DataTableProps<T> {
  columns: any[]; //eslint-disable-line @typescript-eslint/no-explicit-any
  data: any[]; //eslint-disable-line @typescript-eslint/no-explicit-any
  itemsPerPage?: number;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  search?: boolean;
  searchEndpoint?: string;
  onSearchResults?: (results: unknown[], totalPages: number) => void;
  onClearSearch?: () => void;
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  itemsPerPage = 10,
  totalPages: serverTotalPages,
  currentPage: serverCurrentPage,
  onPageChange,
  loading = false,
  search = true,
  searchEndpoint,
  onSearchResults,
  onClearSearch,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(serverCurrentPage || 1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filteredData, setFilteredData] = React.useState<T[]>(data);
  const [serverResults, setServerResults] = React.useState<T[] | null>(null);
  const [isServerFiltered, setIsServerFiltered] = React.useState(false);
  const [localLoading, setLocalLoading] = React.useState(false);
  const [columnFilters, setColumnFilters] = React.useState<
    Record<string, string[]>
  >({});
  const [rangeFilters, setRangeFilters] = React.useState<
    Record<string, { min?: number; max?: number }>
  >({});
  const [activeSearchFilters, setActiveSearchFilters] =
    React.useState<AdvancedSearchFilters | null>(null);
  const [serverSearchTotalPages, setServerSearchTotalPages] =
    React.useState<number>(0);

  const isServerPagination = !!onPageChange;

  const applyFilters = React.useCallback(() => {
    let filtered = data;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return String(value)
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnKey, selectedValues]) => {
      if (selectedValues.length > 0) {
        filtered = filtered.filter((row) => {
          const value = String(row[columnKey]);
          return selectedValues.includes(value);
        });
      }
    });

    // Apply range filters
    Object.entries(rangeFilters).forEach(([columnKey, range]) => {
      if (range.min !== undefined || range.max !== undefined) {
        filtered = filtered.filter((row) => {
          const value = parseFloat(
            String(row[columnKey]).replace(/[^\d.-]/g, "")
          );
          if (isNaN(value)) return true;
          return (
            (!range.min || value >= range.min) &&
            (!range.max || value <= range.max)
          );
        });
      }
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, searchQuery, columnFilters, rangeFilters, columns]);

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return applyFilters();

    // Use custom endpoint if provided, otherwise default to requisitions
    const endpoint = searchEndpoint || "/requisitions";
    const searchParam = searchEndpoint ? "search" : "title";

    try {
      setLocalLoading(true);
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}${endpoint}?page=1&limit=${itemsPerPage}&${searchParam}=${encodeURIComponent(
          trimmed
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();

      if (json.success) {
        setServerResults(json.data);
        if (json.pagination) {
          setServerSearchTotalPages(json.pagination.pages);
        }
        // Call parent callback if provided
        if (onSearchResults) {
          onSearchResults(json.data, json.pagination?.pages || 1);
        }
      } else {
        // Fallback for other response shapes
        const results = Array.isArray(json)
          ? json
          : json?.data ?? json?.results ?? [];
        setServerResults(results);
      }
      setIsServerFiltered(true);
      setCurrentPage(1);
    } catch (error) {
      console.error("Server search failed:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAdvancedSearch = async (filters: AdvancedSearchFilters) => {
    setActiveSearchFilters(filters); // Persist advanced filters for pagination
    const { searchQuery: term, category, dateRange } = filters;

    const params = new URLSearchParams({
      page: "1",
      limit: String(itemsPerPage),
    });

    if (term) params.set("title", term);
    if (category) params.set("category", category);
    if (dateRange) params.set("dateRange", dateRange);

    try {
      setLocalLoading(true);
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/requisitions?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();

      if (json.success) {
        setServerResults(json.data);
        if (json.pagination) {
          setServerSearchTotalPages(json.pagination.pages);
        }
      } else {
        // Fallback for other response shapes
        const results = Array.isArray(json)
          ? json
          : json?.data ?? json?.results ?? [];
        setServerResults(results);
      }
      setIsServerFiltered(true);
      // Also update the main search box to reflect the term used in advanced search
      setSearchQuery(term);
      setCurrentPage(1);
    } catch (error) {
      console.error("Advanced server search failed:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClearSearch = () => {
    // Clear server-side results (if any) and restore initial data.
    setServerResults(null);
    setIsServerFiltered(false);
    setColumnFilters({});
    setRangeFilters({});
    setFilteredData(data);
    setSearchQuery(""); // Clear the search input as well
    setActiveSearchFilters(null); // Clear persisted advanced filters
    setServerSearchTotalPages(0); // Reset search total pages
    
    // Notify parent component to restore original data
    if (onClearSearch) {
      onClearSearch();
    }
  };

  const getUniqueValues = (columnKey: string) => {
    const values = data.map((row) => String(row[columnKey])).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const handleFilterChange = (
    columnKey: string,
    value: string,
    checked: boolean
  ) => {
    setColumnFilters((prev) => {
      const current = prev[columnKey] || [];
      if (checked) {
        return { ...prev, [columnKey]: [...current, value] };
      } else {
        return { ...prev, [columnKey]: current.filter((v) => v !== value) };
      }
    });
  };

  const handleRangeChange = (
    columnKey: string,
    type: "min" | "max",
    value: string
  ) => {
    setRangeFilters((prev) => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        [type]: value ? parseFloat(value) : undefined,
      },
    }));
  };

  const isRangeColumn = (key: string) => {
    return ["quantityNeeded", "estimatedUnitPrice", "createdAt"].includes(key);
  };

  const getMinMaxValues = (columnKey: string) => {
    const values = data
      .map((row) => {
        const val = String(row[columnKey]).replace(/[^\d.-]/g, "");
        return parseFloat(val);
      })
      .filter((v) => !isNaN(v));
    return { min: Math.min(...values), max: Math.max(...values) };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  React.useEffect(() => {
    // If there's no active server filter, keep filteredData synced to prop `data`.
    if (!isServerFiltered) {
      setFilteredData(data);
    }
  }, [data, isServerFiltered]);

  React.useEffect(() => {
    if (!isServerPagination) {
      applyFilters();
    }
  }, [applyFilters, isServerPagination]);

  React.useEffect(() => {
    if (serverCurrentPage) {
      setCurrentPage(serverCurrentPage);
    }
  }, [serverCurrentPage]);

  const totalPagesToRender = isServerFiltered
    ? serverSearchTotalPages
    : serverTotalPages || Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = isServerFiltered
    ? serverResults ?? []
    : isServerPagination
    ? data
    : filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const handlePageChange = (page: number) => {
    if (isServerFiltered) {
      // If a server-side search is active, handle pagination internally
      // by re-fetching with the new page number.
      const fetchSearchedPage = async (newPage: number) => {
        // Use persisted advanced filters if available, otherwise use simple search query
        const searchTitle = activeSearchFilters?.searchQuery || searchQuery;
        const searchCategory = activeSearchFilters?.category;
        const searchDateRange = activeSearchFilters?.dateRange;

        const params = new URLSearchParams({
          page: String(newPage),
          limit: String(itemsPerPage),
        });
        const searchParam = searchEndpoint ? "search" : "title";
        if (searchTitle) params.set(searchParam, searchTitle);
        if (searchCategory) params.set("category", searchCategory);
        if (searchDateRange) params.set("dateRange", searchDateRange);

        try {
          setLocalLoading(true);
          const token = getToken();
          const endpoint = searchEndpoint || "/requisitions";
          const res = await fetch(
            `${API_BASE_URL}${endpoint}?${params.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const json = await res.json();
          if (json.success) {
            setServerResults(json.data);
            if (json.pagination) {
              setServerSearchTotalPages(json.pagination.pages);
            }
          } else {
            const results = Array.isArray(json)
              ? json
              : json?.data ?? json?.results ?? [];
            setServerResults(results);
          }
          setCurrentPage(newPage);
        } catch (error) {
          console.error("Server search pagination failed:", error);
        } finally {
          setLocalLoading(false);
        }
      };
      fetchSearchedPage(page);
    } else if (isServerPagination && onPageChange) {
      // Default to parent-controlled pagination if no search is active
      onPageChange(page);
    } else {
      // Client-side pagination
      setCurrentPage(page);
    }
  };

  return (
    <div className="w-full">
      {search !== false ? (
        <div className="search-filter w-full flex flex-col lg:flex-row items-center gap-4 lg:gap-2 mb-8">
          <div className=" search relative w-[100%]">
            <Input
              type="text"
              value={searchQuery}
              placeholder="Search table"
              onKeyPress={handleKeyPress}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#FFFFFF] pl-4 pr-4 py-2 w-full h-12 rounded-md shadow-md"
            />

            <Button
              onClick={handleSearch}
              disabled={localLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent hover:bg-transparent p-0 h-auto"
            >
              {localLoading ? (
                <Loader2 className="animate-spin" color="black" size={20} />
              ) : (
                <Search color="black" size={20} />
              )}
            </Button>
          </div>

          {isServerFiltered && (
            <Button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md"
            >
              Clear
            </Button>
          )}

          <AdvancedSearchModal
            trigger={
              <Button
                asChild
                variant="default"
                disabled={localLoading}
                className={`px-4 md:px-6 py-4 bg-[#0F1E7A] text-sm lg:text-base text-white cursor-pointer ${localLoading ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {localLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <span>Advanced Search</span>
                  )}
                </div>
              </Button>
            }
            onSearch={handleAdvancedSearch}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className="whitespace-nowrap text-base font-semibold"
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="bg-white">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F1E7A]"></div>
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={row.id ?? rowIndex}>
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className="whitespace-nowrap"
                    >
                      {col.key === "status" ? (
                        <StatusBadge status={row[col.key]} />
                      ) : col.render ? (
                        col.render(row[col.key], row)
                      ) : (
                        String(row[col.key])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPagesToRender > 1 && (
        <div className="flex justify-start mt-4">
          <Pagination className="!justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  className={`cursor-pointer ${
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  } `}
                  aria-label="Go to previous page"
                >
                  &lt;
                </PaginationLink>
              </PaginationItem>
              {Array.from({ length: totalPagesToRender }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationLink
                  onClick={() =>
                    handlePageChange(
                      Math.min(currentPage + 1, totalPagesToRender)
                    )
                  }
                  className={`cursor-pointer ${
                    currentPage === totalPagesToRender
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                  aria-label="Go to next page"
                >
                  &gt;
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
