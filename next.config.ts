import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // The archetypes API reads precomputed 17Lands public-dataset stats from disk at
  // request time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    '/api/archetypes': ['./data/limited-stats/**/*.json'],
  },
};

export default nextConfig;
