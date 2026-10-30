import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PRIVACY_AUTO_DISMISS_MS, PrivacyBubble } from "../components/PrivacyBubble";

const trigger = () => screen.getByRole("button", { name: /DSGVO/ });
const card = () => screen.queryByRole("dialog");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("opens the privacy card only after the DSGVO bubble is tapped", () => {
  render(<PrivacyBubble />);
  expect(card()).toBeNull();
  fireEvent.click(trigger());
  expect(card()).not.toBeNull();
});

it("closes the card automatically after two seconds", () => {
  expect(PRIVACY_AUTO_DISMISS_MS).toBe(2000);
  render(<PrivacyBubble />);
  fireEvent.click(trigger());
  act(() => vi.advanceTimersByTime(PRIVACY_AUTO_DISMISS_MS - 1));
  expect(card()).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(card()).toBeNull();
});

it("closes the card immediately when the cross is clicked", () => {
  render(<PrivacyBubble />);
  fireEvent.click(trigger());
  fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
  expect(card()).toBeNull();
});

it("can be reopened after the automatic dismissal", () => {
  render(<PrivacyBubble />);
  fireEvent.click(trigger());
  act(() => vi.advanceTimersByTime(PRIVACY_AUTO_DISMISS_MS));
  expect(card()).toBeNull();
  fireEvent.click(trigger());
  expect(card()).not.toBeNull();
});
