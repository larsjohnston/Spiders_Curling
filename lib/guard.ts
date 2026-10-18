import "server-only";
import { redirect } from "next/navigation";
import { isUnlocked } from "./auth";

/** For PIN-only pages: bounce to /unlock and come back here afterwards. */
export async function unlockedOrRedirect(path: string): Promise<void> {
  if (!(await isUnlocked())) redirect(`/unlock?next=${encodeURIComponent(path)}`);
}
