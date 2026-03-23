import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { StatusDot } from "../run-status";

describe("StatusDot", () => {
  const cases = [
    { status: "pending", label: "Pending" },
    { status: "running", label: "Running" },
    { status: "awaiting_review", label: "Awaiting review" },
    { status: "completed", label: "Completed" },
    { status: "failed", label: "Failed" },
    { status: "cancelled", label: "Cancelled" },
  ] as const;

  for (const { status, label } of cases) {
    test(`renders ${status} as ${label}`, () => {
      render(<StatusDot status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  }

  test("falls back to pending for unknown statuses", () => {
    render(<StatusDot status="unknown_status" />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
