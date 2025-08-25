import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    
    server: {
        host: '0.0.0.0', // Biar bisa diakses dari device lain
        port: 5173,
        cors: true,
        hmr: {
            host: '192.168.1.13', // <--- Ganti ini dengan IP kamu (en0)
            protocol: 'ws',
        },
    },
});
