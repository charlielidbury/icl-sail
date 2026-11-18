import type { NextConfig } from "next";

// What src/schedule-pdf/render.ts reads from disk to make schedule PDFs.
const schedulePdfFiles = ["./scripts/schedule.typ", "./src/schedule-pdf/fonts/*.ttf"];

const nextConfig: NextConfig = {
    /* config options here */
    experimental: {
        optimizePackageImports: ["@chakra-ui/react"],
    },
    // The Typst compiler is a native addon: load it from node_modules at run
    // time rather than bundling it.
    serverExternalPackages: ["@myriaddreamin/typst-ts-node-compiler"],
    // Ship the template and fonts with the routes that render PDFs.
    outputFileTracingIncludes: {
        "/schedule.pdf": schedulePdfFiles,
        "/scheduler/pdf": schedulePdfFiles,
    },
    //   eslint: {
    //     ignoreDuringBuilds: true,
    //   }
};

export default nextConfig;
