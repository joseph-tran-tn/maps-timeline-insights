import type { TimelinePoint } from "@/types/timeline";
import { parseTimelineData } from "./parseRecords";

/**
 * Parse file as JSON. Returns null on error.
 */
export async function parseJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Load timeline from Timeline.json (exported from Google Maps Timeline app).
 * Supports:
 * - Records.json format: object with locations[] (latitudeE7, longitudeE7, timestamp)
 * - Semantic timeline format: root array of visit/activity (startTime, endTime, placeLocation, geo:lat,lng)
 */
export async function loadRecordsFromFile(file: File): Promise<{
  points: TimelinePoint[];
  error?: string;
}> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".json")) {
    return { points: [], error: "Accept only .json (Timeline.json)" };
  }
  const data = await parseJsonFile(file);
  if (data === null) return { points: [], error: "Invalid JSON" };
  const points = parseTimelineData(data);
  return {
    points,
    error: points.length === 0 ? "No timeline data found" : undefined,
  };
}
