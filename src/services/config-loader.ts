import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { BuildingMeta, MeterMeta, SmdtConfig, StationMeta } from '@/types/smdt';
import { configLogger } from '@/lib/logger';

const SAMPLE_DATA_DIR = path.join(process.cwd(), 'data', 'smdt-sample');
const SAMPLE_CONFIG_FILE = path.join(process.cwd(), 'data', 'smdt-config', 'KIT_CN.xml');

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

/**
 * Returns the data directory path, checking environment variable first
 */
export function getDataDir(): string {
  if (process.env.SMDT_DATA_DIR) {
    configLogger.debug('Using SMDT_DATA_DIR from environment', { path: process.env.SMDT_DATA_DIR });
    return process.env.SMDT_DATA_DIR;
  }
  return SAMPLE_DATA_DIR;
}

/**
 * Returns the config file path, checking environment variable first
 */
export function getConfigFile(): string {
  if (process.env.SMDT_CONFIG_FILE) {
    configLogger.debug('Using SMDT_CONFIG_FILE from environment', { path: process.env.SMDT_CONFIG_FILE });
    return process.env.SMDT_CONFIG_FILE;
  }
  return SAMPLE_CONFIG_FILE;
}

/**
 * Parses and returns the SMDT configuration, caching the result
 */
export function getSmdtConfig(): SmdtConfig {
  if (cached) return cached;

  const configFile = getConfigFile();
  
  if (!fs.existsSync(configFile)) {
    configLogger.warn('Config file not found, returning empty config', { path: configFile });
    cached = { meters: [], buildings: [], stations: [] };
    return cached;
  }

  try {
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

    function walkGroup(group: XmlGroup, stationId?: string): { meters: string[]; buildings: string[] } {
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

      // Generic group - recurse
      const childMeters: string[] = [];
      const childBuildings: string[] = [];
      const childGroups = ensureArray(group.group);
      
      childGroups.forEach((child) => {
        const { meters: mIds, buildings: bIds } = walkGroup(child, stationId);
        childMeters.push(...mIds);
        childBuildings.push(...bIds);
      });
      
      return { meters: childMeters, buildings: childBuildings };
    }

    // Start parsing from root - XML root element is 'xml', not 'config'
    const rootGroups = ensureArray(parsed?.xml?.group ?? parsed?.config?.group ?? parsed?.group);
    rootGroups.forEach((g) => walkGroup(g));

    cached = { meters, buildings, stations };
    
    configLogger.info('SMDT config loaded successfully', {
      metersCount: meters.length,
      buildingsCount: buildings.length,
      stationsCount: stations.length,
    });
    
    return cached;
  } catch (error) {
    configLogger.error('Failed to parse SMDT config', error, { path: configFile });
    cached = { meters: [], buildings: [], stations: [] };
    return cached;
  }
}

// =============================================================================
// Private Helper Functions
// =============================================================================

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function asBool(value: string | number | boolean | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return value === 1;
}
