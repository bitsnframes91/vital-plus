import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MagicCodeEntry, RESEND_SECONDS } from "../components/MagicCodeEntry";
import { setLanguage, translateText } from "@/lib/language";

const resendCalls: string[] = [];
let resendFails = false;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      verifyOtp: async () => ({ error: null }),
      resend: async ({ email }: { email: string }) => {
        resendCalls.push(email);
        return resendFails ? { error: new Error("send failed") } : { data: {}, error: null };
      },
      signInWithOtp: async () => ({ error: null }),
    },
  },
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => () => undefined }));

const resendButton = () => screen.getByRole("button", { name: /Code erneut senden/ });

beforeEach(() => {
  vi.useFakeTimers();
  resendCalls.length = 0;
  resendFails = false;
});

afterEach(() => {
  vi.useRealTimers();
  setLanguage("de");
});

it("lets a new code be requested only after 30 seconds", async () => {
  render(<MagicCodeEntry email="person@example.com" type="signup" />);
  const button = resendButton();
  expect(RESEND_SECONDS).toBe(30);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(resendCalls).toHaveLength(0);

  await act(async () => { vi.advanceTimersByTime(RESEND_SECONDS * 1000); });
  expect(button).toBeEnabled();
  await act(async () => { fireEvent.click(button); });
  expect(resendCalls).toEqual(["person@example.com"]);
  expect(button).toBeDisabled();
});

it("explains when a new code cannot be sent", async () => {
  resendFails = true;
  render(<MagicCodeEntry email="person@example.com" type="signup" />);
  const button = resendButton();
  await act(async () => { vi.advanceTimersByTime(RESEND_SECONDS * 1000); });
  await act(async () => { fireEvent.click(button); });
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

it("translates the countdown into English and Spanish", () => {
  setLanguage("en");
  expect(translateText("Code erneut senden in 12s")).toBe("Resend code in 12s");
  setLanguage("es");
  expect(translateText("Code erneut senden in 12s")).toBe("Reenviar código en 12s");
});
