"use client";

import { useEffect, useState, useMemo } from "react";
import { getTournaments, subscribeMatches, subscribeTeams, buildLogoMap } from "@/lib/firestore";
import type { Tournament, Match, Team } from "@/types";
import MatchCard from "@/components/MatchCard";
import { useTournament } from "@/providers/TournamentProvider";

const SPORT_LABEL: Record<string, string> = {
  football: "ฟุตบอล",
  futsal: "ฟุตซอล",
  basketball: "บาสเกตบอล",
  volleyball: "วอลเลย์บอล",
};

export default function HomePage() {
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const { selectedEventKey, setSelectedEventKey, selectedSubId, setSelectedSubId } = useTournament();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Schedule | Uni Sports Scoreboard"; }, []);

  useEffect(() => {
    getTournaments().then((data) => {
      setAllTournaments(data);
      setLoading(false);
      if (data.length > 0 && !selectedEventKey) {
        setSelectedEventKey(data[0].eventName || `${data[0].name}__${data[0].year}`);
      }
    });
  }, []);

  const getEventKey = (t: Tournament) => t.eventName || `${t.name}__${t.year}`;

  // unique event list
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

  // sub-options (id + label) for selected event
  const subOptions = useMemo(() =>
    allTournaments
      .filter((t) => getEventKey(t) === selectedEventKey)
      .map((t) => ({
        id: t.id,
        label: `${SPORT_LABEL[t.sport] ?? t.sport}${t.gender ? ` (${t.gender})` : ""}`,
      })),
  [selectedEventKey, allTournaments]);

  useEffect(() => {
    if (subOptions.length === 0) return;
    if (!subOptions.some((o) => o.id === selectedSubId)) {
      setSelectedSubId(subOptions[0].id);
    }
  }, [subOptions]);

  // resolve tournament id
  const activeTournamentId = subOptions.length === 1 ? subOptions[0].id : selectedSubId;

  useEffect(() => {
    if (!activeTournamentId) { setMatches([]); setTeams([]); return; }
    const u1 = subscribeMatches(activeTournamentId, setMatches);
    const u2 = subscribeTeams(activeTournamentId, setTeams);
    return () => { u1(); u2(); };
  }, [activeTournamentId]);

  const logoMap = useMemo(() => buildLogoMap(teams), [teams]);

  const liveMatches = matches.filter((m) => m.status === "live");
  const postponedMatches = matches.filter(
    (m) => m.status === "upcoming" && m.scheduleStatus === "postponed"
  );
  const otherMatches = matches.filter(
    (m) => m.status !== "live" && !(m.status === "upcoming" && m.scheduleStatus === "postponed")
  );
  const matchesByDate = otherMatches.reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.date] = acc[m.date] ? [...acc[m.date], m] : [m];
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ตารางการแข่งขัน</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">รายการแข่ง</label>
          <select
            value={selectedEventKey}
            onChange={(e) => setSelectedEventKey(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 min-w-52"
          >
            {eventList.length === 0 && <option value="">-- ไม่มีรายการ --</option>}
            {eventList.map((ev) => (
              <option key={ev.key} value={ev.key}>{ev.label}</option>
            ))}
          </select>
        </div>

        {subOptions.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">ชนิดกีฬา</label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              {subOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">กำลังโหลด...</p>
      ) : !activeTournamentId ? (
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
                  <MatchCard key={m.id} match={m} logoMap={logoMap} />
                ))}
              </div>
            </div>
          )}
          {postponedMatches.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                เลื่อนการแข่งขัน
              </h2>
              <div className="flex flex-col gap-3">
                {postponedMatches.map((m) => (
                  <MatchCard key={m.id} match={m} logoMap={logoMap} />
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
                    <MatchCard key={m.id} match={m} logoMap={logoMap} />
                  ))}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
