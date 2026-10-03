import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Customer accounts are owned by the Fairvital Shopware shop (Store API).
// Needs secrets SHOPWARE_URL (e.g. https://www.fairvital.com) and SHOPWARE_ACCESS_KEY (sales channel access key).

type Result =
  | { ok: true; contextToken: string; email: string; firstName: string; lastName: string }
  | { ok: false; error: string; pendingConfirmation?: boolean };

function cfg() {
  const url = process.env["SHOPWARE_URL"]?.replace(/\/$/, "");
  const key = process.env["SHOPWARE_ACCESS_KEY"];
  return url && key ? { url, key } : null;
}

async function sw(c: { url: string; key: string }, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${c.url}/store-api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "sw-access-key": c.key,
      "content-type": "application/json",
      accept: "application/json",
      ...(token ? { "sw-context-token": token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  return { res, json, token: res.headers.get("sw-context-token") ?? json.contextToken ?? token };
}

async function loadCustomer(c: { url: string; key: string }, token: string): Promise<Result> {
  const { res, json } = await sw(c, "/account/customer", {}, token);
  if (!res.ok) return { ok: false, error: "Kundendaten konnten nicht geladen werden." };
  return { ok: true, contextToken: token, email: json.email, firstName: json.firstName, lastName: json.lastName };
}

const NOT_CONFIGURED: Result = { ok: false, error: "Die Shop-Verbindung ist noch nicht eingerichtet." };

export const shopLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email().max(255), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const c = cfg();
    if (!c) return NOT_CONFIGURED;
    const { res, token } = await sw(c, "/account/login", { username: data.email, password: data.password });
    if (!res.ok || !token) return { ok: false, error: "E-Mail oder Passwort ist falsch." };
    return loadCustomer(c, token);
  });

export const shopRegister = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(255),
      password: z.string().min(8).max(200),
      street: z.string().trim().min(1).max(200),
      zipcode: z.string().trim().min(3).max(12),
      city: z.string().trim().min(1).max(100),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<Result> => {
    const c = cfg();
    if (!c) return NOT_CONFIGURED;
    const [sal, countries] = await Promise.all([sw(c, "/salutation", {}), sw(c, "/country", { limit: 100 })]);
    const salutations = (sal.json.elements ?? []) as { id: string; salutationKey: string }[];
    const salutationId = (salutations.find((x) => x.salutationKey === "not_specified") ?? salutations[0])?.id;
    const countryList = (countries.json.elements ?? []) as { id: string; iso: string }[];
    const countryId = (countryList.find((x) => x.iso === "DE") ?? countryList[0])?.id;
    if (!salutationId || !countryId) return { ok: false, error: "Shop-Konfiguration unvollständig." };

    const { res, json, token } = await sw(c, "/account/register", {
      salutationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      storefrontUrl: c.url,
      acceptedDataProtection: true,
      billingAddress: { street: data.street, zipcode: data.zipcode, city: data.city, countryId, firstName: data.firstName, lastName: data.lastName, salutationId },
    });
    if (!res.ok) {
      const detail = json.errors?.[0]?.detail as string | undefined;
      return { ok: false, error: detail?.includes("already") ? "Für diese E-Mail gibt es bereits ein Shop-Konto." : "Konto konnte nicht angelegt werden." };
    }
    if (json.doubleOptInRegistration || !token) {
      return { ok: false, pendingConfirmation: true, error: "Bitte bestätige deine E-Mail-Adresse und melde dich dann an." };
    }
    return loadCustomer(c, token);
  });

export const shopLogout = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ contextToken: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const c = cfg();
    if (c) await sw(c, "/account/logout", {}, data.contextToken).catch(() => null);
    return { ok: true };
  });
