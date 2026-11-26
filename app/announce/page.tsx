import { unlockedOrRedirect } from "@/lib/guard";
import AnnounceForm from "./AnnounceForm";

export default async function AnnouncePage() {
  await unlockedOrRedirect("/announce");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Announce</h1>
        <p className="text-sm text-muted">One push to everyone with notifications on. Tapping it opens the page you pick.</p>
      </div>
      <AnnounceForm />
    </div>
  );
}
