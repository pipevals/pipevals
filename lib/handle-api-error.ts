import { toast } from "sonner";

export async function handleApiError(error: unknown): Promise<void> {
  let message = "Something went wrong";

  if (error instanceof Response) {
    try {
      const data = await error.json();
      if (typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // response body not parseable — use fallback
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  toast.error(message);
}
