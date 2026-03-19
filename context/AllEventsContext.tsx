// context/AllEventsContext.tsx
import React, { createContext, useContext } from 'react';

const AllEventsContext = createContext<any[]>([]);

export const AllEventsProvider = ({ events, children }: { events: any[]; children: React.ReactNode }) => (
  <AllEventsContext.Provider value={events}>{children}</AllEventsContext.Provider>
);

export const useAllEvents = () => useContext(AllEventsContext);