import { describe, test, expect, mock, beforeEach } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TriggerWithPayloadDialog } from "../trigger-with-payload-dialog";

const onTrigger = mock(() => Promise.resolve());

beforeEach(() => {
  onTrigger.mockClear();
});

async function renderOpen() {
  const user = userEvent.setup();
  render(<TriggerWithPayloadDialog onTrigger={onTrigger} />);
  await user.click(
    screen.getByRole("button", { name: /trigger with payload/i }),
  );
  return user;
}

// 3.1
describe("initial state", () => {
  test("renders with {} pre-filled and submit button enabled", async () => {
    await renderOpen();

    expect(screen.getByRole("textbox")).toHaveValue("{}");
    expect(screen.getByRole("button", { name: "Trigger" })).toBeEnabled();
  });
});

// 3.2
describe("JSON validation", () => {
  test("invalid JSON disables submit button and shows error", async () => {
    const user = await renderOpen();

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "{{} bad json }");

    expect(screen.getByRole("button", { name: "Trigger" })).toBeDisabled();
    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });
});

// 3.3
describe("API call", () => {
  test("valid JSON calls onTrigger with parsed payload", async () => {
    const user = await renderOpen();

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), '{{"prompt":"hello"}');
    await user.click(screen.getByRole("button", { name: "Trigger" }));

    await waitFor(() => {
      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    expect(onTrigger).toHaveBeenCalledWith({ prompt: "hello" });
  });
});

// 3.4
describe("success flow", () => {
  test("dialog closes after successful trigger", async () => {
    const user = await renderOpen();
    await user.click(screen.getByRole("button", { name: "Trigger" }));

    await waitFor(() => {
      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// 3.5
describe("cancel", () => {
  test("Cancel button closes dialog without calling onTrigger", async () => {
    const user = await renderOpen();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(onTrigger).not.toHaveBeenCalled();
  });
});
