"use client";

import { Link } from "@/i18n/routing";
import { useState, useTransition } from "react";
import { MoreVertical, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import {
  updateBookStatus,
  removeBookFromLibrary,
  type ReadingStatus,
} from "@/app/[locale]/actions/books";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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

interface BookCardProps {
  userBook: UserBook;
}

export function BookCard({ userBook }: BookCardProps) {
  const t = useTranslations("library");
  const tToast = useTranslations("toast");
  const [showMenu, setShowMenu] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const progressPercentage =
    userBook.book.pages && userBook.currentPage
      ? Math.round((userBook.currentPage / userBook.book.pages) * 100)
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
              <MoreVertical className="h-4 w-4" />
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
                Want to Read
              </DropdownMenuItem>
            )}
            {userBook.status !== "reading" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("reading")}
                disabled={isPending}
              >
                Currently Reading
              </DropdownMenuItem>
            )}
            {userBook.status !== "finished" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("finished")}
                disabled={isPending}
              >
                Finished
              </DropdownMenuItem>
            )}
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

      <CardHeader className="p-0">
        <Link href={`/books/${userBook.bookId}`} className="block relative h-64">
          {userBook.book.coverUrl ? (
            <Image
              src={userBook.book.coverUrl}
              alt={userBook.book.title}
              fill
              className="object-cover rounded-t-lg hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground hover:opacity-90 transition-opacity">
              No cover
            </div>
          )}
        </Link>
      </CardHeader>

      <CardContent className="flex-1 pt-4">
        <Link href={`/books/${userBook.bookId}`}>
          <h3 className="font-semibold line-clamp-2 hover:underline">
            {userBook.book.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">{userBook.book.author}</p>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {userBook.status === "reading" && userBook.book.pages && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {userBook.currentPage || 0} / {userBook.book.pages} pages
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
    </Card>
  );
}
