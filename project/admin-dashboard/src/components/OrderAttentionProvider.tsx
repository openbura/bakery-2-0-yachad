import type { ReactNode } from 'react';
import { OrderAttentionContext, useOrderAttentionData } from '../hooks/useOrderAttention';
export function OrderAttentionProvider({ children }: { children: ReactNode }) {
  const value = useOrderAttentionData();
  return <OrderAttentionContext.Provider value={value}>{children}</OrderAttentionContext.Provider>;
}
