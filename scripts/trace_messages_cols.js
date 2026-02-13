import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('c:/Users/AIWEB/OneDrive - 지피티코리아/바탕 화면/활용/notebooklm copy/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function testCols() {
    const table = 'messages';
    const cols = ['id', 'notebook_id', 'user_id', 'role', 'content', 'timestamp', 'all_sources', 'allSources', 'metadata', 'data'];
    for (const col of cols) {
        const { error } = await supabase.from(table).select(col).limit(1);
        if (!error) console.log(`✅ ${col}`);
        else console.log(`❌ ${col} (${error.message})`);
    }
}

testCols();
