import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        // 除外設定
        ignores: [
            "lib/**/*",  // lib ディレクトリ全体を除外
            "backup/**/*", // backup ディレクトリも除外
            "server.js", // サーバーファイルも除外
            "bin/**/*"   // bin ディレクトリも除外
        ]
    },
    {
        // Node.js ファイル用の設定（CommonJS を許可）
        files: ["server.js", "lib/**/*.js", "bin/**/*"],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-vars": "off"
        }
    }
];

export default eslintConfig;
