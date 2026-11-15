import type { MetadataRoute } from "next";
import { SITE_DESC, SITE_NAME } from "@/lib/constants";

// PWA：可加到手機主畫面
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}｜鍬形蟲・兜蟲・金龜`,
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "zh-Hant-TW",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "發表文章", url: "/posts/new" },
      { name: "交易", url: "/market" },
      { name: "飼育紀錄", url: "/breeding" },
    ],
  };
}
