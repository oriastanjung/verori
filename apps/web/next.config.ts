import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  // The development overlay renders a full-screen portal that swallows clicks
  // in the top right corner, which is where the theme toggle lives. Compile and
  // runtime errors still surface without the indicator.
  devIndicators: false,
};

export default nextConfig;
