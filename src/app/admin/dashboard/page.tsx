"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getTournaments, addTournament,
  subscribeTeams, addTeam, deleteTeam,
  subscribeMatches, addMatch, deleteMatch,
  recalculateStandings, uploadTeamLogo,
} from "@/lib/firestore";
import type { Tournament, Team, Match, SportType, MatchStage } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputCls = "bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500";

export default function AdminDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  // Tournament form
  const [tName, setTName] = useState("");
  const [tSport, setTSport] = useState<SportType>("football");
  const [tYear, setTYear] = useState(new Date().getFullYear());
  const [tEventName, setTEventName] = useState("");
  const [tStartDate, setTStartDate] = useState("");
  const [tGender, setTGender] = useState<"ชาย" | "หญิง" | "">("");
  const [tHalfDuration, setTHalfDuration] = useState(45);
  const [tWin, setTWin] = useState(3);
  const [tDraw, setTDraw] = useState(1);
  const [tLoss, setTLoss] = useState(0);
  const [tPenWin, setTPenWin] = useState(2);
  const [tPenLoss, setTPenLoss] = useState(1);

  // Team form
  const [tmName, setTmName] = useState("");
  const [tmFull, setTmFull] = useState("");
  const [tmGroup, setTmGroup] = useState("");
  const [tmLogo, setTmLogo] = useState<File | null>(null);
  const [tmLogoPreview, setTmLogoPreview] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Match form
  const [mTeam1Id, setMTeam1Id] = useState("");
  const [mTeam2Id, setMTeam2Id] = useState("");
  const [mStage, setMStage] = useState<MatchStage>("group");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("");
  const [mField, setMField] = useState("");
  const [mRound, setMRound] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/admin");
      else setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    getTournaments().then((data) => {
      setTournaments(data);
      setSelectedId(data[0]?.id ?? "");
    });
  }, [authReady]);

  useEffect(() => {
    if (!selectedId) { setTeams([]); setMatches([]); return; }
    const u1 = subscribeTeams(selectedId, setTeams);
    const u2 = subscribeMatches(selectedId, setMatches);
    return () => { u1(); u2(); };
  }, [selectedId]);

  async function handleAddTournament(e: React.FormEvent) {
    e.preventDefault();
    await addTournament({
      name: tName, sport: tSport, year: tYear,
      ...(tEventName.trim() ? { eventName: tEventName.trim() } : {}),
      ...(tStartDate ? { startDate: tStartDate } : {}),
      ...(tGender ? { gender: tGender } : {}),
      halfDuration: tHalfDuration,
      winPoints: tWin, drawPoints: tDraw, lossPoints: tLoss,
      penaltyWinPoints: tPenWin, penaltyLossPoints: tPenLoss,
    });
    setTName(""); setTEventName(""); setTStartDate(""); setTGender("");
    const data = await getTournaments();
    setTournaments(data);
    setSelectedId(data[0]?.id ?? "");
  }

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setUploadingLogo(true);
    let logoUrl: string | undefined;
    if (tmLogo) logoUrl = await uploadTeamLogo(tmLogo);
    await addTeam(selectedId, {
      tournamentId: selectedId,
      name: tmName.trim(),
      nameFull: tmFull.trim() || undefined,
      group: tmGroup.trim() || undefined,
      logoUrl,
    });
    setTmName(""); setTmFull(""); setTmGroup("");
    setTmLogo(null); setTmLogoPreview("");
    setUploadingLogo(false);
    recalculateStandings(selectedId);
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !mTeam1Id || !mTeam2Id) return;
    const t1 = teams.find((t) => t.id === mTeam1Id)!;
    const t2 = teams.find((t) => t.id === mTeam2Id)!;
    const tournament = tournaments.find((t) => t.id === selectedId)!;
    const group = mStage === "group" && t1.group && t1.group === t2.group ? t1.group : undefined;
    try {
      await addMatch({
        tournamentId: selectedId,
        sport: tournament.sport,
        team1: t1.name,
        ...(t1.nameFull ? { team1Full: t1.nameFull } : {}),
        team2: t2.name,
        ...(t2.nameFull ? { team2Full: t2.nameFull } : {}),
        stage: mStage,
        ...(group ? { group } : {}),
        score1: 0, score2: 0,
        status: "upcoming",
        date: mDate, time: mTime, field: mField, round: mRound,
        ...(tournament.halfDuration ? { halfDuration: tournament.halfDuration } : {}),
      });
      setMTeam1Id(""); setMTeam2Id(""); setMDate(""); setMTime(""); setMField(""); setMRound("");
    } catch (err) {
      alert("เพิ่มแมตช์ไม่สำเร็จ: " + String(err));
    }
  }

  if (!authReady) return <p className="text-gray-500">กำลังโหลด...</p>;

  const selectedTournament = tournaments.find((t) => t.id === selectedId);

  // Group teams by group for display
  const teamsByGroup = teams.reduce<Record<string, Team[]>>((acc, t) => {
    const g = t.group || "ไม่มีกลุ่ม";
    acc[g] = acc[g] ? [...acc[g], t] : [t];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button onClick={() => signOut(auth)} className="text-sm text-gray-400 hover:text-white">ออกจากระบบ</button>
      </div>

      {/* Tournament Selector */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-gray-400 shrink-0">รายการแข่งขัน:</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            className={`${inputCls} flex-1 min-w-48`}>
            {tournaments.length === 0 && <option value="">-- ยังไม่มีรายการ --</option>}
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.year}) — {t.sport}{t.gender ? ` ${t.gender}` : ""}</option>
            ))}
          </select>
          {selectedTournament && (
            <div className="flex gap-2 text-xs flex-wrap items-center">
              {[
                { label: "ชนะ", v: selectedTournament.winPoints },
                { label: "เสมอ", v: selectedTournament.drawPoints },
                { label: "แพ้", v: selectedTournament.lossPoints },
                { label: "ชนะPEN", v: selectedTournament.penaltyWinPoints },
                { label: "แพ้PEN", v: selectedTournament.penaltyLossPoints },
              ].map(({ label, v }) => (
                <span key={label} className="bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {label}: <b className="text-white">{v}</b>
                </span>
              ))}
              <button
                onClick={() => recalculateStandings(selectedId)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded transition-colors ml-2">
                🔄 คำนวณ Standings ใหม่
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Add Tournament */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
          <h2 className="font-semibold mb-4">➕ เพิ่มรายการแข่งขัน</h2>
          <form onSubmit={handleAddTournament} className="flex flex-col gap-3">
            <input placeholder="ชื่อรายการ" value={tName} onChange={(e) => setTName(e.target.value)} required className={inputCls} />
            <div className="flex gap-2">
              <select value={tSport} onChange={(e) => setTSport(e.target.value as SportType)} className={`${inputCls} flex-1`}>
                <option value="football">ฟุตบอล</option>
                <option value="futsal">ฟุตซอล</option>
                <option value="basketball">บาสเกตบอล</option>
                <option value="volleyball">วอลเลย์บอล</option>
              </select>
              <input type="number" value={tYear} onChange={(e) => setTYear(Number(e.target.value))} className={`${inputCls} w-20`} />
            </div>
            <div className="flex gap-2">
              {(["", "ชาย", "หญิง"] as const).map((g) => (
                <button key={g} type="button" onClick={() => setTGender(g as typeof tGender)}
                  className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors border ${
                    tGender === g
                      ? g === "ชาย" ? "bg-blue-600 border-blue-600 text-white"
                        : g === "หญิง" ? "bg-pink-600 border-pink-600 text-white"
                        : "bg-gray-600 border-gray-600 text-white"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {g === "" ? "ไม่ระบุเพศ" : g}
                </button>
              ))}
            </div>
            <input type="date" value={tStartDate} onChange={(e) => setTStartDate(e.target.value)}
              className={inputCls} />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 shrink-0">นาที/ครึ่ง</label>
              <input type="number" min={0} max={90} value={tHalfDuration}
                onChange={(e) => setTHalfDuration(Number(e.target.value))}
                className={`${inputCls} w-20`} />
              <span className="text-xs text-gray-500">(0 = ไม่มีตัวจับเวลา)</span>
            </div>
            <p className="text-xs text-gray-400">กฎแต้ม</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[["ชนะ", tWin, setTWin], ["เสมอ", tDraw, setTDraw], ["แพ้", tLoss, setTLoss]].map(([label, val, set]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-500 mb-1">{label as string}</p>
                  <input type="number" min={0} max={9} value={val as number}
                    onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                    className={`${inputCls} w-full text-center`} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">กฎ Penalty</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[["ชนะ PEN", tPenWin, setTPenWin], ["แพ้ PEN", tPenLoss, setTPenLoss]].map(([label, val, set]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-500 mb-1">{label as string}</p>
                  <input type="number" min={0} max={9} value={val as number}
                    onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                    className={`${inputCls} w-full text-center`} />
                </div>
              ))}
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
              เพิ่มรายการ
            </button>
          </form>
        </div>

        {/* 2. Manage Teams */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
          <h2 className="font-semibold mb-4">🏫 จัดการทีม ({teams.length})</h2>
          {!selectedId ? (
            <p className="text-gray-500 text-sm">เลือกรายการแข่งขันก่อน</p>
          ) : (
            <>
              <form onSubmit={handleAddTeam} className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2">
                  <input placeholder="ชื่อย่อ (NSRU)" value={tmName} onChange={(e) => setTmName(e.target.value)} required
                    className={`${inputCls} w-24`} />
                  <input placeholder="กลุ่ม (A, B...)" value={tmGroup} onChange={(e) => setTmGroup(e.target.value)}
                    className={`${inputCls} w-20`} />
                </div>
                <input placeholder="ชื่อเต็ม (ไม่บังคับ)" value={tmFull} onChange={(e) => setTmFull(e.target.value)}
                  className={inputCls} />
                <div className="flex items-center gap-2">
                  {tmLogoPreview && <img src={tmLogoPreview} alt="preview" className="w-9 h-9 rounded object-cover border border-gray-600" />}
                  <label className="flex-1 cursor-pointer bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400 hover:border-blue-500 transition-colors truncate">
                    {tmLogo ? tmLogo.name : "Logo (ไม่บังคับ)"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setTmLogo(f);
                      setTmLogoPreview(f ? URL.createObjectURL(f) : "");
                    }} />
                  </label>
                  {tmLogo && <button type="button" onClick={() => { setTmLogo(null); setTmLogoPreview(""); }} className="text-xs text-red-400 hover:text-red-300 shrink-0">ลบ</button>}
                </div>
                <button type="submit" disabled={uploadingLogo} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-3 py-1.5 text-sm font-medium transition-colors">
                  {uploadingLogo ? "กำลังอัปโหลด..." : "เพิ่มทีม"}
                </button>
              </form>

              {Object.keys(teamsByGroup).length === 0 ? (
                <p className="text-gray-500 text-sm">ยังไม่มีทีม</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {Object.entries(teamsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupTeams]) => (
                    <div key={group}>
                      <p className="text-xs text-gray-400 mb-1">
                        {group === "ไม่มีกลุ่ม" ? "ไม่มีกลุ่ม" : `สาย ${group}`}
                      </p>
                      <div className="space-y-1">
                        {groupTeams.map((t) => (
                          <div key={t.id} className="flex items-center justify-between bg-gray-900 rounded px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              {t.logoUrl
                                ? <img src={t.logoUrl} alt={t.name} className="w-7 h-7 rounded-full object-cover" />
                                : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-500">?</div>
                              }
                              <div>
                                <span className="text-white text-sm font-medium">{t.name}</span>
                                {t.nameFull && <span className="text-gray-500 text-xs ml-2">{t.nameFull}</span>}
                              </div>
                            </div>
                            <button onClick={() => deleteTeam(selectedId, t.id)}
                              className="text-xs text-red-400 hover:text-red-300 ml-2">ลบ</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. Add Match */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
          <h2 className="font-semibold mb-4">⚔️ เพิ่มแมตช์</h2>
          {!selectedId ? (
            <p className="text-gray-500 text-sm">เลือกรายการแข่งขันก่อน</p>
          ) : teams.length < 2 ? (
            <p className="text-gray-500 text-sm">เพิ่มทีมอย่างน้อย 2 ทีมก่อน</p>
          ) : (
            <form onSubmit={handleAddMatch} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">รูปแบบแมตช์</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMStage("group")}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${mStage === "group" ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
                    🏆 รอบแบ่งกลุ่ม
                  </button>
                  <button type="button" onClick={() => setMStage("knockout")}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${mStage === "knockout" ? "bg-orange-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}>
                    ⚡ น็อกเอาท์
                  </button>
                </div>
                {mStage === "knockout" && (
                  <p className="text-xs text-orange-400 mt-1">ไม่นับแต้มใน Standings</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">ทีมเหย้า</label>
                <select value={mTeam1Id} onChange={(e) => setMTeam1Id(e.target.value)} required className={`${inputCls} w-full`}>
                  <option value="">-- เลือกทีมเหย้า --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.id === mTeam2Id}>
                      {t.group ? `[สาย ${t.group}] ` : ""}{t.name}{t.nameFull ? ` — ${t.nameFull}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">ทีมเยือน</label>
                <select value={mTeam2Id} onChange={(e) => setMTeam2Id(e.target.value)} required className={`${inputCls} w-full`}>
                  <option value="">-- เลือกทีมเยือน --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.id === mTeam1Id}>
                      {t.group ? `[สาย ${t.group}] ` : ""}{t.name}{t.nameFull ? ` — ${t.nameFull}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} required className={`${inputCls} flex-1`} />
                <input type="time" value={mTime} onChange={(e) => setMTime(e.target.value)} required className={`${inputCls} flex-1`} />
              </div>
              <input placeholder="สนาม" value={mField} onChange={(e) => setMField(e.target.value)} required className={inputCls} />
              <input placeholder="รอบ (เช่น สาย A รอบแรก)" value={mRound} onChange={(e) => setMRound(e.target.value)} required className={inputCls} />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
                เพิ่มแมตช์
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Match List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h2 className="font-semibold mb-4">รายการแมตช์ ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-gray-500 text-sm">ยังไม่มีแมตช์</p>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-gray-900 rounded px-4 py-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  {m.stage === "knockout"
                    ? <span className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded">⚡ น็อกเอาท์</span>
                    : m.group && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">สาย {m.group}</span>
                  }
                  <span className="text-white text-sm font-medium">{m.team1} vs {m.team2}</span>
                  <span className="text-gray-500 text-xs">{m.date} {m.time} · {m.round}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.status === "live" ? "bg-red-900 text-red-300" :
                    m.status === "full_time" ? "bg-green-900 text-green-300" :
                    "bg-gray-700 text-gray-400"
                  }`}>{m.status === "full_time" ? "Full Time" : m.status === "live" ? "Live" : "Upcoming"}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/admin/match/${m.id}`}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors">
                    แก้ไข
                  </Link>
                  <button onClick={() => deleteMatch(m.id)}
                    className="text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded transition-colors">
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
