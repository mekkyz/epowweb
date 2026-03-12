'use client';

import {
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  ImageDown,
  Maximize2,
  Minimize2,
  Play,
  Pause,
} from 'lucide-react';
import clsx from 'clsx';
import { Button, Slider } from '@/components/ui';
import { SPEED_OPTIONS } from './useHeatmapData';

interface HeatmapControlsProps {
  // date navigation
  selectedDate: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minDateAvail: string;
  maxDateAvail: string;
  availableDates: string[];
  stepByDay: (delta: -1 | 1) => void;
  // timestamp navigation
  sliderIndex: number;
  dayTimestamps: string[];
  currentTime: string;
  minTime: string;
  maxTime: string;
  stepByIndex: (delta: number) => void;
  onSliderChange: (val: number) => void;
  // playback
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  playSpeed: number;
  setPlaySpeed: (v: number) => void;
  stopPlayback: () => void;
  // actions
  onDownload: (format: 'json' | 'csv') => void;
  onDownloadPng: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  // restrictions
  isDemo: boolean;
  hasSelected: boolean;
}

export default function HeatmapControls({
  selectedDate,
  onDateChange,
  minDateAvail,
  maxDateAvail,
  availableDates,
  stepByDay,
  sliderIndex,
  dayTimestamps,
  currentTime,
  minTime,
  maxTime,
  stepByIndex,
  onSliderChange,
  isPlaying,
  setIsPlaying,
  playSpeed,
  setPlaySpeed,
  stopPlayback,
  onDownload,
  onDownloadPng,
  isFullscreen,
  toggleFullscreen,
  isDemo,
  hasSelected,
}: HeatmapControlsProps) {
  return (
    <>
      {/* controls row: date picker + playback + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* date picker with prev/next day */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByDay(-1); }}
            disabled={isDemo || availableDates.indexOf(selectedDate) <= 0}
            title={isDemo ? 'Full access required' : 'Previous day'}
            aria-label="Previous day"
            className="rounded-r-none border-r-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { stopPlayback(); onDateChange(e); }}
            disabled={isDemo}
            min={minDateAvail || undefined}
            max={maxDateAvail || undefined}
            className="h-full rounded-none border border-x-0 border-border-strong bg-white px-2.5 py-1 text-xs text-foreground outline-none focus:ring-0 dark:bg-background"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByDay(1); }}
            disabled={isDemo || availableDates.indexOf(selectedDate) >= availableDates.length - 1}
            title={isDemo ? 'Full access required' : 'Next day'}
            aria-label="Next day"
            className="rounded-l-none border-l-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* timestamp step controls */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByIndex(-1); }}
            disabled={isDemo || sliderIndex <= 0}
            title={isDemo ? 'Full access required' : 'Previous timestamp'}
            aria-label="Previous timestamp"
            className="rounded-r-none border-r-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex h-full items-center border border-x-0 border-border-strong bg-white px-2.5 py-1 text-xs tabular-nums text-foreground dark:bg-background">
            {currentTime || '—'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByIndex(1); }}
            disabled={isDemo || sliderIndex >= dayTimestamps.length - 1}
            title={isDemo ? 'Full access required' : 'Next timestamp'}
            aria-label="Next timestamp"
            className="rounded-l-none border-l-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* playback controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={isPlaying ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isDemo || dayTimestamps.length === 0 || sliderIndex >= dayTimestamps.length - 1}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause playback' : 'Play through day'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* speed selector */}
        <div className="flex items-center rounded-lg border border-border-strong">
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setPlaySpeed(i)}
              className={clsx(
                'px-2 py-1 text-xs font-medium transition-colors',
                i === 0 && 'rounded-l-[7px]',
                i === SPEED_OPTIONS.length - 1 && 'rounded-r-[7px]',
                playSpeed === i
                  ? 'bg-foreground text-background'
                  : 'bg-white text-foreground-secondary hover:text-foreground dark:bg-background'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* download + fullscreen */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload('json')}
            disabled={isDemo || !hasSelected}
            title={isDemo ? 'Full access required' : 'Download data as JSON'}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload('csv')}
            disabled={isDemo || !hasSelected}
            title={isDemo ? 'Full access required' : 'Download data as CSV'}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadPng}
            disabled={isDemo}
            title={isDemo ? 'Full access required' : 'Download as PNG'}
            icon={<ImageDown className="h-3.5 w-3.5" />}
          >
            PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            disabled={isDemo}
            title={isDemo ? 'Full access required' : isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            icon={isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* timeline slider */}
      <div className="space-y-1">
        <Slider
          min={0}
          max={Math.max(dayTimestamps.length - 1, 0)}
          value={sliderIndex}
          onChange={(val) => { stopPlayback(); onSliderChange(val); }}
          disabled={isDemo || dayTimestamps.length === 0}
        />
        <div className="flex items-center justify-between text-[10px] text-foreground-tertiary">
          <span>{minTime}</span>
          <span className="font-medium text-foreground-secondary">{currentTime}</span>
          <span>{maxTime}</span>
        </div>
      </div>
    </>
  );
}
