export type AssetDetailSearch = { tab: "overview" | "holders"; page: number };
export const defaultAssetDetailSearch: AssetDetailSearch = {
  tab: "overview",
  page: 1,
};
export function validateAssetDetailSearch(
  value: Record<string, unknown>,
): AssetDetailSearch {
  const page = Number(value.page);
  return {
    tab: value.tab === "holders" ? "holders" : "overview",
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1,
  };
}
export function assetDescription(value: string): string {
  // Descriptions may be plain text or the wallet's JSON metadata. Never render HTML.
  try {
    const metadata: unknown = JSON.parse(value);
    if (
      metadata &&
      typeof metadata === "object" &&
      "main" in metadata &&
      typeof metadata.main === "string"
    )
      return metadata.main;
  } catch {
    /* Plain descriptions are valid. */
  }
  return value;
}
const flags = [
  [0x01, "Charge market fee"],
  [0x02, "Require whitelist"],
  [0x04, "Override authority"],
  [0x08, "Transfer restricted"],
  [0x10, "Disable force settlement"],
  [0x20, "Global settlement"],
  [0x40, "Disable confidential transfers"],
  [0x80, "Witness-fed asset"],
  [0x100, "Committee-fed asset"],
  [0x200, "Lock maximum supply"],
  [0x400, "Disable new supply"],
  [0x800, "Disable maintenance collateral ratio updates"],
  [0x1000, "Disable initial collateral ratio updates"],
  [0x2000, "Disable maximum short squeeze ratio updates"],
  [0x4000, "Disable black swan response updates"],
  [0x8000, "Disable collateral bidding"],
] as const;
export function assetFlags(mask: number): string[] {
  const enabled = flags
    .filter(([flag]) => (mask & flag) !== 0)
    .map(([, label]) => String(label));
  const unknown = mask & ~0xffff;
  if (unknown) enabled.push(`Other flags: 0x${unknown.toString(16)}`);
  return enabled;
}
