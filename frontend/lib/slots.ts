const SLOT_DURATION_MINUTES = 30;

export function generateSlots(startTime: string, endTime: string): Date[] {
  const slots: Date[] = [];
  let cursor = new Date(startTime);
  const end = new Date(endTime);

  while (cursor.getTime() + SLOT_DURATION_MINUTES * 60_000 <= end.getTime()) {
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + SLOT_DURATION_MINUTES * 60_000);
  }

  return slots;
}
