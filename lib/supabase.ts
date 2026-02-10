
import { createClient } from '@supabase/supabase-js';

/**
 * REMPLACEZ CES VALEURS PAR VOS PROPRES CLÉS SUPABASE.
 * Allez dans votre Dashboard Supabase -> Project Settings -> API
 */
const supabaseUrl = 'https://zhmrcmrfcztvfnndrowx.supabase.co'; // Remplacez par votre URL réelle
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXJjbXJmY3p0dmZubmRyb3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODYxOTksImV4cCI6MjA4NTM2MjE5OX0.5foS3Npv1azsbDdD5K1sBGsRJtYHTs0XdbQqgJ9XyzE';      // Remplacez par votre clé réelle

// Fonction de validation pour éviter l'erreur "Invalid URL" au démarrage
const isValidSupabaseConfig = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('supabase.co') || parsed.hostname.endsWith('supabase.net');
  } catch {
    return false;
  }
};

// Si l'URL est invalide, on exporte un proxy "factice" pour éviter de faire planter l'application
// Cela permet de continuer à voir l'interface même si la DB n'est pas encore connectée.
export const supabase = isValidSupabaseConfig(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'from') {
          return () => ({
            select: () => ({
              limit: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase URL non configurée' } }) }),
              neq: () => Promise.resolve({ data: [], error: null }),
              eq: () => Promise.resolve({ data: [], error: null })
            }),
            insert: () => Promise.resolve({ error: { message: 'Supabase non configurée' } }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) }),
            upsert: () => Promise.resolve({ error: null })
          });
        }
        return () => {};
      }
    });

// Fix: Cast supabaseAnonKey to string to avoid TypeScript error about literal non-overlap when checking against placeholder
export const isSupabaseConfigured = isValidSupabaseConfig(supabaseUrl) && (supabaseAnonKey as string) !== 'VOTRE_SUPABASE_ANON_KEY';
