'use client';
import { useState } from 'react';
import { QueryClientProvider, Hydrate, QueryClient } from '@tanstack/react-query';
import SettingProvider from '@/Helper/SettingContext/SettingProvider';
import AccountProvider from '@/Helper/AccountContext/AccountProvider';
import BadgeProvider from '@/Helper/BadgeContext/BadgeProvider';
import CategoryProvider from '@/Helper/CategoryContext/CategoryProvider';
import CartProvider from '@/Helper/CartContext/CartProvider';

const TanstackWrapper = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes — prevents redundant refetches on navigation
        cacheTime: 10 * 60 * 1000, // 10 minutes — keeps data in cache after component unmounts
        retry: 1,                  // retry once instead of default 3
        refetchOnWindowFocus: false, // don't refetch when switching browser tabs
      },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={children.dehydratedState}>
        <SettingProvider>
          <AccountProvider>
            <BadgeProvider>
              <CategoryProvider>
                <CartProvider>{children}</CartProvider>
              </CategoryProvider>
            </BadgeProvider>
          </AccountProvider>
        </SettingProvider>
      </Hydrate>
    </QueryClientProvider>
  );
};

export default TanstackWrapper;
