import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 這兩條是針對 React Compiler 的建議規則。本專案的用法是刻意的：
      // - 伺服器元件每次請求都重新渲染，讀取目前時間（Date.now）是預期行為
      // - 表單送出成功後重設畫面狀態、掛載後才開始計時（避免 hydration 不一致）
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
