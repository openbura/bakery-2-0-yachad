import { MagnifyingGlass } from '@phosphor-icons/react';

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="empty-state" role="status">
      <span><MagnifyingGlass size={28} weight="duotone" /></span>
      <h2>לא נמצאו מוצרים מתאימים</h2>
      <p>נסו לשנות את החיפוש או לנקות אחד מהמסננים.</p>
      <button className="button button--secondary" type="button" onClick={onClear}>ניקוי מסננים</button>
    </div>
  );
}
