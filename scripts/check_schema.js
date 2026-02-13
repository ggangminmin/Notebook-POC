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

async function checkColumns() {
    console.log('--- Checking Notebooks Table Columns ---');

    // Try to query directly
    const { data, error } = await supabase.from('notebooks').select('*').limit(1);

    if (error) {
        console.log('Error querying table:', error.message);
        if (error.message.includes('ownerId')) {
            console.log('CONFIRMED: ownerId column is missing or misnamed.');
        }
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('Table is empty, trying to find columns via dummy insert...');
        const { error: insertError } = await supabase.from('notebooks').insert({ id: 'test-schema-' + Date.now(), title: 'Test' });
        console.log('Insert error hints:', insertError?.message);
    }
}

checkColumns();
