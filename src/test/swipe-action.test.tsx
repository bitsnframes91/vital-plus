import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SWIPE_COMPLETE_AT, SwipeAction } from "@/components/SwipeAction";
import { setLanguage } from "@/lib/language";

const haptic = vi.hoisted(() => vi.fn());
vi.mock("@/lib/haptics", () => ({ completionHaptic: haptic }));

// jsdom has no PointerEvent, so fireEvent.pointer* would drop clientX.
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
const TRACK_WIDTH = 364; // travel = 364 - 64 = 300 px, completion at 240 px
const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
beforeAll(() => {
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) { return this.classList.contains("swipe-track") ? TRACK_WIDTH : 0; },
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
  if (widthDescriptor) Object.defineProperty(HTMLElement.prototype, "clientWidth", widthDescriptor);
});
afterEach(() => { haptic.mockClear(); setLanguage("de"); });

const thumb = () => screen.getByTestId("swipe-thumb");
const track = () => thumb().parentElement as HTMLElement;
function drag(to: number) {
  fireEvent.pointerDown(thumb(), { clientX: 0, pointerId: 1 });
  fireEvent.pointerMove(thumb(), { clientX: to, pointerId: 1 });
}
const release = () => fireEvent.pointerUp(thumb(), { pointerId: 1 });

describe("SwipeAction", () => {
  it("completes once the thumb passes the threshold", async () => {
    const onComplete = vi.fn();
    render(<SwipeAction label="Anmelden" onComplete={onComplete} />);
    drag(300 * SWIPE_COMPLETE_AT);
    expect(track()).toHaveAttribute("data-state", "dragging");
    expect(haptic).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it("follows the pointer and animates back when released too early", () => {
    const onComplete = vi.fn();
    render(<SwipeAction label="Anmelden" onComplete={onComplete} />);
    drag(200);
    expect(thumb().style.transform).toBe("translateX(200px)");
    expect(screen.getByTestId("swipe-fill").style.width).toBe("258px");
    release();
    expect(onComplete).not.toHaveBeenCalled();
    expect(haptic).not.toHaveBeenCalled();
    // Leaving the "dragging" state re-enables the CSS transition back to the start.
    expect(track()).toHaveAttribute("data-state", "idle");
    expect(thumb().style.transform).toBe("translateX(0px)");
  });

  it("clamps the thumb to the track", () => {
    render(<SwipeAction label="Anmelden" onComplete={vi.fn()} />);
    drag(900);
    expect(thumb().style.transform).toBe("translateX(300px)");
  });

  it("offers a labelled native button for keyboard and VoiceOver activation", async () => {
    const onComplete = vi.fn();
    render(<SwipeAction label="Anmelden" onComplete={onComplete} />);
    const button = screen.getByRole("button", { name: "Anmelden" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).not.toHaveAttribute("tabindex", "-1");
    expect(thumb()).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(button);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it("ignores repeated activation while the action is running", async () => {
    const onComplete = vi.fn(() => new Promise<void>(() => {}));
    render(<SwipeAction label="Anmelden" onComplete={onComplete} />);
    const button = screen.getByRole("button", { name: "Anmelden" });
    fireEvent.click(button);
    fireEvent.click(button);
    drag(300);
    release();
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Geschafft")).toBeInTheDocument();
  });

  it("cannot be swiped or activated while busy", () => {
    const onComplete = vi.fn();
    render(<SwipeAction label="Anmelden" onComplete={onComplete} busy />);
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeDisabled();
    expect(screen.getByText("Bitte warten…")).toBeInTheDocument();
    drag(300);
    release();
    expect(thumb().style.transform).toBe("translateX(0px)");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("shows the idle hint animation only when motion is allowed", () => {
    const { unmount } = render(<SwipeAction label="Anmelden" onComplete={vi.fn()} />);
    expect(track()).toHaveAttribute("data-hint");
    expect(track()).toHaveAttribute("data-motion", "full");
    unmount();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
    try {
      render(<SwipeAction label="Anmelden" onComplete={vi.fn()} />);
      expect(track()).toHaveAttribute("data-motion", "reduced");
      expect(track()).not.toHaveAttribute("data-hint");
      // The written direction hint stays; only the movement is removed.
      expect(screen.getByText("Nach rechts wischen")).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("submits its form only when the form is valid", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><input aria-label="E-Mail" type="email" required /><SwipeAction type="submit" label="Konto anlegen" /></form>);
    drag(300);
    release();
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(thumb().style.transform).toBe("translateX(0px)");
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "person@example.com" } });
    drag(300);
    release();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("localizes the label and the swipe hint", () => {
    setLanguage("en");
    render(<SwipeAction label="Anmelden" onComplete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Swipe right")).toBeInTheDocument();
  });
});
