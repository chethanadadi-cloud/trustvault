
import 'server-only';

import { createClient } from '@supabase/supabase-js';

function getStorageConfig() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;

    if (!url || !serviceKey || !bucket) {
        throw new Error(
            'Supabase Storage is not configured. Check the server environment variables.'
        );
    }

    return { url, serviceKey, bucket };
}

export function getSupabaseStorage() {
    const { url, serviceKey, bucket } = getStorageConfig();

    const supabase = createClient(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    return {
        supabase,
        bucket,
    };
}
