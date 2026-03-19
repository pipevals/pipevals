import { describe, test, expect, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelCombobox } from "../model-combobox";
import type { GatewayModel } from "@/lib/pipeline/types";

// cmdk uses ResizeObserver and scrollIntoView internally; JSDOM doesn't provide them.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const models: GatewayModel[] = [
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "anthropic" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
];

describe("ModelCombobox", () => {
  test("renders trigger button with current value", () => {
    const onValueChange = mock(() => {});
    render(
      <ModelCombobox models={models} value="openai/gpt-4o" onValueChange={onValueChange} />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("openai/gpt-4o");
  });

  test("shows placeholder when no value selected", () => {
    const onValueChange = mock(() => {});
    render(<ModelCombobox models={models} value="" onValueChange={onValueChange} />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Select model…");
  });

  test("opens popover and shows grouped models", async () => {
    const user = userEvent.setup();
    const onValueChange = mock(() => {});
    render(<ModelCombobox models={models} value="" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Anthropic")).toBeInTheDocument();
      expect(screen.getByText("Openai")).toBeInTheDocument();
      expect(screen.getByText("Google")).toBeInTheDocument();
    });
  });

  test("selecting a model calls onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = mock(() => {});
    render(<ModelCombobox models={models} value="" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByText("openai/gpt-4o")).toBeInTheDocument();
    });
    await user.click(screen.getByText("openai/gpt-4o"));

    expect(onValueChange).toHaveBeenCalledWith("openai/gpt-4o");
  });

  test("degrades to text input when models array is empty", () => {
    const onValueChange = mock(() => {});
    render(<ModelCombobox models={[]} value="" onValueChange={onValueChange} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("openai/gpt-4o")).toBeInTheDocument();
    expect(screen.getByText(/could not load models/i)).toBeInTheDocument();
  });

  test("text input fallback calls onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = mock(() => {});
    render(<ModelCombobox models={[]} value="" onValueChange={onValueChange} />);

    await user.type(screen.getByPlaceholderText("openai/gpt-4o"), "custom/model");

    expect(onValueChange).toHaveBeenCalled();
  });

  test("shows hint when provided", () => {
    const onValueChange = mock(() => {});
    render(
      <ModelCombobox
        models={models}
        value=""
        onValueChange={onValueChange}
        hint="Add AI_GATEWAY_API_KEY for account-specific availability."
      />,
    );

    expect(screen.getByText(/add AI_GATEWAY_API_KEY/i)).toBeInTheDocument();
  });
});
