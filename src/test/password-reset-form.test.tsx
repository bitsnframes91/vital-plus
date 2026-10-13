import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PasswordResetForm } from "../components/PasswordResetForm";

const calls: unknown[] = [];
let fail = false;
vi.mock("@/lib/account.functions", () => ({
  requestPasswordReset: (arg: unknown) => { calls.push(arg); return fail ? Promise.reject(new Error("Rate limited")) : Promise.resolve({ ok: true }); },
}));
it("requests a reset link through the confirmed-account check with the reset destination", async () => {
  render(<PasswordResetForm />);
  fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "person@example.com" } });
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(calls).toContainEqual({ data: { email: "person@example.com", redirectTo: `${window.location.origin}/reset-password` } }));
});
it("allows retrying when sending fails", async () => {
  fail = true;
  render(<PasswordResetForm initialEmail="person@example.com" />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("alert");
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
});
