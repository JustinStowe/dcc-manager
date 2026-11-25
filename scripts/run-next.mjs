// The parent uses --use-system-ca; also pass the setting to Next's workers.
// Run the installed CLI in this process so normal signals/arguments are retained.
process.env.NODE_USE_SYSTEM_CA ??= '1';
await import('../node_modules/next/dist/bin/next');
