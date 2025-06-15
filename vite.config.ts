import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/data': {
        target: 'https://data.baseball.computer',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/data/, '')
      }
    }
  },
	plugins: [tailwindcss(), sveltekit()]
});
