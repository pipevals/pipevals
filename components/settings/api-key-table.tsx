"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon, MoreHorizontalIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  lastRequest: string | Date | null;
  enabled: boolean;
}

// Better Auth's list endpoint returns { apiKeys: ApiKey[] } at runtime,
// but the SDK client types don't reflect this wrapper. Extract safely.
function extractApiKeys(data: unknown): ApiKeyRow[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const list = Array.isArray(obj.apiKeys) ? obj.apiKeys : Array.isArray(data) ? data : [];
  return list as ApiKeyRow[];
}

function isExpired(expiresAt: string | Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function toISOString(date: string | Date | null): string | null {
  if (!date) return null;
  return typeof date === "string" ? date : date.toISOString();
}

export function ApiKeyTable() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const { data } = await authClient.apiKey.list();
      setKeys(extractApiKeys(data));
    } catch {
      setKeys([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeError(null);
    const { error } = await authClient.apiKey.delete({ keyId: revokeTarget.id });
    if (error) {
      setRevokeError("Failed to revoke key. Please try again.");
      return;
    }
    setRevokeTarget(null);
    fetchKeys();
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (keys.length === 0 && !createOpen) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Key01Icon} size={24} />
            </EmptyMedia>
            <EmptyTitle>No API keys</EmptyTitle>
            <EmptyDescription>
              Create an API key to access your pipelines from CI, SDKs, or scripts.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create API Key
            </Button>
          </EmptyContent>
        </Empty>
        <CreateApiKeyDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={fetchKeys}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Create API Key
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => {
              const expired = isExpired(k.expiresAt);
              return (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">
                    {k.name || "Unnamed"}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {k.start ? `${k.start}...` : "—"}
                    </code>
                  </TableCell>
                  <TableCell>
                    {expired ? (
                      <Badge variant="secondary">Expired</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(toISOString(k.createdAt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(toISOString(k.expiresAt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(toISOString(k.lastRequest))}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setRevokeTarget(k)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={16} />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchKeys}
      />

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke{" "}
              <span className="font-medium text-foreground">
                {revokeTarget?.name || "this key"}
              </span>
              . Any integrations using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeError && (
            <p className="text-xs text-destructive">{revokeError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
