"use client";

import { useEffect, useState } from "react";
import { getTournaments, subscribeMatches } from "@/lib/firestore";
import type { Tournament, Match, SportType } from "@/types";
import MatchCard from "@/components/MatchCard";

const SPORTS: { value: SportType | "all"; label: string }[] = [
  { value: "all", label: "ทุกกีฬา" },
  { value: "football", label: "ฟุตบอล" },
  { value: "futsal", label: "ฟุตซอล" },
  { value: "basketball", label: "บาสเกตบอล" },
  { value: "volleyball", label: "วอลเลย์บอล" },
];

export default function HomePage() {
  const [selectedSport, setSelectedSport] = useState<SportType | "all">("all");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTournaments(selectedSport === "all" ? undefined : selectedSport).then(
      (data) => {
        setTournaments(data);
        setSelectedTournamentId(data[0]?.id ?? "");
        setLoading(false);
      }
    );
  }, [selectedSport]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setMatches([]);
      return;
    }
    const unsub = subscribeMatches(selectedTournamentId, setMatches);
    return () => unsub();
  }, [selectedTournamentId]);

  const liveMatches = matches.filter((m) => m.status === "live");
  const otherMatches = matches.filter((m) => m.status !== "live");
  const matchesByDate = otherMatches.reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.date] = acc[m.date] ? [...acc[m.date], m] : [m];
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ตารางการแข่งขัน</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">ชนิดกีฬา</label>
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value as SportType | "all")}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">รายการแข่ง</label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 min-w-52"
          >
            {tournaments.length === 0 && (
              <option value="">-- ไม่มีรายการ --</option>
            )}
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">กำลังโหลด...</p>
      ) : !selectedTournamentId ? (
        <p className="text-gray-500">ยังไม่มีรายการแข่งขัน</p>
      ) : matches.length === 0 ? (
        <p className="text-gray-500">ยังไม่มีแมตช์ในรายการนี้</p>
      ) : (
        <>
          {liveMatches.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                กำลังแข่ง
              </h2>
              <div className="flex flex-col gap-3">
                {liveMatches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}
          {Object.entries(matchesByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayMatches]) => (
              <div key={date} className="mb-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-3">
                  วันที่ {date}
                </h2>
                <div className="flex flex-col gap-3">
                  {dayMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
