"use client";

import { useState } from "react";
import { ApiEndpoint } from "@/lib/api-docs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ApiPlaygroundProps {
  endpoints: ApiEndpoint[];
}

export function ApiPlayground({ endpoints }: ApiPlaygroundProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(
    endpoints[0],
  );
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(selectedEndpoint.requestBody?.example || {}, null, 2),
  );
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const categories = Array.from(new Set(endpoints.map((e) => e.category)));

  const handleEndpointSelect = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(
      JSON.stringify(endpoint.requestBody?.example || {}, null, 2),
    );
    setResponse(null);
    setQueryParams({});
  };

  const buildUrl = () => {
    let url = selectedEndpoint.path;

    // Replace path parameters with example values
    url = url.replace(/{id}/g, "example-id-123");
    url = url.replace(/{userId}/g, "example-user-id");

    // Add query parameters
    if (selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return url;
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const url = buildUrl();
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (selectedEndpoint.method !== "GET" && selectedEndpoint.method !== "DELETE") {
        try {
          JSON.parse(requestBody); // Validate JSON
          options.body = requestBody;
        } catch (error) {
          toast.error("Invalid JSON in request body");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(url, options);
      const data = await res.json();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
      });
    } catch (error: any) {
      setResponse({
        status: 500,
        statusText: "Error",
        data: { error: error.message },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(selectedEndpoint.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
    toast.success("Path copied to clipboard");
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500";
      case "POST":
        return "bg-green-500";
      case "PUT":
        return "bg-yellow-500";
      case "DELETE":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Endpoint Selector */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {categories.slice(0, 4).map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 pr-4">
                    {endpoints
                      .filter((e) => e.category === category)
                      .map((endpoint) => (
                        <button
                          key={endpoint.path + endpoint.method}
                          onClick={() => handleEndpointSelect(endpoint)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedEndpoint === endpoint
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={`${getMethodColor(endpoint.method)} text-white text-xs`}
                            >
                              {endpoint.method}
                            </Badge>
                          </div>
                          <p className="text-sm font-mono truncate">
                            {endpoint.path}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {endpoint.description}
                          </p>
                        </button>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Builder & Response */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`${getMethodColor(selectedEndpoint.method)} text-white`}>
                  {selectedEndpoint.method}
                </Badge>
                <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyPath}
                  className="h-6 w-6"
                >
                  {copiedPath ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedEndpoint.description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Query Parameters */}
          {selectedEndpoint.queryParams &&
            selectedEndpoint.queryParams.length > 0 && (
              <div>
                <Label className="text-base font-semibold">Query Parameters</Label>
                <div className="mt-2 space-y-3">
                  {selectedEndpoint.queryParams.map((param) => (
                    <div key={param.name}>
                      <Label htmlFor={param.name} className="text-sm">
                        {param.name}{" "}
                        {param.required && (
                          <span className="text-red-500">*</span>
                        )}
                      </Label>
                      <Input
                        id={param.name}
                        placeholder={param.description}
                        value={queryParams[param.name] || ""}
                        onChange={(e) =>
                          setQueryParams({
                            ...queryParams,
                            [param.name]: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {param.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Request Body */}
          {selectedEndpoint.method !== "GET" &&
            selectedEndpoint.method !== "DELETE" &&
            selectedEndpoint.requestBody && (
              <div>
                <Label className="text-base font-semibold">Request Body</Label>
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={12}
                  className="font-mono text-sm mt-2"
                  placeholder="Enter JSON request body"
                />
              </div>
            )}

          {/* Test Button */}
          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>

          {/* Response */}
          {response && (
            <div>
              <Label className="text-base font-semibold">
                Response ({response.status} {response.statusText})
              </Label>
              <div
                className={`mt-2 rounded-lg p-4 ${
                  response.status >= 200 && response.status < 300
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <pre className="text-sm overflow-auto max-h-[300px]">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Documentation */}
          <div>
            <Label className="text-base font-semibold">Documentation</Label>
            <div className="mt-2 space-y-4">
              {selectedEndpoint.requestBody && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Request Schema</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(
                        selectedEndpoint.requestBody.schema,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Responses</h4>
                <div className="space-y-2">
                  {selectedEndpoint.responses.map((res) => (
                    <div
                      key={res.status}
                      className="bg-muted p-3 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{res.status}</Badge>
                        <span className="text-sm">{res.description}</span>
                      </div>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(res.example, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
