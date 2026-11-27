import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](?:react|react-dom|scheduler)(?:[\\/]|$)/,
              priority: 20,
            },
            {
              name: 'katex',
              test: /node_modules[\\/]katex(?:[\\/]|$)/,
              priority: 20,
            },
            {
              name: 'highlight',
              test: /node_modules[\\/]highlight\.js(?:[\\/]|$)/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
