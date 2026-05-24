# CLAUDE.md - VBC Stats Project Guide

このファイルはAIアシスタント（Claude）がこのコードベースを効果的に理解・操作するためのガイドです。

## プロジェクト概要

**VBC Stats** はVirBiCoin/GreenVibes Coin (GVBC)ブロックチェーンネットワークのリアルタイム統計ダッシュボードです。

### 技術スタック

- **フロントエンド**: Next.js 16.2, React 19.2, TypeScript 6.0
- **スタイリング**: Tailwind CSS 4.x
- **チャート**: Recharts
- **マップ**: Leaflet, React-Leaflet
- **リアルタイム通信**: Primus 8 (WebSocket)
- **バックエンド**: Express 5, Node.js 20+
- **地理情報**: geoip-lite
- **ランタイム**: tsx（TypeScript直接実行）

## プロジェクト構造

```
vbcstats/
├── app/                        # Next.js App Router（ルーティングのみ）
│   ├── page.tsx                # メインダッシュボードページ
│   ├── layout.tsx              # ルートレイアウト
│   ├── globals.css             # グローバルスタイル
│   └── api/
│       └── geoip/route.ts      # GeoIP APIエンドポイント
├── components/                 # UIコンポーネント
│   ├── Charts.tsx              # チャートグリッド（Recharts）
│   ├── Nodes.tsx               # ノードテーブル
│   ├── Map.tsx                 # Leafletマップコンポーネント
│   ├── header.tsx              # ヘッダー
│   └── footer.tsx              # フッター
├── types/                      # TypeScript型定義
│   └── server.d.ts             # Primus等のambient型宣言
├── lib/                        # サーバーサイドライブラリ（TypeScript）
│   ├── express.ts              # Expressアプリ設定
│   ├── collection.ts           # ノードコレクション管理
│   └── utils/
│       └── config.ts           # サーバー設定（banned/reserved）
├── server.ts                   # 統合サーバー（Next.js + Primus）
├── public/                     # 静的ファイル
├── tsconfig.json               # フロントエンド用（paths: @/* → ./*）
└── tsconfig.server.json        # サーバー用（module: nodenext）
```

## 開発コマンド

```bash
# 開発サーバー起動（Next.js + WebSocketを単一ポートで統合）
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# リント & 型チェック & フォーマット確認
npm run check

# コードフォーマット
npm run format
```

## 環境変数

`.env`ファイルで設定（`.gitignore`に含まれています）：

```env
PORT=5000              # 統合サーバーポート（Next.js + WebSocket）
WS_SECRET=xxx          # WebSocket認証シークレット（複数可：xxx|yyy|zzz）
NEXT_PUBLIC_WS_URL=    # クライアント用WebSocket URL（省略時は同一オリジン）
```

## 重要な実装パターン

### 1. 統合サーバーアーキテクチャ

`server.ts`が単一ポートでNext.jsとPrimus WebSocketを同時に提供：
- `/primus` - クライアント（ブラウザ）向けWebSocket
- `/external` - 外部サービス向けWebSocket
- `/api` - ノード（マイナー）からのデータ受信WebSocket
- その他全て - Next.js App Router

### 2. eth-netstats-client (geth) 互換性

geth/gvbcノードからのデータ通信プロトコル：

**Latency計測フロー:**
1. クライアント → サーバー: `node-ping` with `{id, clientTime}`
2. サーバー → クライアント: `node-pong` with `{clientTime, serverTime}`
3. クライアント → サーバー: `latency` with `{id, latency}` (RTT計算結果、文字列)

**Blockデータ:**
- gethは`difficulty`と`totalDiff`を**文字列**として送信
- `totalDiff`フィールドを`totalDifficulty`にマッピング
- 受信時に`parseInt()`で数値に変換

### 3. 数値の型安全性

`toFixed()`などのメソッド呼び出し前に必ず型チェックを行う：

```typescript
// ✅ 正しい
if (typeof value === 'number' && !isNaN(value)) {
  return value.toFixed(2);
}
return 'N/A';

// ❌ 危険
return value.toFixed(2); // valueがundefinedや文字列の場合エラー
```

### 4. ResponsiveContainerの使用

Rechartsの`ResponsiveContainer`には必ず`minWidth`と`minHeight`を指定：

```tsx
<ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
  <LineChart data={data}>...</LineChart>
</ResponsiveContainer>
```

### 5. リアルタイムデータの安定化

ブロック更新時のUI点滅を防ぐため、`stable*`状態変数パターンを使用：

```typescript
const [stableValue, setStableValue] = useState<number | null>(null);

useEffect(() => {
  if (newValue !== null && typeof newValue === 'number') {
    setStableValue(newValue);
  }
}, [newValue]);
```

### 6. パスエイリアス

- `tsconfig.json`: `"@/*": ["./*"]` — プロジェクトルートからの解決
- Next.js Turbopackは`tsconfig.json`のpathsを自動的に読み取る（`resolveAlias`不要）
- TypeScript 6.0では`baseUrl`は非推奨（使用しない）

## セキュリティ

### 確認済みの対策

1. **環境変数**: `.env*`ファイルは`.gitignore`に含まれ、シークレットはリポジトリに含まれない
2. **WS認証**: APIノード接続時にWS_SECRETで認証チェック
3. **入力検証**: GeoIP APIでIPアドレス形式をバリデーション（IPv4正規表現）
4. **プライベートIP除外**: プライベートIPアドレスはGeoIPルックアップから除外
5. **接続レート制限**: API接続数を制限（C_LIMIT=5/30秒）
6. **BAN機能**: `banned`リストでIPベースのブロック対応
7. **認証チェック**: 全てのAPIイベントハンドラで`spark.auth`を確認

### 既知の事項

1. **postcss脆弱性（moderate）**: Next.js内部のpostcssにXSS可能性 — Next.js更新待ち
2. **CORS**: Express側がワイドオープンだが、Next.jsが全リクエストを処理するため実質影響なし
3. **X-Forwarded-For**: プロキシ経由のIP取得時にスプーフィング可能性あり

## テスト

現在、自動テストは未実装。手動テスト手順：

1. `npm run dev`でサーバー起動
2. ブラウザで`http://localhost:5000`にアクセス
3. ノードが接続され、リアルタイムデータが表示されることを確認

## トラブルシューティング

### よくある問題

1. **チャートが表示されない**: `ResponsiveContainer`の親要素に高さが設定されているか確認
2. **WebSocket接続エラー**: ブラウザと同一ポートで動作するため、通常は設定不要
3. **GeoIPデータなし**: `npm run build`でGeoIPデータがコピーされているか確認
4. **Latencyが0ms**: gethは文字列でlatencyを送信するため型変換を確認
5. **Total Difficultyが表示されない**: gethは`totalDiff`フィールド名で文字列として送信
6. **マップでブロック番号が"0"**: `block !== undefined && block > 0`でフィルタリング
7. **モジュール解決エラー**: `.next`を削除してブラウザをハードリフレッシュ（Ctrl+Shift+R）

## 関連リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [Recharts Documentation](https://recharts.org/)
- [Primus Documentation](https://github.com/primus/primus)
- [Leaflet Documentation](https://leafletjs.com/)
- [eth-netstats-client (geth)](https://github.com/ethereum/go-ethereum/tree/master/cmd/geth)
