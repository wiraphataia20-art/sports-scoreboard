"use client";

import { useEffect, useState } from "react";
import { getTournaments, subscribeStandings, getTournamentTopStats } from "@/lib/firestore";
import type { PlayerStat } from "@/lib/firestore";
import type { Tournament, Standing } from "@/types";
import StandingsTable from "@/components/StandingsTable";

export default function StandingsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [topStats, setTopStats] = useState<{
    topScorers: PlayerStat[];
    topYellows: PlayerStat[];
    topReds: PlayerStat[];
  } | null>(null);

  useEffect(() => {
    getTournaments().then((data) => {
      setTournaments(data);
      setSelectedTournamentId(data[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) { setStandings([]); setTopStats(null); return; }
    const unsub = subscribeStandings(selectedTournamentId, setStandings);
    return () => unsub();
  }, [selectedTournamentId]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    getTournamentTopStats(selectedTournamentId).then(setTopStats);
  }, [selectedTournamentId, standings]);

  // Group standings by group field
  const grouped = standings.reduce<Record<string, Standing[]>>((acc, s) => {
    const g = s.group || "ทั่วไป";
    acc[g] = acc[g] ? [...acc[g], s] : [s];
    return acc;
  }, {});

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ตาราง Standings</h1>

      <div className="flex flex-col gap-1 mb-6 max-w-xs">
        <label className="text-xs text-gray-400">รายการแข่ง</label>
        <select value={selectedTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
          {tournaments.length === 0 && <option value="">-- ไม่มีรายการ --</option>}
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.year})</option>
          ))}
        </select>
      </div>

      {/* Scoring rules info */}
      {selectedTournament && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: "ชนะ", val: selectedTournament.winPoints },
            { label: "เสมอ", val: selectedTournament.drawPoints },
            { label: "แพ้", val: selectedTournament.lossPoints },
            { label: "ชนะ PEN", val: selectedTournament.penaltyWinPoints },
            { label: "แพ้ PEN", val: selectedTournament.penaltyLossPoints },
          ].map(({ label, val }) => (
            <span key={label} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 rounded">
              {label}: <span className="text-white font-bold">{val} แต้ม</span>
            </span>
          ))}
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500">ยังไม่มีข้อมูล Standings</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([group, groupStandings]) => (
            <div key={group} className="mb-6">
              <h2 className="text-lg font-semibold text-gray-300 mb-3">
                {group === "ทั่วไป" ? "ตารางคะแนน" : `สาย ${group}`}
              </h2>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <StandingsTable standings={groupStandings} />
              </div>
            </div>
          ))
      )}

      {/* Top Stats Leaderboard */}
      {topStats && (topStats.topScorers.length > 0 || topStats.topYellows.length > 0 || topStats.topReds.length > 0) && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-gray-300 mb-3">สถิติผู้เล่น</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Top Scorers", data: topStats.topScorers, unit: "Goals", color: "text-blue-400" },
              { title: "Yellow Cards", data: topStats.topYellows, unit: "Cards", color: "text-yellow-400" },
              { title: "Red Cards", data: topStats.topReds, unit: "Cards", color: "text-red-400" },
            ].map(({ title, data, unit, color }) =>
              data.length > 0 ? (
                <div key={title} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <h3 className={`font-semibold mb-3 ${color}`}>{title}</h3>
                  <div className="flex flex-col gap-2">
                    {data.map((p, i) => (
                      <div key={`${i}-${p.player}-${p.team}`} className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-5 text-center ${i === 0 ? "text-yellow-400" : "text-gray-500"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}{p.player}
                          </p>
                          <p className="text-gray-500 text-xs truncate">{p.team}</p>
                        </div>
                        <span className={`text-sm font-bold ${color}`}>{p.count} {unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
