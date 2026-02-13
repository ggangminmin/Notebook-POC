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

async function findOwnerColumn() {
    const possibleColumns = ['ownerId', 'owner_id', 'ownerid', 'user_id', 'userid'];
    console.log('--- Testing possible owner columns ---');

    for (const col of possibleColumns) {
        const { error } = await supabase.from('notebooks').select(col).limit(1);
        if (!error) {
            console.log(`✅ FOUND: column "${col}" exists!`);
        } else {
            console.log(`❌ FAILED: column "${col}" does not exist. (Error: ${error.message})`);
        }
    }
}

findOwnerColumn();
