/**
 * Display-safe fingerprint for an API key.
 *
 * Keys conventionally open with a label naming the issuer and the key kind —
 * `oc` (OpenCode) and `sk` (secret key) joined by `_`, or `sk-`, `sk_live_`,
 * `ghp_`, `github_pat_`, `glpat-` — and everything after that label is random
 * secret material. The label is not secret and tells the user which key they
 * are looking at; three characters of the secret body let the user recognize
 * the key they stored without rendering a useful slice of the secret — which
 * is why the fingerprint is `oc_sk_590...` rather than a prefix of the raw
 * value.
 *
 * The label is detected by shape, not by a closed list of issuers: one to six
 * ASCII letters of a single case, terminated by `_` or `-`, repeated while the
 * segments keep that shape. A value whose opening does not look like such a
 * label gets no fingerprint at all — any fixed slice would then be a slice of
 * the secret itself.
 * @module dsh-tui/utils/keyFingerprint
 */

/** Longest single label segment (`github`, `glpat`, `whsec`, `live`, …). */
const MAX_LEAD_SEGMENT = 6

/** Secret characters required before any of them may be revealed. */
const MIN_SECRET_LENGTH = 8

/** Secret characters a fingerprint reveals. */
const REVEAL = 3

/**
 * Fixed labels that carry no separator. They are structural in exactly the
 * same sense as the separated ones; the scanner cannot tell where the label
 * ends because the next run is mixed case or numeric.
 */
const FIXED_LEADS: readonly string[] = [
  'AIza', // Google API key
  'AKIA', // AWS access key id
  'ASIA', // AWS temporary access key id
  'AKID', // Tencent Cloud secret id
  'LTAI', // Alibaba Cloud access key id
]

/** Whether one separator-free segment can be a structural label. */
function isLabelSegment(segment: string): boolean {
  if (segment.length === 0 || segment.length > MAX_LEAD_SEGMENT) return false
  if (!/^[A-Za-z]+$/u.test(segment)) return false
  // A single case marks a label; mixed case (`AbCd`, base64 randomness) does not.
  return segment === segment.toLowerCase() || segment === segment.toUpperCase()
}

/**
 * The leading label of `value`, including its trailing separator, or `''` when
 * the value opens with secret material (a digit, a mixed-case run, or no
 * separator at all).
 * @param value - Candidate key.
 * @returns The non-secret opening, separators included, or an empty string.
 */
function structuralLead(value: string): string {
  let end = 0
  while (end < value.length) {
    const run = /^[A-Za-z]+/u.exec(value.slice(end))
    if (run === null || !isLabelSegment(run[0])) break
    const separator = value[end + run[0].length]
    if (separator !== '_' && separator !== '-') break
    if (end + run[0].length + 1 >= value.length) break
    end += run[0].length + 1
  }
  return value.slice(0, end)
}

/**
 * Fingerprint a key for display: its structural lead plus the first three
 * characters of the secret body, e.g. `oc_sk_590...`.
 *
 * Returns `undefined` when no structural lead is recognizable, or when the
 * secret body is too short for a three-character preview to be safe.
 * @param value - The key to fingerprint; `undefined` while no key is resolved.
 * @returns The display fingerprint, or `undefined` when it cannot be built.
 */
export function keyFingerprint(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const key = value.trim()
  if (key === '') return undefined
  const fixed = FIXED_LEADS.find(lead => key.startsWith(lead) && key.length > lead.length + MIN_SECRET_LENGTH)
  const lead = fixed ?? structuralLead(key)
  if (lead === '') return undefined
  const secret = key.slice(lead.length)
  if (secret.length < MIN_SECRET_LENGTH) return undefined
  return `${lead}${secret.slice(0, REVEAL)}...`
}
