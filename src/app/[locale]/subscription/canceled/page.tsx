import { XCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriptionCanceledPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <XCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Checkout Canceled</CardTitle>
          <CardDescription>
            You canceled the checkout process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              No worries! You can upgrade to Premium anytime to unlock unlimited
              book tracking and future premium features.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button asChild>
              <Link href="/subscription">View Plans</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/library">Back to Library</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
