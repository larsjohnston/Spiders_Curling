"use client";

import Link from "next/link";
import type { Player } from "@/lib/types";
import { useMe } from "./useMe";

/** Nav link to /me labelled with this device's player name once one is picked. */
export default function MeLink({ players }: { players: Pick<Player, "id" | "name">[] }) {
  const [me] = useMe();
  const name = players.find((p) => p.id === me)?.name;
  return <Link href="/me">{name ?? "Me"}</Link>;
}
