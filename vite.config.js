import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 3000,
        open: true,
    },
    build: {
        target: "es2020",
        outDir: "dist",
        assetsDir: "assets",
        sourcemap: false,
        // minify: "terser",
        rollupOptions: {
            output: {
                format: "es", 
                manualChunks: {
                    pixi: ["pixi.js"],
                },
            },
        },
    },
    base: "./", 
    resolve: {
        extensions: [".js", ".ts"],
    },
});
