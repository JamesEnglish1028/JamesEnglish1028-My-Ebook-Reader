/**
 * Small helpers to manage a pagination page history stack.
 * These mirror the logic used by CatalogView so we can test it in isolation.
 */

export function pushHistory(prevHist: string[], currentUrl: string | null, clickedUrl: string): string[] {
  if (!currentUrl) return prevHist;
  const last = prevHist[prevHist.length - 1];
  if (last && last === clickedUrl) {
    // back navigation: pop
    return prevHist.slice(0, -1);
  }
  // forward navigation: push current
  return [...prevHist, currentUrl];
}

export function synthesizePrev(pagination: { prev?: string | null } | null | undefined, pageHistory: string[]) {
  if (!pagination) return null;
  const prev = pagination.prev || (pageHistory.length > 0 ? pageHistory[pageHistory.length - 1] : undefined);
  return { ...pagination, prev };
}

export function resetHistory() {
  return [] as string[];
}
