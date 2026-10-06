import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PasswordResetForm } from "../components/PasswordResetForm";

const reset = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { resetPasswordForEmail: reset } } }));
beforeEach(() => reset.mockReset());
it("requests a reset link for the entered email with the password reset destination", async () => {
  reset.mockResolvedValue({ error: null });
  render(<PasswordResetForm />);
  fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "person@example.com" } });
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(reset).toHaveBeenCalledWith("person@example.com", { redirectTo: `${window.location.origin}/reset-password` }));
});
it("allows retrying when sending fails", async () => {
  reset.mockResolvedValue({ error: { message: "Rate limited" } });
  render(<PasswordResetForm initialEmail="person@example.com" />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("alert");
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
});