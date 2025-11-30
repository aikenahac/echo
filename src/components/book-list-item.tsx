import { UserBook } from "@/types";
import { Card } from "./ui/card";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { CheckCircle, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { updateBookCurrentPage } from "@/app/[locale]/actions/books";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { PageEditPopover } from "./page-edit-popover";

export function BookListItem({ userBook }: { userBook: UserBook }) {
  const [currentPage, setCurrentPage] = useState(userBook.currentPage || 0);

  const updateCurrentPage = async (newValue: number) => {
    if (userBook.pageCount && newValue > userBook.pageCount) {
      return;
    }

    const result = await updateBookCurrentPage(userBook.id, newValue);

    if (result.error) {
      toast.error("There was an error updating the current page");
      return;
    }

    setCurrentPage(newValue);
  };

  const handleDecrementCurrentPage = () => {
    // Prevent the value from going below 0
    if (currentPage > 0) {
      updateCurrentPage(currentPage - 1);
    }
  };

  const handleIncrementCurrentPage = () => {
    updateCurrentPage(currentPage + 1);
  };

  return (
    <Card key={userBook.id} className="flex flex-row gap-3 md:gap-4 p-3 md:p-4">
      <Link
        href={`/books/${userBook.bookId}`}
        className="relative w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 shrink-0"
      >
        {userBook.book.coverUrl ? (
          <Image
            src={userBook.book.coverUrl}
            alt={userBook.book.title}
            fill
            className="object-cover rounded"
          />
        ) : (
          <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
            No cover
          </div>
        )}
      </Link>
      <div className="flex-1 flex flex-col gap-1 md:gap-2 min-w-0">
        <div>
          <Link href={`/books/${userBook.bookId}`}>
            <h3 className="font-semibold hover:underline text-sm md:text-base line-clamp-2">
              {userBook.book.title}
            </h3>
          </Link>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {userBook.book.author}
          </p>
        </div>
        {userBook.status === "reading" && userBook.book.pages && (
          <div className="flex flex-row items-center gap-1 mt-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDecrementCurrentPage}
            >
              <Minus className="h-2 w-2" />
            </Button>
            <PageEditPopover
              userBook={userBook}
              currentPage={currentPage}
              updateCurrentPage={updateCurrentPage}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleIncrementCurrentPage}
            >
              <Plus className="h-2 w-2" />
            </Button>
          </div>
        )}
        {userBook.status === "finished" && userBook.rating && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <CheckCircle
                key={i}
                className={`h-3 w-3 ${
                  i < userBook.rating!
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
