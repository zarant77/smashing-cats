export function getMatchCode(params: URLSearchParams): string | undefined {
  const matchCode = params.get("match")?.trim();

  return matchCode === "" ? undefined : matchCode;
}
