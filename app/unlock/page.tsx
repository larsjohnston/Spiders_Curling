import UnlockForm from "./UnlockForm";

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-line bg-card p-5">
      <div>
        <h1 className="text-xl font-bold">Unlock editing</h1>
        <p className="text-sm text-muted">Enter the team PIN to add games, set lineups and record scores.</p>
      </div>
      <UnlockForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}
