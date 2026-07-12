import type { EventType } from "@/types";

export const EVENT_META: Record<EventType, { icon: string; label: string }> = {
  goal:          { icon: "⚽", label: "Goal" },
  penalty_goal:  { icon: "🎯", label: "Penalty" },
  penalty_miss:  { icon: "❌", label: "Pen. Miss" },
  own_goal:      { icon: "🤦", label: "Own Goal" },
  yellow_card:   { icon: "🟨", label: "Yellow Card" },
  red_card:      { icon: "🟥", label: "Red Card" },
  substitution:  { icon: "🔄", label: "Substitution" },
};

export function eventLabel(type: EventType) {
  const m = EVENT_META[type];
  return `${m.icon} ${m.label}`;
}
