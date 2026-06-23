import { useSyncExternalStore } from "react";
import { getDB, subscribe } from "./store";
import type { DB } from "./types";

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, getDB);
}
