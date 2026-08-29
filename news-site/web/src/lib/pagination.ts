/** Articles per page on paginated listings. */
export const PAGE_SIZE = 10;

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
