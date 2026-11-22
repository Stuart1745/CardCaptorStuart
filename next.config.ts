import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // The archetypes API reads precomputed 17Lands public-dataset stats and MTGJSON pack contents from disk at
  // request time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    '/api/archetypes': ['./data/limited-stats/**/*.json', './data/pack-contents/**/*.json'],
  },
};

export default nextConfig;
