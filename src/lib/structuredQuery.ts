// Sea Query's generated contract describes structured arrays, while its HTTP parameters are JSON strings.
export function serializeStructuredQuery(
  params: Record<string, unknown>,
): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined)
      query.set(
        name,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
  }
  return query.toString();
}
