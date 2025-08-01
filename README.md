# Potree Viewer with React

このプロジェクトは、Potree.jsをReactアプリケーションに統合したポイントクラウド可視化ツールです。

## 特徴

- **React統合**: Potree.jsをReactコンポーネントとして使用
- **TypeScript対応**: 型安全性を提供
- **カスタムフック**: usePotreeフックで状態管理を簡素化
- **レスポンシブ**: 動的にサイズ調整可能

## インストール

```bash
npm install
```

## 使用方法

### 開発サーバーの起動

```bash
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを表示します。

### 基本的なコンポーネントの使用

```tsx
import PotreeViewer from './components/PotreeViewer';

function App() {
  return (
    <PotreeViewer 
      pointCloudUrl="your-point-cloud-url"
      width={800}
      height={600}
    />
  );
}
```

### カスタムフックの使用

```tsx
import { usePotree } from './hooks/usePotree';

function CustomViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { potree, isLoading, error } = usePotree(containerRef.current, {
    pointBudget: 2_000_000,
    edlEnabled: true,
    background: 'gradient'
  });

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <div ref={containerRef} style={{ width: '800px', height: '600px' }} />
    </div>
  );
}
```

## API

### PotreeViewer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| pointCloudUrl | string | undefined | ポイントクラウドデータのURL |
| width | number | 800 | ビューアの幅 |
| height | number | 600 | ビューアの高さ |
| className | string | undefined | CSSクラス名 |

### usePotree Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| pointBudget | number | 1,000,000 | レンダリングするポイント数の予算 |
| edlEnabled | boolean | true | Eye Dome Lightingの有効/無効 |
| background | string | 'gradient' | 背景タイプ ('gradient', 'skybox', 'solid') |
| fov | number | 60 | カメラの視野角 |

## 利用可能なスクリプト

### `npm test`

テストランナーをインタラクティブウォッチモードで起動します。

### `npm run build`

本番用にアプリを`build`フォルダにビルドします。

## 依存関係

- React 18+
- TypeScript
- Potree.js
- Three.js

## Learn More

[Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started) と [React documentation](https://reactjs.org/) で詳細を学ぶことができます。
