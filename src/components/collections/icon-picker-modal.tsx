"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

// Curated list of 100 book-related icons
const BOOK_ICONS = [
  // Books & Reading
  "book", "book-open", "book-marked", "bookmark", "bookmark-plus", "library", "newspaper",
  "scroll", "file-text", "notebook-pen", "pencil", "feather",
  // Collections & Organization
  "folder", "folder-open", "archive", "inbox", "layers", "layout-grid",
  // Ratings & Favorites
  "star", "heart", "sparkles", "award", "medal", "trophy", "crown",
  "thumbs-up", "smile", "frown",
  // Genres - Fantasy & Magic
  "wand", "castle", "flame", "ghost", "moon", "sun",
  // Genres - Adventure & Mystery
  "compass", "map", "map-pin", "search", "eye", "shield", "sword", "key",
  // Genres - Sci-Fi & Tech
  "rocket", "satellite", "cpu", "zap", "radio",
  // Genres - Nature & Travel
  "tree-pine", "mountain", "waves", "cloud", "umbrella", "plane", "ship", "tent",
  // Genres - History & Culture
  "landmark", "church", "globe", "flag", "graduation-cap",
  // People & Characters
  "user", "users", "handshake", "baby", "skull", "glasses",
  // Time & Progress
  "clock", "calendar", "timer", "hourglass", "history", "rotate-cw",
  // Emotions & Themes
  "coffee", "wine", "cake", "gift", "music", "headphones", "palette",
  "flower-2", "leaf", "bird", "cat", "dog", "bug", "fish",
  // Mystery & Suspense
  "lock", "unlock", "fingerprint-pattern", "flashlight",
  // Actions & Status
  "check", "x", "plus", "minus", "circle", "square", "triangle",
  "arrow-right", "arrow-up", "arrow-down", "chevron-right",
  // Additional useful icons
  "tags", "tag", "lightbulb", "image", "camera", "film",
  "wallet", "gem", "dice-1", "dice-2", "dice-3", "dice-4", "dice-5", "dice-6"
] as const;

interface IconPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon?: string;
  onSelectIcon: (iconName: string) => void;
}

/**
 * Individual icon button component (memoized for performance)
 */
const IconButton = ({
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
        "flex items-center justify-center rounded-lg border p-5 transition-all hover:bg-accent hover:border-primary",
        isSelected && "bg-primary/10 border-primary ring-2 ring-primary"
      )}
      title={iconName}
    >
      <div className="w-10 h-10 flex items-center justify-center">
        <DynamicIcon
          name={iconName as any}
          className="w-8 h-8 text-black dark:text-white"
          absoluteStrokeWidth
        />
      </div>
    </button>
  );
};

IconButton.displayName = "IconButton";

export function IconPickerModal({
  open,
  onOpenChange,
  selectedIcon = "book",
  onSelectIcon,
}: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!debouncedSearch) {
      return BOOK_ICONS;
    }

    const query = debouncedSearch.toLowerCase();
    return BOOK_ICONS.filter((iconName) =>
      iconName.toLowerCase().includes(query)
    );
  }, [debouncedSearch]);

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
            Select from {BOOK_ICONS.length} curated book-related icons
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

        {/* Icon grid */}
        {filteredIcons.length > 0 ? (
          <div className="flex-1 overflow-auto border rounded-md p-3">
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
              {filteredIcons.map((iconName) => (
                <IconButton
                  key={iconName}
                  iconName={iconName}
                  isSelected={iconName === selectedIcon}
                  onSelect={handleSelect}
                />
              ))}
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
