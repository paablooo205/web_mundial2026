export function formatMatchDate(kickoffAt: string | null): string | null {
  if (!kickoffAt) return null;
  try {
    const date = new Date(kickoffAt);
    const dayMonth = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short"
    });
    const time = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${dayMonth} · ${time}`;
  } catch {
    return null;
  }
}
