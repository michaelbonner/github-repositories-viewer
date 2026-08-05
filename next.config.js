/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle so the Docker image can ship just the
  // traced dependencies instead of the whole node_modules tree. See Dockerfile.
  output: "standalone",
}

module.exports = nextConfig
