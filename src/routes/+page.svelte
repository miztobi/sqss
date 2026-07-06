<script lang="ts">
	import { auth } from '$lib/firebase';
	import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
	import { userStore } from '$lib/store';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let isRegistering = $state(false);
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	let user = $state({ uid: null, loading: true });
	userStore.subscribe((val) => {
		user = val as any;
		if (user.uid && !user.loading) {
			goto('/dashboard');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email || !password) return;

		isSubmitting = true;
		errorMessage = '';

		try {
			if (isRegistering) {
				await createUserWithEmailAndPassword(auth, email, password);
			} else {
				await signInWithEmailAndPassword(auth, email, password);
			}
			goto('/dashboard');
		} catch (error: any) {
			console.error(error);
			if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
				errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
			} else if (error.code === 'auth/email-already-in-use') {
				errorMessage = 'このメールアドレスは既に登録されています。';
			} else {
				errorMessage = 'エラーが発生しました。しばらく経ってから再度お試しください。';
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function handleMockLogin() {
		// Mock login with a dummy user for convenient testing
		isSubmitting = true;
		errorMessage = '';
		try {
			// Try to login mock user, if not exists, register first
			const mockEmail = 'test@example.com';
			const mockPassword = 'password123';
			try {
				await signInWithEmailAndPassword(auth, mockEmail, mockPassword);
			} catch (e: any) {
				if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
					await createUserWithEmailAndPassword(auth, mockEmail, mockPassword);
				} else {
					throw e;
				}
			}
			goto('/dashboard');
		} catch (error: any) {
			console.error('Mock login error:', error);
			errorMessage =
				'テストユーザーでのログインに失敗しました。エミュレータを起動しているか確認してください。';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex-grow flex flex-col items-center justify-center py-12 px-6">
	<div
		class="max-w-4xl w-full flex flex-col md:flex-row items-center md:items-stretch gap-12 md:gap-16"
	>
		<!-- Left: Marketing/Intro -->
		<div class="flex-1 flex flex-col justify-center text-left space-y-8">
			<div class="space-y-4">
				<div class="text-xs tracking-[0.3em] font-serif text-brass-dark dark:text-brass-light uppercase">
					AI-Driven Study Platform
				</div>
				<h1
					class="text-4xl md:text-5xl font-serif font-black tracking-wider leading-tight text-text-light dark:text-text-dark"
				>
					構造的学習で<br />
					<span class="text-brass">建築士合格</span>へ。
				</h1>
			</div>

			<p class="text-sm font-light leading-relaxed text-gray-500 dark:text-gray-400">
				SQSSは、単なる進捗管理アプリではありません。 日々の「朝夕10問」過去問演習から、AIがあなたの「脳内知識マップ」を可視化。
				夜の特訓では、蓄積された正誤ログからGeminiがあなたの「知識のバグ（類似概念の混同）」を自動プロファイリングし、ピンポイントで読むべき法令集のページや対策方法を処方します。
			</p>

			<div class="border-l border-brass pl-6 py-2 space-y-2">
				<div class="text-xs text-gray-400 dark:text-gray-500">特徴</div>
				<ul class="text-xs font-light space-y-2 text-text-light dark:text-text-dark">
					<li>・ 毎朝夕10問ずつの爆速片手タップUI</li>
					<li>・ Geminiによるリアルタイム混同判定プロファイリング</li>
					<li>・ 予想点数メーター＆戦闘マップによるゲーミフィケーション</li>
					<li>・ 将来のUGCプラットフォームを見据えた疎結合アーキテクチャ</li>
				</ul>
			</div>
		</div>

		<!-- Right: Form / Login -->
		<div
			class="w-full md:w-[380px] bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col justify-between shadow-lg transition-colors duration-300"
		>
			<div class="space-y-6">
				<h2
					class="text-lg font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase border-b border-gray-100 dark:border-gray-800 pb-4"
				>
					{isRegistering ? 'アカウント作成' : 'サインイン'}
				</h2>

				{#if errorMessage}
					<div
						class="p-3 text-xs bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded"
					>
						{errorMessage}
					</div>
				{/if}

				<form onsubmit={handleSubmit} class="space-y-4">
					<div class="space-y-1.5">
						<label for="email" class="text-[10px] tracking-widest text-gray-400 uppercase"
							>メールアドレス</label
						>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							placeholder="architect@example.com"
							class="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 focus:border-brass dark:focus:border-brass outline-none rounded text-text-light dark:text-text-dark transition-all duration-300"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="password" class="text-[10px] tracking-widest text-gray-400 uppercase"
							>パスワード</label
						>
						<input
							type="password"
							id="password"
							bind:value={password}
							required
							placeholder="••••••••"
							class="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 focus:border-brass dark:focus:border-brass outline-none rounded text-text-light dark:text-text-dark transition-all duration-300"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full py-2.5 mt-2 bg-brass hover:bg-brass-dark text-white text-sm tracking-widest font-bold rounded transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
					>
						{isSubmitting ? '処理中...' : isRegistering ? '登録' : 'サインイン'}
					</button>
				</form>

				<div class="flex items-center justify-between text-xs font-light text-gray-400">
					<span>
						{isRegistering ? '既にアカウントをお持ちですか？' : 'アカウントが未登録ですか？'}
					</span>
					<button
						type="button"
						onclick={() => {
							isRegistering = !isRegistering;
							errorMessage = '';
						}}
						class="text-brass hover:underline outline-none"
					>
						{isRegistering ? 'サインインへ' : '新規登録へ'}
					</button>
				</div>
			</div>

			<!-- Divider -->
			<div class="relative flex py-4 items-center">
				<div class="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
				<span class="flex-shrink mx-4 text-[10px] text-gray-400 tracking-widest uppercase">OR</span>
				<div class="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
			</div>

			<!-- Mock Login button for quick local testing -->
			<button
				type="button"
				onclick={handleMockLogin}
				disabled={isSubmitting}
				class="w-full py-2.5 border border-dashed border-brass/50 text-brass hover:border-brass hover:bg-brass/5 dark:hover:bg-brass/10 text-xs tracking-widest font-light rounded transition-all duration-300"
			>
				テスト用ダミーユーザーでログイン
			</button>
		</div>
	</div>
</div>
