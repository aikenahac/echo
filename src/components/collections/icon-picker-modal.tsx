"use client";

import { useState, useMemo, useCallback, memo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useVirtualizer } from "@tanstack/react-virtual";

interface IconPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon?: string;
  onSelectIcon: (iconName: string) => void;
}

/**
 * Individual icon button component (memoized for performance)
 */
const IconButton = memo(({
  iconName,
  isSelected,
  onSelect,
}: {
  iconName: string;
  isSelected: boolean;
  onSelect: (iconName: string) => void;
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(iconName)}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-all hover:bg-accent hover:border-primary",
        isSelected && "bg-primary/10 border-primary ring-2 ring-primary"
      )}
      title={iconName}
    >
      <DynamicIcon name={iconName as any} className="h-8 w-8" />
      {isSelected && (
        <div className="absolute top-1 right-1 rounded-full bg-primary p-0.5">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
});

IconButton.displayName = "IconButton";

export function IconPickerModal({
  open,
  onOpenChange,
  selectedIcon = "book",
  onSelectIcon,
}: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!debouncedSearch) {
      return iconNames;
    }

    const query = debouncedSearch.toLowerCase();
    return iconNames.filter((iconName) =>
      iconName.toLowerCase().includes(query)
    );
  }, [debouncedSearch]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredIcons.length / 10),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 3,
  });

  const handleSelect = useCallback((iconName: string) => {
    onSelectIcon(iconName);
    onOpenChange(false);
  }, [onSelectIcon, onOpenChange]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose an Icon</DialogTitle>
          <DialogDescription>
            Search from {iconNames.length.toLocaleString()} available Lucide icons
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-20"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Results count */}
        {debouncedSearch && (
          <div className="text-sm text-muted-foreground">
            Found {filteredIcons.length} icon{filteredIcons.length !== 1 ? "s" : ""}
          </div>
        )}

        {/* Virtualized icon grid */}
        {filteredIcons.length > 0 ? (
          <div
            ref={parentRef}
            className="flex-1 overflow-auto border rounded-md p-2"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIdx = virtualRow.index * 10;
                const rowIcons = filteredIcons.slice(startIdx, startIdx + 10);

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-10 gap-2">
                      {rowIcons.map((iconName) => (
                        <IconButton
                          key={iconName}
                          iconName={iconName}
                          isSelected={iconName === selectedIcon}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No icons found</p>
            <p className="text-sm text-muted-foreground">
              Try a different search term
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
