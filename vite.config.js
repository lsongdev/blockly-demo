import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: { editor: 'index.html', firmware: 'firmware.html' },
    },
  },
});
