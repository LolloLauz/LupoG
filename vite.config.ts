import { defineConfig, type Plugin } from "vite";

/**
 * Plugin per la "modalità giocatore".
 * Un browser blocca i <script type="module"> aperti con doppio clic (file://).
 * Dopo la build trasformiamo quindi lo script in uno script classico "defer"
 * (il bundle è già in formato IIFE), così index.html funziona senza server.
 */
function fileProtocolCompatibility(): Plugin {
  return {
    name: "iron-and-shadow-file-protocol",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html: string): string {
      return html
        .replace(
          /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
          '<script defer src="$1"></script>'
        )
        .replace(/<link rel="stylesheet" crossorigin /g, '<link rel="stylesheet" ');
    },
  };
}

export default defineConfig({
  // Percorsi relativi: necessari per aprire dist/index.html da cartella locale.
  base: "./",
  plugins: [fileProtocolCompatibility()],
  build: {
    outDir: "dist",
    target: "es2020",
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        entryFileNames: "assets/game.js",
        assetFileNames: "assets/[name][extname]",
        inlineDynamicImports: true,
      },
    },
  },
});
