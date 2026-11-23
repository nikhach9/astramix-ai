/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT !== "false";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracing: false,
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: false,
        images: { unoptimized: true },
      }
    : {
        async rewrites() {
          return [
            { source: "/predict.php", destination: "/predict" },
            { source: "/optimize.php", destination: "/optimize" },
            { source: "/report.php", destination: "/report" },
            { source: "/mix-lab.php", destination: "/mix-lab" },
            { source: "/materials-market.php", destination: "/materials-market" },
          ];
        },
      }),
};

module.exports = nextConfig;

