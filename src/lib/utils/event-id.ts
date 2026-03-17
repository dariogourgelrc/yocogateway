import { nanoid } from "nanoid";

export function generateEventId(): string {
  return nanoid();
}
