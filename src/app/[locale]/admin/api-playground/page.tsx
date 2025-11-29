import { requireRole } from "@/lib/auth";
import { ApiPlayground } from "@/components/admin/api-playground";
import { apiEndpoints } from "@/lib/api-docs";

export default async function ApiPlaygroundPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Playground</h1>
        <p className="text-muted-foreground">
          Test and explore all available API endpoints
        </p>
      </div>

      <ApiPlayground endpoints={apiEndpoints} />
    </div>
  );
}
