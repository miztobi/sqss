# フェーズ0 開発 Issueリスト（AI指示用）

## Epic 1: プロジェクト基盤・インフラ層の構築
- [ ] Issue 1-1: SvelteKitプロジェクトの初期化とTailwind CSSの導入
  - SvelteKitのスケルトンプロジェクトを作成する。
  - Tailwind CSSをインストールし、設定ファイルを構築する。
  - トップページのルーティングが正常に表示されるか動作確認を行う。
- [ ] Issue 1-2: PWA設定とService Workerの基本実装
  - `vite-plugin-pwa` 等を用いてPWA化の設定を行う。
  - マニフェストファイルを作成し、Safari/Chromeでのホーム画面追加に対応する。
  - Service Workerの登録処理を記述し、Push通知の土台を作る。
- [ ] Issue 1-3: Firebase App Hosting デプロイ環境の準備
  - Firebaseプロジェクトを作成し、CLIでApp Hostingの初期設定を行う。
  - 必要な環境変数（Gemini APIキー、Stripeテストキー等）を設定する。
  - ローカルのSvelteKit環境からFirebase Emulator（Auth/Firestore）への接続設定を行う。

## Epic 2: データモデリング・認証層の実装
- [ ] Issue 2-1: Firebase Authenticationの統合
  - メール/パスワード認証およびGoogle認証のUIとロジックを実装する。
  - ログイン・ログアウト機能の正常動作を確認する。
- [ ] Issue 2-2: Firestoreの疎結合スキーマ構築（初期設定）
  - `users` および `goals` コレクションのアクセスルール（Security Rules）を構築する。
  - > { "goalId": "1kyu_kenchikushi" } 等のデータ型定義（TypeScriptのインターフェース）を作成する。
- [ ] Issue 2-3: 初期マスターデータの投入スクリプト作成
  - 1級・2級建築士のダミー過去問データおよびコラムデータを、Firestoreの `goals/{goalId}/past_questions` へ一括登録する初期化スクリプトを実装する。

## Epic 3: バックエンド・API層（SvelteKit API Routes）
- [ ] Issue 3-1: 正誤ログ（カウンター）インクリメントAPIの実装
  - フロントエンドから送られたタグや問題IDを元に、Firestoreの `totalAttempted`, `totalCorrect`, `totalIncorrect` 等を `FieldValue.increment(1)` で更新する `+server.ts` を作成する。
- [ ] Issue 3-2: Gemini API連携によるリアルタイムプロファイリングAPI
  - ユーザーの正誤ログを取得し、Gemini APIへ送信して「知識のバグ（混同）」を判定させるサーバーサイド処理を実装する。
  - JSON構造化出力で、AIから診断テキストと推奨タグが返ってくるようにプロンプトを調整・テストする。
- [ ] Issue 3-3: Stripe決済（テスト環境）APIの実装
  - Stripe SDKを導入し、月額980円プランのチェックアウトセッション（テスト用）を発行するAPIを作成する。
  - カスタマーポータルへのリダイレクト処理を実装する。

## Epic 4: UI・フロントエンド層の構築
- [ ] Issue 4-1: ダッシュボード画面のUI実装
  - 想定点数メーター、今週のノルマ達成度バー（Progressタグ）をコンポーネント化する。
  - CSS Gridを用いて、単元別・戦闘マップ（ツリーマップ風）のUIを描画する（緑・赤・グレーの動的色分け）。
- [ ] Issue 4-2: 過去問演習・一問一答画面の実装
  - 朝夕10問をクエリ抽出して表示する片手タップUIを作成する。
  - 解答の中断時にローカル（localStorage等）へ一時保存する機能を実装する。
- [ ] Issue 4-3: 夜の30分・AI処方特訓画面の実装
  - 勉強強度（15分/30分/60分）を選択するタイマーUIを作成する。
  - Issue 3-2のAPIから返却された診断テキストの表示領域と、確認用一問一答テスト（5〜10問）の表示UIを実装する。
- [ ] Issue 4-4: 過去ログ確認画面と体験談投稿フォーム
  - 週次の総括レポートや、過去のコラムアーカイブを一覧表示する画面を作成する。
  - 予備校併用などのタグを選択できる体験談投稿フォーム（日曜日のコラム生成用）を作成する。