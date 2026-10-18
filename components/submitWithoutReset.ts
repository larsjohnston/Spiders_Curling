import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler for a useActionState form that must keep what the person typed.
 * Passing the action as <form action={…}> makes React reset the form after every submit, so a
 * validation error ("Enter both scores") would wipe their input. Dispatching by hand avoids that;
 * pending state, returned errors and server redirects all work the same.
 */
export function submitWithoutReset(dispatch: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}
