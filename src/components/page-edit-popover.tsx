import { UserBook } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { NumberSpinner } from "./number-spinner";
import { updateBookPageCount } from "@/app/[locale]/actions/books";
import { toast } from "sonner";

type Props = {
  userBook: UserBook;
  currentPage: number;
  updateCurrentPage: (newValue: number) => void;
}

export function PageEditPopover({ userBook, currentPage, updateCurrentPage }: Props) {
  const [pageCount, setPageCount] = useState<number>(userBook.pageCount || 0);

  const updatePageCount = async (newValue: number) => {
    const result = await updateBookPageCount(userBook.id, newValue);

    if (result.error) {
      toast.error("There was an error updating the page count");
      return;
    }

    setPageCount(newValue);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">{userBook.currentPage} / {userBook.pageCount}</Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-4 w-64">
        <div className="gap-2">
          <Label>Current Page</Label>
          <NumberSpinner
            value={currentPage}
            onChange={updateCurrentPage}
          />
        </div>
        <div className="gap-2">
          <Label>Page Count</Label>
          <NumberSpinner
            value={pageCount}
            onChange={updatePageCount}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}