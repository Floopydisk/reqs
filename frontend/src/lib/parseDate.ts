import { addDays, isValid, parse } from "date-fns";

const SUPPORTED_FORMATS = [
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "MMMM d yyyy",
  "MMM d yyyy",
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "dd/MM/yyyy",
  "d/M/yyyy",
] as const;

const RELATIVE_DATES: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  yesterday: -1,
};

export function parseDate(
  input: string | Date | null | undefined,
): Date | null {
  if (input instanceof Date) {
    return isValid(input) ? input : null;
  }

  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const relativeOffset = RELATIVE_DATES[trimmed.toLowerCase()];
  if (relativeOffset !== undefined) {
    return addDays(new Date(), relativeOffset);
  }

  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed)) {
    return nativeParsed;
  }

  for (const format of SUPPORTED_FORMATS) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  return null;
}
