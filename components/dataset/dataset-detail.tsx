"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, Copy01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import type { DatasetWithItems, DatasetItem } from "@/lib/api/datasets";
import { handleApiError } from "@/lib/handle-api-error";
import { useOrgRoleStore } from "@/lib/stores/org-role";

interface DatasetDetailProps {
  dataset: DatasetWithItems;
}

export function DatasetDetail({ dataset: initial }: DatasetDetailProps) {
  const readOnly = useOrgRoleStore((s) => s.readOnly);
  const [items, setItems] = useState<DatasetItem[]>(initial.items);
  const [addingItems, setAddingItems] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const schemaKeys = Object.keys(initial.schema);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/datasets/${initial.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items);
    } catch (e) {
      await handleApiError(e);
    }
  };

  const onDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(
        `/api/datasets/${initial.id}/items/${itemId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        await handleApiError(res);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      await handleApiError(e);
    }
  };

  const onAddItems = async () => {
    setAddError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setAddError("Invalid JSON");
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setAddError("Must be a non-empty JSON array");
      return;
    }

    try {
      const res = await fetch(`/api/datasets/${initial.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "Failed to add items");
        return;
      }

      setJsonInput("");
      setAddingItems(false);
      await fetchItems();
    } catch (e) {
      setAddError("Failed to add items");
      await handleApiError(e);
    }
  };

  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="flex h-12 shrink-0 items-center justify-between px-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/datasets">Datasets</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1.5">
                  {initial.name}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        aria-label="Copy dataset ID"
                        onClick={() => {
                          navigator.clipboard.writeText(initial.id);
                          setIdCopied(true);
                          setTimeout(() => setIdCopied(false), 2000);
                        }}
                      >
                        {idCopied ? (
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                        ) : (
                          <HugeiconsIcon icon={Copy01Icon} size={12} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {idCopied ? "Copied!" : `Copy ID: ${initial.id}`}
                    </TooltipContent>
                  </Tooltip>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button size="sm" onClick={() => setAddingItems(true)} disabled={readOnly}>
            Add Items
          </Button>
        </div>
      </div>

      <main className="px-8 py-8 flex flex-col gap-6">
        {/* Dataset info */}
        <div className="flex flex-col gap-1">
          {initial.description && (
            <p className="text-xs text-muted-foreground">
              {initial.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Schema: {schemaKeys.join(", ")} &middot; {items.length} items
          </p>
        </div>

        {/* Items table */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No items yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add items as a JSON array
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingItems(true)}
            >
              Add items
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {schemaKeys.map((key) => (
                    <TableHead key={key} className="text-xs">
                      {key}
                    </TableHead>
                  ))}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {schemaKeys.map((key) => (
                      <TableCell
                        key={key}
                        className="text-xs max-w-xs truncate"
                      >
                        {String(
                          (item.data as Record<string, unknown>)[key] ?? "",
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" aria-label="Delete item" disabled={readOnly}>
                            <HugeiconsIcon icon={Delete01Icon} size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This item will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteItem(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Add items dialog */}
      <Dialog open={addingItems} onOpenChange={setAddingItems}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Items</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Paste a JSON array of objects with keys:{" "}
              <code className="font-mono text-foreground">
                {schemaKeys.join(", ")}
              </code>
            </p>
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[{ ${schemaKeys.map((k) => `"${k}": "..."`).join(", ")} }]`}
              rows={8}
              className="font-mono text-xs"
            />
            {addError && (
              <p className="text-xs text-destructive">{addError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingItems(false);
                  setJsonInput("");
                  setAddError(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={onAddItems}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
