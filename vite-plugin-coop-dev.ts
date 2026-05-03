import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';

type Next = (err?: unknown) => void;

/** Firebase Auth popup uses popup.closed; COOP must be unsafe-none on localhost for that to work in Chrome. */
function coopMiddleware() {
  return (_req: IncomingMessage, res: ServerResponse, next: Next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  };
}

export function vitePluginCoopDev(): Plugin {
  return {
    name: 'vite-plugin-coop-dev',
    configureServer(server) {
      return () => {
        server.middlewares.use(coopMiddleware());
      };
    },
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use(coopMiddleware());
      };
    },
  };
}
