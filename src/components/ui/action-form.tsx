"use client";

import { createContext, useContext, useEffect, useRef, useTransition, type ComponentProps, type Ref } from "react";

const Pending = createContext<boolean | null>(null);

/** Whether the surrounding ActionForm is submitting (null outside one). */
export const useActionFormPending = () => useContext(Pending);

type Props = Omit<ComponentProps<"form">, "action" | "onSubmit" | "ref"> & {
  action: (form: FormData) => void;
  state: { ok: boolean } | null | undefined;
  ref?: Ref<HTMLFormElement>;
};

/**
 * A form for a `useActionState` action. React clears a form after every
 * submit, so a validation error would wipe what was typed; this keeps the
 * values and clears the form only after a successful save.
 */
export function ActionForm({ action, state, ref, ...props }: Props) {
  const form = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const seen = useRef(state);

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state?.ok) form.current?.reset();
  }, [state]);

  const setRef = (el: HTMLFormElement | null) => {
    form.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <Pending value={pending}>
      <form
        {...props}
        ref={setRef}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => action(data));
        }}
      />
    </Pending>
  );
}
