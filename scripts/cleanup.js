import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unvbpxtairtkjqygxqhy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudmJweHRhaXJ0a2pxeWd4cWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE0MDAsImV4cCI6MjA4MzQ4NzQwMH0.F-57LAUyXvBr9acBKVettrrt0FXd9wwnw6X0TUYPp4Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
    console.log('--- Cleaning up all notebooks, sources, and messages for all accounts ---');

    // 1. Delete all notebooks
    // Since RLS might be on, deleting via Anon key might not work if it's set to 'authenticated' but we'll try.
    // Actually, if I don't have the service role key, I might need to do it via a different way if RLS blocks it.
    const { data, error } = await supabase
        .from('notebooks')
        .delete()
        .neq('id', '');

    if (error) {
        console.error('Error deleting notebooks:', error);
        if (error.code === '42501') {
            console.log('RLS blocked the deletion. Please ensure the Anon key has permission or use Service Role Key.');
        }
    } else {
        console.log('Successfully deleted all notebooks.');
    }

    // 2. Clear storage bucket
    try {
        const { data: files, error: listError } = await supabase.storage.from('notebook-sources').list();
        if (listError) throw listError;

        if (files && files.length > 0) {
            const filePaths = files.map(f => f.name);
            const { error: removeError } = await supabase.storage.from('notebook-sources').remove(filePaths);
            if (removeError) throw removeError;
            console.log(`Deleted ${files.length} files from storage.`);
        } else {
            console.log('No files found in storage.');
        }
    } catch (err) {
        console.error('Error cleaning storage:', err.message);
    }

    console.log('--- Cleanup process completed ---');
}

cleanup();
