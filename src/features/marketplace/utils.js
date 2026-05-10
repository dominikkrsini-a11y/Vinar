export function formatMarketplaceDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getCategoryIcon(key) {
  if (key === 'grapes') return '🍇';
  if (key === 'bulk_wine') return '🍷';
  if (key === 'equipment') return '⚙️';
  if (key === 'chemicals') return '🧪';
  return '📦';
}

