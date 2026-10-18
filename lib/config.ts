export const TEAM_NAME = "Spiders";
export const TIMEZONE = "America/Edmonton";

export const POSITIONS = ["skip", "vice", "second", "lead"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  skip: "Skip",
  vice: "Vice",
  second: "Second",
  lead: "Lead",
};

export const POSITION_SHORT: Record<Position, string> = {
  skip: "S",
  vice: "V",
  second: "2",
  lead: "L",
};
