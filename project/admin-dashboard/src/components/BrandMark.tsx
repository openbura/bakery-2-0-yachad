import { Grains } from '@phosphor-icons/react';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? 'is-compact' : ''}`}>
      <span className="brand-mark__icon" aria-hidden="true"><Grains size={compact ? 20 : 26} weight="duotone" /></span>
      <span className="brand-mark__copy">
        <strong>מאפיית יחד</strong>
        <small>מרכז ניהול</small>
      </span>
    </div>
  );
}
