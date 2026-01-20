import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { BuildingMeta, MeterMeta, SmdtConfig, StationMeta } from '@/types/smdt';

const SAMPLE_DATA_DIR = path.join(process.cwd(), 'data', 'smdt-sample');
const SAMPLE_CONFIG_FILE = path.join(process.cwd(), 'data', 'smdt-config', 'KIT_CN.xml');
// Legacy auto-discovery (commented out; re-enable if needed)
// const LEGACY_DATA_DIR = path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data');
// const LEGACY_CONFIG_FILE = path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'config', 'KIT_CN.xml');

type XmlMeter = {
  name: string;
  wandlerfaktor?: string | number;
  aggregate?: string | number | boolean;
  StdId?: string | number;
  AKS?: string;
  Messstellenbezeichnung?: string;
  Kommentar?: string;
};

type XmlGroup = {
  name: string;
  type?: string;
  group?: XmlGroup | XmlGroup[];
  meter?: XmlMeter | XmlMeter[];
};

let cached: SmdtConfig | null = null;

export function getDataDir() {
  if (process.env.SMDT_DATA_DIR) return process.env.SMDT_DATA_DIR;
  // if (fs.existsSync(LEGACY_DATA_DIR)) return LEGACY_DATA_DIR;
  return SAMPLE_DATA_DIR;
}

export function getConfigFile() {
  if (process.env.SMDT_CONFIG_FILE) return process.env.SMDT_CONFIG_FILE;
  // if (fs.existsSync(LEGACY_CONFIG_FILE)) return LEGACY_CONFIG_FILE;
  return SAMPLE_CONFIG_FILE;
}

export function getSmdtConfig(): SmdtConfig {
  if (cached) return cached;

  const configFile = getConfigFile();
  if (!fs.existsSync(configFile)) {
    cached = { meters: [], buildings: [], stations: [] };
    return cached;
  }

  const xml = fs.readFileSync(configFile, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
  });
  const parsed = parser.parse(xml);

  const meters: MeterMeta[] = [];
  const buildings: BuildingMeta[] = [];
  const stations: StationMeta[] = [];

  function walkGroup(group: XmlGroup, stationId?: string) {
    const type = group.type;
    const name = group.name;

    if (type === 'Station') {
      const stationMeters: string[] = [];
      const stationBuildings: string[] = [];
      const childGroups = ensureArray(group.group);
      childGroups.forEach((child) => {
        const { meters: mIds, buildings: bIds } = walkGroup(child, name);
        stationMeters.push(...mIds);
        stationBuildings.push(...bIds);
      });
      stations.push({ id: name, meters: stationMeters, buildings: stationBuildings });
      return { meters: stationMeters, buildings: stationBuildings };
    }

    if (type === 'Gebaeude') {
      const meterIds: string[] = [];
      const childMeters = ensureArray(group.meter);
      childMeters.forEach((m) => {
        const id = m.name;
        const meta: MeterMeta = {
          id,
          stationId,
          buildingId: name,
          wandlerfaktor: asNumber(m.wandlerfaktor),
          aggregate: asBool(m.aggregate),
          stdId: asNumber(m.StdId),
          aks: m.AKS,
          label: m.Messstellenbezeichnung,
          notes: m.Kommentar,
        };
        meters.push(meta);
        meterIds.push(id);
      });
      buildings.push({ id: name, stationId, meters: meterIds });
      return { meters: meterIds, buildings: [name] };
    }

    return { meters: [] as string[], buildings: [] as string[] };
  }

  const rootGroup = parsed?.xml?.group as XmlGroup | undefined;
  if (rootGroup) {
    const groups = ensureArray(rootGroup.group);
    groups.forEach((g) => walkGroup(g));
  }

  cached = { meters, buildings, stations };
  return cached;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function asNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function asBool(value: unknown) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}
