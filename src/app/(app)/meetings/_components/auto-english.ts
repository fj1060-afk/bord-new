"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import { blankValues, fillBlanks, hasArabic } from "@/lib/translate";
import { toEnglish } from "../_actions/translate";

type Field = HTMLInputElement | HTMLTextAreaElement;

/**
 * Keeps English fields in step with their Arabic fields while typing
 * (`pairs` maps Arabic field names to English ones). A title picked from a
 * standard wording keeps its exact English and only the values typed into
 * its blanks are translated. Editing an English field by hand stops the sync
 * for that field until it is emptied.
 */
export function useAutoEnglish(form: RefObject<HTMLFormElement | null>, pairs: Record<string, string>) {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const runs = useRef<Record<string, number>>({});
  const get = (name: string) => form.current?.elements.namedItem(name) as Field | null;
  // Fields whose machine translation failed, to tell the author to complete them.
  const [failed, setFailed] = useState<string[]>([]);
  const mark = (name: string, bad: boolean) => setFailed((f) => (bad ? [...new Set([...f, name])] : f.filter((n) => n !== name)));

  /** The English text, and whether some of it could not be translated. */
  async function english(ar: Field): Promise<{ value: string | null; gap: boolean }> {
    const text = ar.value.trim();
    if (!text) return { value: "", gap: false };
    const { templateAr, templateEn } = ar.dataset;
    const values = templateAr && templateEn ? blankValues(templateAr, text) : null;
    if (values && templateEn) {
      const arabic = values.filter(hasArabic);
      const done = arabic.length ? await toEnglish(arabic) : [];
      // An untranslated value stays a blank rather than Arabic text in the English document.
      const map = new Map(arabic.map((v, i) => [v, done[i] ?? "(…)"]));
      return { value: fillBlanks(templateEn, values.map((v) => map.get(v) ?? v)), gap: done.some((d) => d === null) };
    }
    const [value] = await toEnglish([text]);
    return { value, gap: value === null };
  }

  /** Recomputes the English for an Arabic field now (after a programmatic change). */
  function sync(arName: string) {
    const ar = get(arName);
    const en = get(pairs[arName]);
    if (!ar || !en || en.dataset.manual) return;
    const run = (runs.current[arName] = (runs.current[arName] ?? 0) + 1);
    void english(ar).then(({ value, gap }) => {
      if (runs.current[arName] !== run || en.dataset.manual) return;
      mark(arName, gap);
      if (value === null) return;
      en.value = value;
      const details = en.closest("details");
      if (details && value) details.open = true;
    });
  }

  const onInput = (e: FormEvent<HTMLFormElement>) => {
    const target = e.target as Field;
    if (Object.values(pairs).includes(target.name)) {
      if (target.value.trim()) target.dataset.manual = "1";
      else delete target.dataset.manual;
      const ar = Object.keys(pairs).find((k) => pairs[k] === target.name);
      if (ar) mark(ar, false);
      return;
    }
    if (!(target.name in pairs)) return;
    clearTimeout(timers.current[target.name]);
    timers.current[target.name] = setTimeout(() => sync(target.name), 700);
  };

  const onReset = () => {
    setFailed([]);
    for (const [ar, en] of Object.entries(pairs)) {
      const a = get(ar);
      if (a) {
        delete a.dataset.templateAr;
        delete a.dataset.templateEn;
      }
      if (a) delete a.dataset.auto;
      const n = get(en);
      if (n) delete n.dataset.manual;
    }
  };

  return { onInput, onReset, sync, failed };
}
