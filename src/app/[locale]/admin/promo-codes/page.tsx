import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { isPaidPlan } from "@/lib/plans";
import { getAllSubscriptionPlans } from "@/app/[locale]/actions/admin";
import { listPromoCodes } from "@/app/[locale]/actions/promo-admin";
import { CreatePromoCodeDialog } from "@/components/admin/create-promo-code-dialog";
import { PromoCodesTable } from "@/components/admin/promo-codes-table";

export default async function PromoCodesAdminPage() {
  // The admin layout lets moderators in; promo codes are admin-only
  if (!(await isAdmin())) redirect("/admin");

  const [codes, { plans = [] }] = await Promise.all([
    listPromoCodes(),
    getAllSubscriptionPlans(),
  ]);
  // Only plans that count as Premium can be granted
  const grantable = plans
    .filter((p) => p.isActive && isPaidPlan(p))
    .map((p) => ({ id: p.id, name: p.name, isInternal: p.isInternal }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">
            Codes that grant a plan for free, redeemed at /redeem
          </p>
        </div>
        <CreatePromoCodeDialog plans={grantable} />
      </div>

      <PromoCodesTable codes={codes} />
    </div>
  );
}
