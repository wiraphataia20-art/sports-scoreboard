"use client";

import { createContext, useContext, useState } from "react";

interface TournamentContextValue {
  selectedEventKey: string;
  setSelectedEventKey: (key: string) => void;
  selectedSubId: string;
  setSelectedSubId: (id: string) => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [selectedEventKey, setSelectedEventKey] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");

  return (
    <TournamentContext.Provider value={{ selectedEventKey, setSelectedEventKey, selectedSubId, setSelectedSubId }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside TournamentProvider");
  return ctx;
}
