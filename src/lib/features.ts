import "server-only";

export function videoUploadEnabled(): boolean {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_API_TOKEN);
}
