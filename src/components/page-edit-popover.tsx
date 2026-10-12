"use client";

import { UserBook } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { startTransition, useOptimistic } from "react";
import { Label } from "@/components/ui/label";
import { NumberSpinner } from "./number-spinner";
import {
  updateBookCurrentPage,
  updateBookPageCount,
} from "@/app/[locale]/actions/books";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/**
 * Reading progress of a book with optimistic updates: the UI reflects changes
 * immediately (so rapid +/- clicks accumulate) and falls back to the server
 * value if an update fails. The actions revalidate the library, which updates
 * the `userBook` prop.
 */
export function useBookProgress(userBook: UserBook) {
  const tToast = useTranslations("toast");
  const [currentPage, setOptimisticCurrentPage] = useOptimistic(
    userBook.currentPage || 0,
  );
  const [pageCount, setOptimisticPageCount] = useOptimistic(
    userBook.pageCount || 0,
  );

  // The user's own page count wins over the catalog value
  const maxPage = pageCount || userBook.book.pages || null;

  const updateCurrentPage = (newValue: number) => {
    const value = Math.max(0, Math.min(newValue, maxPage ?? Infinity));
    if (value === currentPage) {
      return;
    }

    startTransition(async () => {
      setOptimisticCurrentPage(value);
      const result = await updateBookCurrentPage(userBook.id, value);
      if (result.error) {
        toast.error(tToast("pageUpdateError"));
      }
    });
  };

  const updatePageCount = (newValue: number) => {
    if (newValue === pageCount) {
      return;
    }

    startTransition(async () => {
      setOptimisticPageCount(newValue);
      const result = await updateBookPageCount(userBook.id, newValue);
      if (result.error) {
        toast.error("There was an error updating the page count");
      }
    });
  };

  return {
    currentPage,
    maxPage,
    updateCurrentPage,
    updatePageCount,
  };
}

type Props = {
  currentPage: number;
  maxPage: number | null;
  updateCurrentPage: (newValue: number) => void;
  updatePageCount: (newValue: number) => void;
}

export function PageEditPopover({
  currentPage,
  maxPage,
  updateCurrentPage,
  updatePageCount,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">{currentPage} / {maxPage ?? "?"}</Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-4 w-64">
        <div className="gap-2">
          <Label>Current Page</Label>
          <NumberSpinner
            value={currentPage}
            max={maxPage}
            onChange={updateCurrentPage}
          />
        </div>
        <div className="gap-2">
          <Label>Page Count</Label>
          <NumberSpinner
            value={maxPage ?? 0}
            onChange={updatePageCount}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
