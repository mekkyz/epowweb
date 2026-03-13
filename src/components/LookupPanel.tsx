"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Building, Gauge, Radio } from "lucide-react";
import { buildingOptions, meterOptions, stationOptions } from "@/config/grid";
import { Button, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthProvider";
import { useEntityMapping } from "@/hooks/useEntityMapping";
import type { EntityType } from "@/lib/constants";

interface Props {
  onPreview?: (url: string) => void;
}

export default function LookupPanel({ onPreview }: Props) {
  const { isDemo } = useAuth();
  const mapping = useEntityMapping();

  const [station, setStation] = useState(stationOptions[0]?.id ?? "");
  const [building, setBuilding] = useState(buildingOptions[0]?.id ?? "");
  const [meter, setMeter] = useState(meterOptions[0]?.id ?? "");

  const [filterBuildings, setFilterBuildings] = useState(false);
  const [filterMeters, setFilterMeters] = useState(false);

  // Base options: only entities that exist in the config (have data)
  const baseStationOptions = useMemo(() => {
    if (!mapping.loaded) return stationOptions;
    return stationOptions.filter((s) => mapping.stationIds.has(s.id));
  }, [mapping]);

  const baseBuildingOptions = useMemo(() => {
    if (!mapping.loaded) return buildingOptions;
    return buildingOptions.filter((b) => mapping.buildingIds.has(b.id));
  }, [mapping]);

  const baseMeterOptions = useMemo(() => {
    if (!mapping.loaded) return meterOptions;
    return meterOptions.filter((m) => mapping.meterIds.has(m.id));
  }, [mapping]);

  // Filtered building options: if filter is on, show only buildings for selected station
  const filteredBuildingOptions = useMemo(() => {
    if (!filterBuildings || !mapping.loaded) return baseBuildingOptions;
    const allowed = new Set(mapping.buildingsForStation(station));
    return baseBuildingOptions.filter((b) => allowed.has(b.id));
  }, [filterBuildings, station, mapping, baseBuildingOptions]);

  // Filtered meter options: filter by station and/or building
  const filteredMeterOptions = useMemo(() => {
    if (!filterMeters || !mapping.loaded) return baseMeterOptions;
    if (filterBuildings && building) {
      const allowed = new Set(mapping.metersForBuilding(building));
      return baseMeterOptions.filter((m) => allowed.has(m.id));
    }
    const allowed = new Set(mapping.metersForStation(station));
    return baseMeterOptions.filter((m) => allowed.has(m.id));
  }, [filterMeters, filterBuildings, station, building, mapping, baseMeterOptions]);

  // When filtered options change, ensure selection is still valid
  const effectiveBuilding = filteredBuildingOptions.find((b) => b.id === building)
    ? building
    : (filteredBuildingOptions[0]?.id ?? "");

  const effectiveMeter = filteredMeterOptions.find((m) => m.id === meter)
    ? meter
    : (filteredMeterOptions[0]?.id ?? "");

  // Sync effective values back
  if (effectiveBuilding !== building) setBuilding(effectiveBuilding);
  if (effectiveMeter !== meter) setMeter(effectiveMeter);

  const openTarget = (type: EntityType) => {
    const id =
      type === "station" ? station : type === "building" ? effectiveBuilding : effectiveMeter;
    if (!id) return;
    window.open(`/visualization/${type}/${id}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <LookupSelect
          label="Stations"
          icon={<Radio className="h-4 w-4 text-emerald-400" />}
          value={station}
          onChange={(id) => {
            setStation(id);
            onPreview?.(`/visualization/station/${id}`);
          }}
          options={baseStationOptions}
          onOpen={() => openTarget("station")}
          disabled={isDemo}
        />
        <LookupSelect
          label="Buildings"
          icon={<Building className="h-4 w-4 text-blue-400" />}
          value={effectiveBuilding}
          onChange={(id) => {
            setBuilding(id);
            onPreview?.(`/visualization/building/${id}`);
          }}
          options={filteredBuildingOptions}
          onOpen={() => openTarget("building")}
          disabled={isDemo}
          filterActive={filterBuildings}
          onToggleFilter={() => setFilterBuildings((f) => !f)}
          filterReady={mapping.loaded}
          filterLabel="Filter by station"
        />
        <LookupSelect
          label="Meters"
          icon={<Gauge className="h-4 w-4 text-amber-400" />}
          value={effectiveMeter}
          onChange={(id) => {
            setMeter(id);
            onPreview?.(`/visualization/meter/${id}`);
          }}
          options={filteredMeterOptions}
          onOpen={() => openTarget("meter")}
          disabled={isDemo}
          filterActive={filterMeters}
          onToggleFilter={() => setFilterMeters((f) => !f)}
          filterReady={mapping.loaded}
          filterLabel={filterBuildings ? "Filter by building" : "Filter by station"}
        />
      </div>
    </div>
  );
}

function LookupSelect({
  label,
  icon,
  value,
  onChange,
  options,
  onOpen,
  disabled,
  filterActive,
  onToggleFilter,
  filterReady,
  filterLabel,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { id: string; label: string }[];
  onChange: (next: string) => void;
  onOpen: () => void;
  disabled?: boolean;
  filterActive?: boolean;
  onToggleFilter?: () => void;
  filterReady?: boolean;
  filterLabel?: string;
}) {
  const selectOptions = options.map((opt) => ({
    value: opt.id,
    label: opt.label,
  }));

  return (
    <div className="border-border bg-panel hover:border-border-strong rounded-xl border p-4 shadow-sm transition-all">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-foreground text-sm font-semibold">{label}</p>
          {onToggleFilter && (
            <button
              onClick={onToggleFilter}
              disabled={!filterReady}
              role="switch"
              aria-checked={filterActive}
              aria-label={filterLabel}
              title={filterLabel}
              className="disabled:opacity-30"
            >
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  filterActive ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    filterActive ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </span>
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpen}
          disabled={disabled}
          title={disabled ? "Full access required" : "Open visualization in new tab"}
          iconRight={<ArrowUpRight className="h-3 w-3" />}
        >
          Open
        </Button>
      </div>
      <Select
        options={selectOptions}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="sm"
        className="dark:bg-background bg-white py-1"
        disabled={disabled}
        aria-label={`Select ${label.toLowerCase()}`}
      />
    </div>
  );
}
