/**
 * Resonance — A subtle "this moved me" reaction for poem lines.
 * Stores resonance counts in Supabase `line_resonance` table.
 *
 * Table schema (run in Supabase SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS line_resonance (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   line_id UUID NOT NULL REFERENCES poem_lines(id) ON DELETE CASCADE,
 *   fingerprint TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(line_id, fingerprint)
 * );
 *
 * ALTER TABLE line_resonance ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Anyone can insert resonance" ON line_resonance FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Anyone can read resonance" ON line_resonance FOR SELECT USING (true);
 */

import { supabase } from './supabase.js';

var resonanceCache = {}; // { lineId: count }
var userResonated = {};  // { lineId: true } — what this user already resonated with

/**
 * Fetch resonance counts for a set of line IDs.
 */
export async function fetchResonanceCounts(lineIds) {
  if (!lineIds || lineIds.length === 0) return {};

  var { data, error } = await supabase
    .from('line_resonance')
    .select('line_id')
    .in('line_id', lineIds);

  if (error || !data) return {};

  var counts = {};
  data.forEach(function (r) {
    counts[r.line_id] = (counts[r.line_id] || 0) + 1;
  });
  resonanceCache = Object.assign(resonanceCache, counts);
  return counts;
}

/**
 * Check which lines the current user has resonated with.
 */
export async function fetchUserResonance(lineIds, fingerprint) {
  if (!lineIds || lineIds.length === 0) return {};

  var { data, error } = await supabase
    .from('line_resonance')
    .select('line_id')
    .in('line_id', lineIds)
    .eq('fingerprint', fingerprint);

  if (error || !data) return {};

  data.forEach(function (r) {
    userResonated[r.line_id] = true;
  });
  return userResonated;
}

/**
 * Toggle resonance for a line.
 * Returns the new count.
 */
export async function toggleResonance(lineId, fingerprint) {
  if (userResonated[lineId]) {
    // Already resonated — remove it
    await supabase
      .from('line_resonance')
      .delete()
      .eq('line_id', lineId)
      .eq('fingerprint', fingerprint);

    delete userResonated[lineId];
    resonanceCache[lineId] = Math.max(0, (resonanceCache[lineId] || 1) - 1);
  } else {
    // Add resonance
    var { error } = await supabase
      .from('line_resonance')
      .insert([{ line_id: lineId, fingerprint: fingerprint }]);

    if (!error) {
      userResonated[lineId] = true;
      resonanceCache[lineId] = (resonanceCache[lineId] || 0) + 1;
    }
  }

  return resonanceCache[lineId] || 0;
}

/**
 * Get cached count for a line.
 */
export function getCount(lineId) {
  return resonanceCache[lineId] || 0;
}

/**
 * Check if user has resonated with a line.
 */
export function hasResonated(lineId) {
  return !!userResonated[lineId];
}
