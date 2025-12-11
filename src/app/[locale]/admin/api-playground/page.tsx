import { requireRole } from "@/lib/auth";
import { ApiPlayground } from "@/components/admin/api-playground";
import { apiEndpoints, integrationGuide } from "@/lib/api-docs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

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

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>{integrationGuide.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {integrationGuide.sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                {section.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {section.content}
                  </p>
                )}
              </div>

              {section.steps && (
                <div className="space-y-4">
                  {section.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="space-y-2">
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs font-mono">{step.code}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All API endpoints require a valid Clerk session token. Make sure
              your mobile app is properly configured with Clerk authentication
              before making API requests.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
