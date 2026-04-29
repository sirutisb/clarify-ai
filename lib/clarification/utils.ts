export function stripClarifyingPrefix(raw: string): string {
  return raw.replace(/^\s*(Follow-Up Question|Clarification Question)\s*:\s*/i, "").trim();
}
