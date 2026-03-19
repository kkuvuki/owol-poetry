/**
 * Shared Supabase client — single instance for the entire site.
 * Used by both relentlessly-human.js and Teaser.astro.
 */

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://jebbvyeenafpjrdhneoi.supabase.co',
  'sb_publishable_fM_rNj8c0L8gSlc1IuXwIA_466dQW4x'
);
