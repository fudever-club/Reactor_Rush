export interface Volumes { master: number; music: number; sfx: number }
export const DEFAULT_VOLUMES: Readonly<Volumes> = Object.freeze({master:100,music:100,sfx:100});
export const SETTINGS_KEY = 'reactor-rush.settings.v1';
type StorageProvider = () => Pick<Storage,'getItem'|'setItem'> | undefined;
const browserStorage: StorageProvider = () => typeof window === 'undefined' ? undefined : window.localStorage;
export function sanitizeVolumes(value: unknown): Volumes {
 const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<Volumes> : {};
 const volume = (key: keyof Volumes) => typeof record[key] === 'number' && Number.isFinite(record[key]) ? Math.max(0,Math.min(100,record[key]!)) : DEFAULT_VOLUMES[key];
 return {master:volume('master'),music:volume('music'),sfx:volume('sfx')};
}
export function loadVolumes(storage: StorageProvider = browserStorage): Volumes {
 try { const raw = storage()?.getItem(SETTINGS_KEY); if(!raw)return {...DEFAULT_VOLUMES}; const data = JSON.parse(raw); return data?.version === 1 ? sanitizeVolumes(data.volumes) : {...DEFAULT_VOLUMES}; } catch { return {...DEFAULT_VOLUMES}; }
}
export function saveVolumes(volumes: Volumes, storage: StorageProvider = browserStorage): void {
 try { storage()?.setItem(SETTINGS_KEY,JSON.stringify({version:1,volumes:sanitizeVolumes(volumes)})); } catch { /* Preferences remain usable when browser storage is blocked. */ }
}
