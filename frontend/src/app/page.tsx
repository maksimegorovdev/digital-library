import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchHealth } from "@/lib/api";

export default async function Home() {
  const health = await fetchHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>digital-library</CardTitle>
        </CardHeader>
        <CardContent>
          {health.ok ? (
            <p className="text-sm text-green-600">
              Backend status: <span className="font-mono">{health.status}</span>
            </p>
          ) : (
            <p className="text-sm text-red-600">
              Backend unreachable: <span className="font-mono">{health.error}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
