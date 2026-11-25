import { readFileSync, writeFileSync } from 'node:fs';
// Prepare unapplied migration 018 only; deployed catalog changes need a new migration.
const catalogPath = new URL('../src/domain/third-floor-catalog.json', import.meta.url);
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const abilities = JSON.parse(readFileSync(new URL('../src/domain/ability-catalog.json', import.meta.url), 'utf8'));
const migration = new URL('../supabase/migrations/202611250018_third_floor_selection.sql', import.meta.url);
const text = readFileSync(migration, 'utf8');
writeFileSync(migration, text.replace(/\$selection_catalog\$[\s\S]*?\$selection_catalog\$/, () => `$selection_catalog$${JSON.stringify({ ...catalog, abilities: [...abilities, ...catalog.abilities] })}$selection_catalog$`));
