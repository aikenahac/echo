"use client";

import { Link } from "@/i18n/routing";
import { useState, useTransition } from "react";
import { EllipsisVertical, Trash2, Star, Heart, Plus, Minus, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import {
  updateBookStatus,
  removeBookFromLibrary,
  toggleBookFavorite,
  type ReadingStatus,
} from "@/app/[locale]/actions/books";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { UserBook } from "@/types";
import { PageEditPopover, useBookProgress } from "./page-edit-popover";
import { AddToCollectionPopover } from "./collections/add-to-collection-popover";

interface BookCardProps {
  userBook: UserBook;
}

export function BookCard({ userBook }: BookCardProps) {
  const t = useTranslations("library");
  const tToast = useTranslations("toast");
  const tCard = useTranslations("bookCard");
  const [showMenu, setShowMenu] = useState(false);
  const [showCollectionPopover, setShowCollectionPopover] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { currentPage, maxPage, updateCurrentPage, updatePageCount } =
    useBookProgress(userBook);

  const handleStatusChange = (status: ReadingStatus) => {
    startTransition(async () => {
      const result = await updateBookStatus(userBook.id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("bookStatusUpdated"));
        setShowMenu(false);
      }
    });
  };

  const handleToggleFavorite = () => {
    startTransition(async () => {
      const newFavoriteStatus = !userBook.isFavorite;
      const result = await toggleBookFavorite(userBook.id, newFavoriteStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          newFavoriteStatus
            ? tToast("bookAddedToFavorites")
            : tToast("bookRemovedFromFavorites"),
        );
        setShowMenu(false);
      }
    });
  };

  const handleRemove = () => {
    if (!confirm(t("actions.removeConfirm"))) {
      return;
    }

    startTransition(async () => {
      const result = await removeBookFromLibrary(userBook.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("bookRemoved"));
      }
    });
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

  const progressPercentage = maxPage
    ? Math.min(100, Math.round((currentPage / maxPage) * 100))
    : 0;

  return (
    <Card className="flex flex-col group relative">
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("actions.changeStatus")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userBook.status !== "want" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("want")}
                disabled={isPending}
              >
                {tCard("status.want")}
              </DropdownMenuItem>
            )}
            {userBook.status !== "reading" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("reading")}
                disabled={isPending}
              >
                {tCard("status.reading")}
              </DropdownMenuItem>
            )}
            {userBook.status !== "finished" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("finished")}
                disabled={isPending}
              >
                {tCard("status.finished")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleToggleFavorite}
              disabled={isPending}
            >
              <Heart
                className={`h-4 w-4 mr-2 ${
                  userBook.isFavorite ? "fill-red-500 text-red-500" : ""
                }`}
              />
              {userBook.isFavorite
                ? t("actions.removeFromFavorites")
                : t("actions.addToFavorites")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setShowMenu(false);
                setShowCollectionPopover(true);
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              {tCard("addToCollection")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              disabled={isPending}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("actions.remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="p-0 relative">
        <Link
          href={`/books/${userBook.bookId}`}
          className="block relative h-64"
        >
          {userBook.book.coverUrl ? (
            <Image
              src={userBook.book.coverUrl}
              alt={userBook.book.title}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
              className="object-cover rounded-t-lg hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground hover:opacity-90 transition-opacity">
              {tCard("noCover")}
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleFavorite();
          }}
          disabled={isPending}
          className="absolute top-2 left-2 z-10 h-8 w-8 bg-background/80 hover:bg-background/90 backdrop-blur-sm shadow-md"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              userBook.isFavorite
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            }`}
          />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 pt-4">
        <Link href={`/books/${userBook.bookId}`}>
          <h3 className="font-semibold line-clamp-2 hover:underline">
            {userBook.book.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">
          {userBook.book.author}
        </p>

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
            currentPage={currentPage}
            maxPage={maxPage}
            updateCurrentPage={updateCurrentPage}
            updatePageCount={updatePageCount}
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
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {userBook.status === "reading" && !!maxPage && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {currentPage} / {maxPage} {tCard("pages")}
              </span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {userBook.status === "finished" && userBook.rating && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < userBook.rating!
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
        )}
      </CardFooter>

      {showCollectionPopover && (
        <div className="absolute -bottom-2 left-2 z-50">
          <AddToCollectionPopover
            userBookId={userBook.id}
            onOpenChange={(open) => {
              // Hide the floating trigger once the popover is dismissed
              if (!open) setShowCollectionPopover(false);
            }}
            trigger={
              <Button variant="outline" size="sm">
                <FolderPlus className="mr-2 h-4 w-4" />
                {tCard("selectCollections")}
              </Button>
            }
          />
        </div>
      )}
    </Card>
  );
}
