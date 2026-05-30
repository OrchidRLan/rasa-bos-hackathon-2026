import type { NextConfig } from "next";

// Backend ports:
//   FastAPI REST  → localhost:8080  (/api/*, /worker/*)
//   Rasa CALM     → localhost:5005  (/webhooks/*)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";
const RASA_BASE = process.env.NEXT_PUBLIC_RASA_BASE ?? "http://localhost:5005";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*",      destination: `${API_BASE}/api/:path*` },
      { source: "/worker/:path*",   destination: `${API_BASE}/worker/:path*` },
      { source: "/webhooks/:path*", destination: `${RASA_BASE}/webhooks/:path*` },
    ];
  },
};

export default nextConfig;
