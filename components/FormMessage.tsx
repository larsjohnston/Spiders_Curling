import type { FormState } from "@/app/actions";

export default function FormMessage({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm font-medium text-stone-red">{state.error}</p>;
  if (state.ok) return <p className="text-sm font-medium text-green-600">{state.ok}</p>;
  return null;
}
