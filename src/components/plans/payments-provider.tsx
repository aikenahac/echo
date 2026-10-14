"use client";

import { createContext, useContext } from "react";

const ComingSoonContext = createContext(false);

/** Tells client components whether payments are still "coming soon". */
export function PaymentsProvider({
  comingSoon,
  children,
}: {
  comingSoon: boolean;
  children: React.ReactNode;
}) {
  return (
    <ComingSoonContext.Provider value={comingSoon}>
      {children}
    </ComingSoonContext.Provider>
  );
}

export function usePaymentsComingSoon() {
  return useContext(ComingSoonContext);
}
