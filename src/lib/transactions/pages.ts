/** Read until an empty page, advancing by received rows even if the API caps pages. */
export async function readAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + 249);
    if (error) throw new Error(`Unable to load complete financial records: ${error.message}`);
    if (!data?.length) return rows;
    rows.push(...data);
  }
}