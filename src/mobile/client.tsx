import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

import "./native.css";
import { startNativeShell } from "./native-shell";

// Client entry for the Capacitor bundle: TanStack Start's default hydration plus native setup.
startNativeShell();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
