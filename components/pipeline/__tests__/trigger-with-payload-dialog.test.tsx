import { describe, test, expect, mock, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { TriggerWithPayloadDialog } from "../trigger-with-payload-dialog";

const onSuccess = mock(() => {});

beforeEach(() => {
  onSuccess.mockClear();
  // @ts-expect-error — mock fetch
  globalThis.fetch = mock(() => {});
});

function renderOpen() {
  // Render and click the trigger to open the dialog
  render(
    <TriggerWithPayloadDialog pipelineId="p1" onSuccess={onSuccess} />,
  );
  fireEvent.click(screen.getByText("Trigger with payload…"));
}

// 3.1
describe("initial state", () => {
  test("renders with {} pre-filled and submit button enabled", () => {
    renderOpen();

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("{}");

    const triggerBtn = screen.getByRole("button", { name: "Trigger" });
    expect(triggerBtn).toBeEnabled();
  });
});

// 3.2
describe("JSON validation", () => {
  test("invalid JSON disables submit button and shows error", () => {
    renderOpen();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "{ bad json }" } });

    expect(
      screen.getByRole("button", { name: "Trigger" }),
    ).toBeDisabled();
    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });
});

// 3.3
describe("API call", () => {
  test("valid JSON triggers correct API call with merged payload", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ runId: "r1" }), { status: 202 }),
      ),
    );
    // @ts-expect-error — mock fetch
    globalThis.fetch = fetchMock;

    renderOpen();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: { value: '{"prompt":"hello"}' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/pipelines/p1/runs");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      prompt: "hello",
      source: "ui",
    });
  });
});

// 3.4
describe("success flow", () => {
  test("dialog closes and onSuccess fires after successful response", async () => {
    // @ts-expect-error — mock fetch
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ runId: "r1" }), { status: 202 }),
      ),
    );

    renderOpen();
    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByRole("dialog"),
    ).not.toBeInTheDocument();
  });
});

// 3.5
describe("cancel", () => {
  test("Cancel button closes dialog without API call", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response()));
    // @ts-expect-error — mock fetch
    globalThis.fetch = fetchMock;

    renderOpen();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog"),
      ).not.toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
