import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  // Keeps the development indicator away from the header controls and the
  // account menu in the sidebar footer.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
