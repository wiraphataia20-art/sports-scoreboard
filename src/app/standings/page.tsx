"use client";

import { useEffect, useState, useMemo } from "react";
import { getTournaments, subscribeStandings, subscribeTeams, getTournamentTopStats, buildLogoMap } from "@/lib/firestore";
import type { PlayerStat } from "@/lib/firestore";
import type { Tournament, Standing, Team } from "@/types";
import StandingsTable from "@/components/StandingsTable";

const SPORT_LABEL: Record<string, string> = {
  football: "ฟุตบอล",
  futsal: "ฟุตซอล",
  basketball: "บาสเกตบอล",
  volleyball: "วอลเลย์บอล",
};

const getEventKey = (t: Tournament) => t.eventName || `${t.name}__${t.year}`;

export default function StandingsPage() {
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<string>("");
  const [selectedSubId, setSelectedSubId] = useState<string>("");
  const [standings, setStandings] = useState<Standing[]>([]);

  useEffect(() => { document.title = "Standings | Uni Sports Scoreboard"; }, []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [topStats, setTopStats] = useState<{
    topScorers: PlayerStat[];
    topYellows: PlayerStat[];
    topReds: PlayerStat[];
  } | null>(null);

  useEffect(() => {
    getTournaments().then((data) => {
      setAllTournaments(data);
      if (data[0]) setSelectedEventKey(data[0].eventName || `${data[0].name}__${data[0].year}`);
    });
  }, []);

  const eventList = useMemo(() => {
    const seen = new Set<string>();
    const result: { key: string; label: string }[] = [];
    for (const t of allTournaments) {
      const key = getEventKey(t);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ key, label: `${t.name} (${t.year})` });
      }
    }
    return result;
  }, [allTournaments]);

  const subOptions = useMemo(() =>
    allTournaments
      .filter((t) => getEventKey(t) === selectedEventKey)
      .map((t) => ({
        id: t.id,
        label: `${SPORT_LABEL[t.sport] ?? t.sport}${t.gender ? ` (${t.gender})` : ""}`,
      })),
  [selectedEventKey, allTournaments]);

  useEffect(() => {
    setSelectedSubId(subOptions[0]?.id ?? "");
  }, [selectedEventKey]);

  const selectedTournamentId = subOptions.length === 1 ? subOptions[0].id : selectedSubId;

  useEffect(() => {
    if (!selectedTournamentId) { setStandings([]); setTeams([]); setTopStats(null); return; }
    const u1 = subscribeStandings(selectedTournamentId, setStandings);
    const u2 = subscribeTeams(selectedTournamentId, setTeams);
    return () => { u1(); u2(); };
  }, [selectedTournamentId]);

  const logoMap = useMemo(() => buildLogoMap(teams), [teams]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    getTournamentTopStats(selectedTournamentId).then(setTopStats);
  }, [selectedTournamentId, standings]);

  const grouped = standings.reduce<Record<string, Standing[]>>((acc, s) => {
    const g = s.group || "ทั่วไป";
    acc[g] = acc[g] ? [...acc[g], s] : [s];
    return acc;
  }, {});

  const selectedTournament = allTournaments.find((t) => t.id === selectedTournamentId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ตาราง Standings</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">รายการแข่ง</label>
          <select value={selectedEventKey} onChange={(e) => setSelectedEventKey(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 min-w-52">
            {eventList.length === 0 && <option value="">-- ไม่มีรายการ --</option>}
            {eventList.map((ev) => (
              <option key={ev.key} value={ev.key}>{ev.label}</option>
            ))}
          </select>
        </div>

        {subOptions.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">ชนิดกีฬา</label>
            <select value={selectedSubId} onChange={(e) => setSelectedSubId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
              {subOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

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
                <StandingsTable standings={groupStandings} logoMap={logoMap} />
              </div>
            </div>
          ))
      )}

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
