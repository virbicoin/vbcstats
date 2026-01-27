# CLAUDE.md - VBC Stats Project Guide

このファイルはAIアシスタント（Claude）がこのコードベースを効果的に理解・操作するためのガイドです。

## プロジェクト概要

**VBC Stats** はVirBiCoin/GreenVibes Coin (GVBC)ブロックチェーンネットワークのリアルタイム統計ダッシュボードです。

### 技術スタック

- **フロントエンド**: Next.js 16, React 19, TypeScript 5.9
- **スタイリング**: Tailwind CSS 4.x
- **チャート**: Recharts, D3.js
- **マップ**: Leaflet, React-Leaflet
- **リアルタイム通信**: Primus (WebSocket)
- **バックエンド**: Express 5, Node.js
- **地理情報**: geoip-lite

## プロジェクト構造

```
vbcstats/
├── app/                        # Next.js App Router
│   ├── page.tsx                # メインダッシュボードページ
│   ├── layout.tsx              # ルートレイアウト
│   ├── providers.tsx           # React コンテキストプロバイダー
│   ├── globals.css             # グローバルスタイル
│   └── api/
│       └── geoip/route.ts      # GeoIP APIエンドポイント
├── components/                 # UIコンポーネント
│   ├── Charts.tsx              # チャートグリッド
│   ├── Nodes.tsx               # ノードテーブル
│   ├── Map.tsx                 # Leafletマップコンポーネント
│   ├── ChartCard.tsx           # D3.jsチャートカード
│   ├── StatCard.tsx            # 統計表示カード
│   ├── WorldMap.tsx            # ワールドマップ
│   ├── MinerBlocks.tsx         # マイナーブロック表示
│   ├── header.tsx              # ヘッダーコンポーネント
│   ├── footer.tsx              # フッターコンポーネント
│   └── layout.tsx              # 共通レイアウト
├── types/                      # TypeScript型定義
│   ├── stats.ts                # 統計関連の型
│   ├── icons.ts                # アイコン型
│   ├── primus-client.d.ts      # Primus型定義
│   └── server.d.ts             # サーバー型定義
├── lib/                        # サーバーサイドライブラリ（CommonJS）
│   ├── express.js              # Expressアプリ設定
│   ├── collection.js           # ノードコレクション管理
│   ├── history.js              # ブロック履歴管理
│   └── utils/
│       └── config.js           # サーバー設定
└── server-simple.js            # WebSocketサーバー（Primus）
```

## 開発コマンド

```bash
# 開発サーバー起動（フロントエンド + WebSocketサーバー）
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# リント & 型チェック
npm run check

# コードフォーマット
npm run format
```

## 環境変数

`.env`ファイルで設定（`.gitignore`に含まれています）：

```env
PORT=3000              # Next.jsポート
PORT_SERVER=4000       # WebSocketサーバーポート
WS_SECRET=xxx          # WebSocket認証シークレット（複数可：xxx|yyy|zzz）
NEXT_PUBLIC_WS_URL=wss://example.com  # クライアント用WebSocket URL
```

## 重要な実装パターン

### 1. WebSocket通信（Primus）

サーバーは3つのPrimusエンドポイントを公開：
- `/primus` - クライアント（ブラウザ）向け
- `/external` - 外部サービス向け
- `/api` - ノード（マイナー）からのデータ受信

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

### 3. ResponsiveContainerの使用

Rechartsの`ResponsiveContainer`には必ず`minWidth`と`minHeight`を指定：

```tsx
<ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
  <LineChart data={data}>...</LineChart>
</ResponsiveContainer>
```

### 4. リアルタイムデータの安定化

ブロック更新時のUI点滅を防ぐため、`stable*`状態変数パターンを使用：

```typescript
const [stableValue, setStableValue] = useState<number | null>(null);

useEffect(() => {
  if (newValue !== null && typeof newValue === 'number') {
    setStableValue(newValue);
  }
}, [newValue]);
```

## セキュリティ考慮事項

### 確認済みの対策

1. **環境変数**: `.env*`ファイルは`.gitignore`に含まれ、シークレットはリポジトリに含まれない
2. **入力検証**: GeoIP APIでIPアドレス形式を検証
3. **プライベートIP除外**: プライベートIPアドレスはGeoIPルックアップから除外
4. **CORS設定**: Express側でCORS有効化

### 注意が必要な箇所

1. **WS_SECRET**: WebSocket認証用シークレットは適切に管理すること
2. **X-Forwarded-For**: プロキシ経由のIP取得時にスプーフィング可能性あり
3. **依存関係**: `npm audit`で定期的にチェックを実行すること

## テスト

現在、自動テストは未実装。手動テスト手順：

1. `npm run dev`でサーバー起動
2. ブラウザで`http://localhost:3000`にアクセス
3. ノードが接続され、リアルタイムデータが表示されることを確認

## トラブルシューティング

### よくある問題

1. **チャートが表示されない**: `ResponsiveContainer`の親要素に高さが設定されているか確認
2. **WebSocket接続エラー**: `NEXT_PUBLIC_WS_URL`が正しいか確認
3. **GeoIPデータなし**: `npm run build`でGeoIPデータがコピーされているか確認
4. **Latencyが0ms**: サーバーの`node-ping`/`latency`イベントハンドラを確認（gethは文字列でlatencyを送信）
5. **Total Difficultyが表示されない**: gethは`totalDiff`フィールド名で文字列として送信するため、適切なマッピングと型変換が必要
6. **マップでブロック番号が"0"**: ブロックデータが未受信のノードは`block !== undefined && block > 0`でフィルタリング

## 関連リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [Recharts Documentation](https://recharts.org/)
- [Primus Documentation](https://github.com/primus/primus)
- [Leaflet Documentation](https://leafletjs.com/)
- [eth-netstats-client (geth)](https://github.com/ethereum/go-ethereum/tree/master/cmd/geth)
