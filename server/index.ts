import { createApp, log } from "./app";

(async () => {
  const isProduction = process.env.NODE_ENV === "production";
  const { app, httpServer } = await createApp({ withStatic: isProduction });

  // Only setup Vite dev server in development so it doesn't interfere with other routes
  if (!isProduction) {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
