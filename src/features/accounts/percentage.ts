export function supplyPercentage(balance: bigint, supply: bigint): string {
  if (supply <= 0n || balance < 0n) return "Unavailable";
  if (balance === 0n) return "0%";
  // Four decimal places in percent, with integer arithmetic throughout.
  const units = (balance * 1_000_000n + supply / 2n) / supply;
  if (units === 0n) return "<0.0001%";
  const whole = units / 10_000n;
  const fraction = (units % 10_000n)
    .toString()
    .padStart(4, "0")
    .replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}%`;
}
