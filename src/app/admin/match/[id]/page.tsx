"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeMatch, updateMatch, subscribeEvents, addEvent, deleteEvent, recalculateStandings, recalculateMatchScore } from "@/lib/firestore";
import type { Match, MatchEvent, MatchStatus, EventType, ResultType } from "@/types";
import { useRouter, useParams } from "next/navigation";

const EVENT_BUTTONS: { type: EventType; label: string; icon: string; color: string }[] = [
  { type: "goal", label: "Goal", icon: "⚽", color: "bg-blue-600 hover:bg-blue-700" },
  { type: "penalty_goal", label: "Penalty", icon: "🎯", color: "bg-cyan-600 hover:bg-cyan-700" },
  { type: "own_goal", label: "Own Goal", icon: "🤦", color: "bg-orange-600 hover:bg-orange-700" },
  { type: "yellow_card", label: "Yellow Card", icon: "🟨", color: "bg-yellow-600 hover:bg-yellow-700" },
  { type: "red_card", label: "Red Card", icon: "🟥", color: "bg-red-600 hover:bg-red-700" },
  { type: "substitution", label: "Substitution", icon: "🔄", color: "bg-purple-600 hover:bg-purple-700" },
];

const EVENT_LABEL: Record<string, string> = {
  goal: "⚽ Goal",
  penalty_goal: "🎯 Penalty",
  own_goal: "🤦 Own Goal",
  yellow_card: "🟨 Yellow Card",
  red_card: "🟥 Red Card",
  substitution: "🔄 Substitution",
};

export default function LiveMatchPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [calculating, setCalculating] = useState(false);
  const statsInitialized = useRef(false);

  const [activeType, setActiveType] = useState<EventType>("goal");
  const [activeTeam, setActiveTeam] = useState<"team1" | "team2">("team1");
  const [player, setPlayer] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [playerOut, setPlayerOut] = useState("");
  const [jerseyNumberOut, setJerseyNumberOut] = useState<string>("");
  const [minute, setMinute] = useState<string>("1");
  const [isStaff, setIsStaff] = useState(false);
  const [adding, setAdding] = useState(false);

  const isCardType = activeType === "yellow_card" || activeType === "red_card";

  const [penalty1, setPenalty1] = useState(0);
  const [penalty2, setPenalty2] = useState(0);
  const [resultType, setResultType] = useState<ResultType>("normal");

  const [shots1, setShots1] = useState(0);
  const [shots2, setShots2] = useState(0);
  const [onTarget1, setOnTarget1] = useState(0);
  const [onTarget2, setOnTarget2] = useState(0);
  const [corners1, setCorners1] = useState(0);
  const [corners2, setCorners2] = useState(0);
  const [fouls1, setFouls1] = useState(0);
  const [fouls2, setFouls2] = useState(0);
  const [offsides1, setOffsides1] = useState(0);
  const [offsides2, setOffsides2] = useState(0);
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/admin");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    statsInitialized.current = false;
    return subscribeMatch(id, (m) => {
      if (!m) return;
      setMatch(m);
      if (!statsInitialized.current) {
        statsInitialized.current = true;
        setPenalty1(m.penalty1 ?? 0);
        setPenalty2(m.penalty2 ?? 0);
        setResultType(m.resultType ?? "normal");
        setShots1(m.shots1 ?? 0);
        setShots2(m.shots2 ?? 0);
        setOnTarget1(m.onTarget1 ?? 0);
        setOnTarget2(m.onTarget2 ?? 0);
        setCorners1(m.corners1 ?? 0);
        setCorners2(m.corners2 ?? 0);
        setFouls1(m.fouls1 ?? 0);
        setFouls2(m.fouls2 ?? 0);
        setOffsides1(m.offsides1 ?? 0);
        setOffsides2(m.offsides2 ?? 0);
      }
    });
  }, [id]);

  useEffect(() => {
    const unsub = subscribeEvents(id, setEvents);
    return () => unsub();
  }, [id]);

  async function handleStatusChange(status: MatchStatus) {
    await updateMatch(id, { status });
    setMatch((prev) => prev ? { ...prev, status } : prev);
    if (match && status === "live") {
      recalculateStandings(match.tournamentId);
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!match || !player.trim()) return;
    setAdding(true);
    await addEvent(id, {
      matchId: id,
      type: activeType,
      team: activeTeam,
      player: player.trim(),
      ...(jerseyNumber && !isStaff ? { jerseyNumber: Number(jerseyNumber) } : {}),
      ...(activeType === "substitution" && playerOut.trim() ? { playerOut: playerOut.trim() } : {}),
      ...(activeType === "substitution" && jerseyNumberOut ? { jerseyNumberOut: Number(jerseyNumberOut) } : {}),
      ...(isStaff ? { isStaff: true } : {}),
      minute,
      createdAt: Date.now(),
    });
    if (activeType === "goal" || activeType === "penalty_goal" || activeType === "own_goal") {
      await recalculateMatchScore(id);
    }
    // 2nd yellow → auto red card
    if (activeType === "yellow_card") {
      const sameTeam = events.filter(
        (e) => e.type === "yellow_card" && e.team === activeTeam && !e.isStaff
      );
      const isSamePlayer = (e: MatchEvent) =>
        jerseyNumber
          ? e.jerseyNumber === Number(jerseyNumber)
          : e.player.trim().toLowerCase() === player.trim().toLowerCase();
      const alreadyHasYellow = sameTeam.some(isSamePlayer);
      if (alreadyHasYellow) {
        const confirmed = confirm(
          `${jerseyNumber ? `#${jerseyNumber} ` : ""}${player.trim()} มีใบเหลืองแล้ว\nเพิ่มใบแดงอัตโนมัติด้วยไหม?`
        );
        if (confirmed) {
          await addEvent(id, {
            matchId: id,
            type: "red_card",
            team: activeTeam,
            player: player.trim(),
            ...(jerseyNumber && !isStaff ? { jerseyNumber: Number(jerseyNumber) } : {}),
            ...(isStaff ? { isStaff: true } : {}),
            minute,
            createdAt: Date.now() + 1,
          });
        }
      }
    }

    setPlayer(""); setJerseyNumber("");
    setPlayerOut(""); setJerseyNumberOut("");
    setIsStaff(false);
    setAdding(false);
    if ((activeType === "goal" || activeType === "penalty_goal" || activeType === "own_goal") && match) {
      recalculateStandings(match.tournamentId);
    }
  }

  async function handleSaveStats() {
    setSavingStats(true);
    await updateMatch(id, { shots1, shots2, onTarget1, onTarget2, corners1, corners2, fouls1, fouls2, offsides1, offsides2 });
    setSavingStats(false);
    alert("บันทึก Stats เรียบร้อย!");
  }

  async function handleFinalize() {
    if (!match) return;
    setCalculating(true);
    const penData = resultType === "penalty" ? { penalty1, penalty2 } : {};
    await updateMatch(id, { status: "full_time", resultType, ...penData });
    await recalculateStandings(match.tournamentId);
    setMatch((prev) => prev ? { ...prev, status: "full_time", resultType } : prev);
    setCalculating(false);
    alert("บันทึกและคำนวณ Standings เรียบร้อย!");
  }

  if (!match) return <p className="text-gray-500">กำลังโหลด...</p>;

  const statusColor = match.status === "live" ? "text-red-400" : match.status === "full_time" ? "text-green-400" : "text-gray-400";

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push("/admin/dashboard")} className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
        ← กลับ Dashboard
      </button>

      {/* Match Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-sm">
            {match.group && <span className="text-blue-400 mr-2">สาย {match.group}</span>}
            {match.round} · {match.date} {match.time}
          </p>
          <span className={`text-sm font-bold uppercase ${statusColor}`}>{match.status.replace("_", " ")}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-white font-bold text-lg flex-1 text-center">{match.team1}</span>
          <span className="text-white text-3xl font-bold tracking-widest">{match.score1} : {match.score2}</span>
          <span className="text-white font-bold text-lg flex-1 text-center">{match.team2}</span>
        </div>
        <div className="flex justify-center mt-3">
          <button
            onClick={async () => { await recalculateMatchScore(id); if (match) recalculateStandings(match.tournamentId); }}
            className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors">
            🔄 คำนวณสกอใหม่จาก Events
          </button>
        </div>
      </div>

      {/* Status Control */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
        <p className="text-xs text-gray-400 mb-2">เปลี่ยนสถานะ</p>
        <div className="flex gap-2">
          {(["upcoming", "live"] as MatchStatus[]).map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                match.status === s
                  ? s === "live" ? "bg-red-600 text-white" : "bg-gray-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-700"
              }`}>
              {s === "upcoming" ? "⏳ Upcoming" : "🔴 Live"}
            </button>
          ))}
        </div>
      </div>

      {/* Add Event */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
        <p className="text-sm font-semibold mb-3">เพิ่มเหตุการณ์</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {EVENT_BUTTONS.map((btn) => (
            <button key={btn.type} onClick={() => { setActiveType(btn.type); setIsStaff(false); }}
              className={`py-2 rounded text-sm font-medium transition-colors ${
                activeType === btn.type ? btn.color + " text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"
              }`}>
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleAddEvent} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveTeam("team1")}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${activeTeam === "team1" ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
              {match.team1}
            </button>
            <button type="button" onClick={() => setActiveTeam("team2")}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${activeTeam === "team2" ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
              {match.team2}
            </button>
          </div>
          {isCardType && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsStaff(false)}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${!isStaff ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
                นักเตะ
              </button>
              <button type="button" onClick={() => { setIsStaff(true); setJerseyNumber(""); }}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${isStaff ? "bg-amber-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
                โค้ช / ทีมงาน
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              placeholder={isStaff ? "ชื่อโค้ช / ผู้ช่วย" : activeType === "substitution" ? "ชื่อนักเตะ (in)" : activeType === "own_goal" ? "ชื่อนักเตะ (ผู้ทำเข้าตัวเอง)" : "ชื่อนักเตะ"}
              value={player} onChange={(e) => setPlayer(e.target.value)} required
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            {!isStaff && (
            <input type="number" min={1} max={99} value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="เบอร์"
              className="w-16 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            )}
            <input type="text" value={minute} onChange={(e) => setMinute(e.target.value)}
              placeholder="90+1"
              className="w-20 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          {activeType === "substitution" && (
            <div className="flex gap-2">
              <input placeholder="ชื่อนักเตะ (out)" value={playerOut} onChange={(e) => setPlayerOut(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              <input type="number" min={1} max={99} value={jerseyNumberOut} onChange={(e) => setJerseyNumberOut(e.target.value)}
                placeholder="เบอร์"
                className="w-16 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          )}
          <button type="submit" disabled={adding}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
            {adding ? "กำลังเพิ่ม..." : `เพิ่ม ${EVENT_LABEL[activeType]}`}
          </button>
        </form>
      </div>

      {/* Match Stats */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
        <p className="text-sm font-semibold mb-3">Match Stats</p>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 items-center text-sm mb-3">
          <div className="text-xs text-center text-gray-400 font-semibold">{match.team1}</div>
          <div></div>
          <div className="text-xs text-center text-gray-400 font-semibold">{match.team2}</div>
          {[
            { label: "Shots", v1: shots1, v2: shots2, s1: setShots1, s2: setShots2 },
            { label: "On Target", v1: onTarget1, v2: onTarget2, s1: setOnTarget1, s2: setOnTarget2 },
            { label: "Corners", v1: corners1, v2: corners2, s1: setCorners1, s2: setCorners2 },
            { label: "Fouls", v1: fouls1, v2: fouls2, s1: setFouls1, s2: setFouls2 },
            { label: "Offsides", v1: offsides1, v2: offsides2, s1: setOffsides1, s2: setOffsides2 },
          ].map(({ label, v1, v2, s1, s2 }) => (
            <>
              <input key={label + "1"} type="number" min={0} value={v1}
                onChange={(e) => s1(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-blue-500" />
              <span className="text-center text-xs text-gray-500 whitespace-nowrap">{label}</span>
              <input key={label + "2"} type="number" min={0} value={v2}
                onChange={(e) => s2(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-blue-500" />
            </>
          ))}
          {/* Auto-calculated from events */}
          {[
            { label: "Yellow Cards", type: "yellow_card", color: "text-yellow-400" },
            { label: "Red Cards", type: "red_card", color: "text-red-400" },
          ].map(({ label, type, color }) => {
            const c1 = events.filter(e => e.type === type && e.team === "team1").length;
            const c2 = events.filter(e => e.type === type && e.team === "team2").length;
            return (
              <>
                <div key={type + "1"} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm">{c1}</div>
                <span key={type} className={`text-center text-xs whitespace-nowrap ${color}`}>{label}</span>
                <div key={type + "2"} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm">{c2}</div>
              </>
            );
          })}
        </div>
        <button onClick={handleSaveStats} disabled={savingStats}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
          {savingStats ? "กำลังบันทึก..." : "💾 บันทึก Stats"}
        </button>
      </div>

      {/* Finalize Match */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
        <p className="text-sm font-semibold mb-3">จบแมตช์ + คำนวณ Standings</p>

        <p className="text-xs text-gray-400 mb-2">ประเภทผล</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setResultType("normal")}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${resultType === "normal" ? "bg-green-700 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
            ✅ ปกติ (90 นาที)
          </button>
          <button onClick={() => setResultType("penalty")}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${resultType === "penalty" ? "bg-orange-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
            🔫 ยิง Penalty
          </button>
        </div>

        {resultType === "penalty" && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs text-gray-400 mb-1">{match.team1}</span>
              <input type="number" min={0} value={penalty1} onChange={(e) => setPenalty1(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xl font-bold text-center focus:outline-none focus:border-blue-500" />
            </div>
            <span className="text-gray-500 font-bold text-lg">–</span>
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs text-gray-400 mb-1">{match.team2}</span>
              <input type="number" min={0} value={penalty2} onChange={(e) => setPenalty2(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xl font-bold text-center focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        )}

        <button onClick={handleFinalize} disabled={calculating}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded px-4 py-2.5 text-sm font-bold transition-colors">
          {calculating ? "กำลังคำนวณ..." : "✅ Full Time + คำนวณ Standings"}
        </button>
      </div>

      {/* Event List */}
      {events.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <p className="text-sm font-semibold mb-3">เหตุการณ์ทั้งหมด ({events.length})</p>
          <div className="flex flex-col gap-2">
            {[...events].reverse().map((ev) => (
              <div key={ev.id} className="flex items-center justify-between bg-gray-900 rounded px-3 py-2">
                <div className="text-sm">
                  <span className="text-gray-400">{ev.minute}&apos; </span>
                  <span className="text-white">
                    {EVENT_LABEL[ev.type]} – {ev.jerseyNumber ? `#${ev.jerseyNumber} ` : ""}{ev.player}
                  </span>
                  {ev.playerOut && (
                    <span className="text-gray-400"> / out {ev.jerseyNumberOut ? `#${ev.jerseyNumberOut} ` : ""}{ev.playerOut}</span>
                  )}
                  <span className="text-gray-500 text-xs ml-2">({ev.team === "team1" ? match.team1 : match.team2})</span>
                </div>
                <button onClick={async () => {
                  await deleteEvent(id, ev.id);
                  if ((ev.type === "goal" || ev.type === "penalty_goal" || ev.type === "own_goal") && match) {
                    await recalculateMatchScore(id);
                    recalculateStandings(match.tournamentId);
                  }
                }} className="text-xs text-red-400 hover:text-red-300 ml-3">ลบ</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
