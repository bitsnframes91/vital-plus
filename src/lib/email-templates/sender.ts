// Single source of truth for how app emails identify themselves.
// Change these here — every send path (auth emails, transactional emails,
// previews) reads them, so the sender cannot drift between screens.

/** Display name recipients see in the From: header. */
export const SITE_NAME = "FairvitalGO"

/**
 * The verified sender subdomain FQDN. It MUST match the subdomain delegated
 * to Lovable's nameservers. NEVER use the root domain here — it breaks SPF/DKIM.
 */
export const SENDER_DOMAIN = "notify.fairvitalgo.de"

/** Root domain used for links inside emails. */
export const ROOT_DOMAIN = "fairvitalgo.de"

/**
 * Domain shown in the visible From: header. Cosmetic only — actual delivery
 * still goes through SENDER_DOMAIN.
 */
export const FROM_DOMAIN = "fairvitalgo.de"

/** The visible reply-to address of every app email. */
export const FROM_ADDRESS = `noreply@${FROM_DOMAIN}`
