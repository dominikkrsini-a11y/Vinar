// Join selected reason labels (+ optional free-text note) into the single
// comment field so the feedback schema stays exactly as specified.
export function buildLogbookFeedbackComment(reasonLabels, note) {
  const parts = [];
  for (const label of reasonLabels || []) {
    const s = String(label || '').trim();
    if (s) parts.push(s);
  }
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  if (trimmedNote) parts.push(trimmedNote);
  return parts.length > 0 ? parts.join('; ') : undefined;
}
