"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/routing";

interface PremiumPaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  description?: string;
}

export function PremiumPaywallDialog({
  open,
  onOpenChange,
  feature = "Custom Collections",
  description = "Create and organize custom collections to group your books by theme, genre, or any category you choose.",
}: PremiumPaywallDialogProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push("/subscription");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Upgrade to Premium for {feature}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Unlimited Books</p>
              <p className="text-sm text-muted-foreground">
                Add as many books as you want to your library
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Custom Collections</p>
              <p className="text-sm text-muted-foreground">
                Organize your books into personalized collections
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Priority Support</p>
              <p className="text-sm text-muted-foreground">
                Get help faster when you need it
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            <Crown className="mr-2 h-4 w-4" />
            View Premium Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
