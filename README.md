# Potree Viewer with React

Potree.jsをReactアプリケーションに統合したポイントクラウド可視化ツールです。
Potreeを使ってmapと等高線(geojson)と点群(las)を表示します。

## インストール

```bash
bun install
```

## 使用方法

### 開発サーバーの起動

```bash
bun start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを表示します。

## 依存関係

- React 18+
- TypeScript
- Potree.js
- Three.js

## How to generate geojson from las

```bash
make gen
```
