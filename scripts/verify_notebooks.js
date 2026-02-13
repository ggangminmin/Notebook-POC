import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually
const envPath = path.resolve('c:/Users/AIWEB/OneDrive - 지피티코리아/바탕 화면/활용/notebooklm copy/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('--- Verifying Notebooks in Supabase ---');
    const { data, error } = await supabase.from('notebooks').select('*');
    if (error) {
        console.error('Error fetching notebooks:', error);
    } else {
        console.log(`Found ${data.length} notebooks.`);
        if (data.length > 0) {
            console.log('First notebook keys:', Object.keys(data[0]));
            data.forEach(nb => {
                // Try to find owner id column
                const ownerIdValue = nb.ownerId || nb.owner_id || nb.ownerid;
                console.log(`- [${nb.id}] ${nb.title} (Owner: ${ownerIdValue})`);
            });
        }
    }
}

verify();
