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

async function checkMessagesColumns() {
    console.log('--- Checking Messages Table Columns ---');
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    if (error) {
        console.log('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('Table empty');
    }
}

checkMessagesColumns();
