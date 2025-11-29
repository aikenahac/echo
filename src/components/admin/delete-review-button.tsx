"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteReviewAsAdmin } from "@/app/[locale]/actions/admin";
import { toast } from "sonner";

interface DeleteReviewButtonProps {
  reviewId: string;
}

export function DeleteReviewButton({ reviewId }: DeleteReviewButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteReviewAsAdmin(reviewId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Review deleted successfully");
      }
    } catch (error) {
      toast.error("Failed to delete review");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </>
      )}
    </Button>
  );
}
