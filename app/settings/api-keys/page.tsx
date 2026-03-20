import { ApiKeyTable } from "@/components/settings/api-key-table";

export default function ApiKeysPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-medium">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage API keys for programmatic access to your pipelines.
        </p>
      </div>
      <ApiKeyTable />
    </div>
  );
}
