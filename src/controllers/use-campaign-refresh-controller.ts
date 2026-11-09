'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function useCampaignRefreshController() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function handleRefresh() { startTransition(() => router.refresh()); }
  return { model: { isPending }, actions: { onRefresh: handleRefresh } };
}
