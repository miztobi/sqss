<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { doc, getDoc, updateDoc } from 'firebase/firestore';
	import type { UserGoal } from '$lib/types';

	let user = $state({ uid: null, planStatus: 'free', loading: true });
	let userGoal = $state<UserGoal | null>(null);
	let loadingData = $state(true);

	let intensity = $state(30);
	let targetGoalId = $state('1kyu_kenchikushi');
	let morningTime = $state('07:00');
	let afternoonTime = $state('12:00');
	let questionCount = $state(10);
	let isSaving = $state(false);
	let saveMessage = $state('');
	let billingRedirecting = $state(false);

	userStore.subscribe((val) => {
		user = val as any;
	});

	let hasLoaded = false;

	$effect(() => {
		if (user.uid && !hasLoaded) {
			hasLoaded = true;
			loadSettingsData();
		}
	});

	async function loadSettingsData() {
		try {
			const userGoalSnap = await getDoc(
				doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi`)
			);
			if (userGoalSnap.exists()) {
				userGoal = userGoalSnap.data() as UserGoal;
				intensity = userGoal.intensityPreference;
				targetGoalId = userGoal.goalId;
				morningTime = userGoal.morningNotificationTime || '07:00';
				afternoonTime = userGoal.afternoonNotificationTime || '12:00';
				questionCount = userGoal.questionCountPerSession || 10;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loadingData = false;
		}
	}

	async function handleSaveSettings() {
		if (!user.uid || !userGoal) return;
		isSaving = true;
		saveMessage = '';
		try {
			const ref = doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi`);
			await updateDoc(ref, {
				intensityPreference: intensity,
				goalId: targetGoalId,
				morningNotificationTime: morningTime,
				afternoonNotificationTime: afternoonTime,
				questionCountPerSession: questionCount
			});
			saveMessage = '設定を保存しました';
			setTimeout(() => {
				saveMessage = '';
			}, 3000);
		} catch (e) {
			console.error(e);
			saveMessage = '設定の保存に失敗しました';
		} finally {
			isSaving = false;
		}
	}

	async function handleUpgrade() {
		billingRedirecting = true;
		try {
			const res = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: user.uid, planType: '1_year_pass' })
			});
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				alert('決済の開始に失敗しました。');
			}
		} catch (e) {
			console.error(e);
			alert('エラーが発生しました。');
		} finally {
			billingRedirecting = false;
		}
	}
</script>

<div class="max-w-3xl mx-auto px-6 py-12 flex-grow flex flex-col space-y-12">
	{#if loadingData}
		<div class="flex-grow flex items-center justify-center min-h-[40vh]">
			<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<div class="space-y-2 text-center">
			<span class="text-[10px] tracking-[0.3em] text-brass font-serif uppercase"
				>Account & Settings</span
			>
			<h1 class="text-3xl font-serif font-black text-text-light dark:text-text-dark uppercase">
				アカウント設定
			</h1>
			<p class="text-xs font-light text-gray-400">
				学習プラン、コース選択、およびサブスクリプション状況を管理します。
			</p>
		</div>

		{#if saveMessage}
			<div
				class="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs rounded text-center"
			>
				{saveMessage}
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<!-- Left: Settings Form (2 cols) -->
			<div class="md:col-span-2 space-y-8">
				<!-- Study Preference -->
				<div
					class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6 text-left"
				>
					<h3
						class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase border-b border-gray-100 dark:border-gray-800 pb-3"
					>
						学習設定
					</h3>

					<div class="space-y-4">
						<!-- Target course -->
						<div class="space-y-2">
							<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
								>目標コースの選択</span
							>
							<select
								bind:value={targetGoalId}
								class="w-full px-4 py-2.5 text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark transition-all duration-300 font-serif"
							>
								<option value="1kyu_kenchikushi">一級建築士 学科試験</option>
								<option value="2kyu_kenchikushi">二級建築士 学科試験</option>
							</select>
						</div>

						<!-- Training Intensity -->
						<div class="space-y-2 pt-2">
							<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
								>夜の特訓強度（目標学習時間）</span
							>
							<div class="grid grid-cols-3 gap-3">
								{#each [15, 30, 60] as mins}
									<button
										type="button"
										onclick={() => (intensity = mins)}
										class="py-3 border text-xs rounded transition-all duration-300 active:scale-[0.98] {intensity ===
										mins
											? 'border-brass bg-brass/5 text-brass font-bold'
											: 'border-gray-200 dark:border-gray-800 hover:border-brass/40 bg-transparent'}"
									>
										{mins} 分
									</button>
								{/each}
							</div>
						</div>

						<!-- Notification Time Settings -->
						<div class="grid grid-cols-2 gap-4 pt-2">
							<div class="space-y-2">
								<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
									>朝の配信・通知時刻</span
								>
								<input
									type="time"
									bind:value={morningTime}
									class="w-full px-4 py-2 text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark font-serif"
								/>
							</div>

							<div class="space-y-2">
								<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
									>昼の配信・通知時刻</span
								>
								<input
									type="time"
									bind:value={afternoonTime}
									class="w-full px-4 py-2 text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark font-serif"
								/>
							</div>
						</div>

						<!-- Question Count Preference -->
						<div class="space-y-2 pt-2">
							<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
								>1回の過去問演習問題数</span
							>
							<select
								bind:value={questionCount}
								class="w-full px-4 py-2.5 text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark font-serif"
							>
								<option value={5}>5問（短時間・ライト）</option>
								<option value={10}>10問（標準設定）</option>
								<option value={15}>15問（本格的）</option>
								<option value={20}>20問（ハイペース）</option>
							</select>
						</div>
					</div>

					<div class="pt-4">
						<button
							onclick={handleSaveSettings}
							disabled={isSaving}
							class="px-6 py-2.5 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 disabled:opacity-50"
						>
							{isSaving ? '保存中...' : '設定を保存する'}
						</button>
					</div>
				</div>
			</div>

			<!-- Right: Billing status (1 col) -->
			<div class="space-y-6">
				<div
					class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6 text-left"
				>
					<h3
						class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase border-b border-gray-100 dark:border-gray-800 pb-3"
					>
						購読プラン
					</h3>

					<div class="space-y-4">
						<div class="space-y-1">
							<span class="text-[10px] text-gray-400 uppercase tracking-widest"
								>現在のステータス</span
							>
							<div class="text-md font-serif font-bold text-brass uppercase">
								{#if user.planStatus === 'premium_active'}
									プレミアムプラン
								{:else if user.planStatus === 'beta_testing'}
									ベータテスター（無料枠）
								{:else if user.planStatus === 'premium_free_year'}
									永年無料特典枠
								{:else}
									フリープラン
								{/if}
							</div>
						</div>

						{#if user.planStatus === 'free'}
							<p class="text-[10px] font-light text-gray-400 leading-relaxed">
								プレミアムプランにアップグレードすると, AIによる「知識のバグ」の自動診断,
								夜の30分特訓, すべての問題演習と過去ログの閲覧が可能になります。
							</p>
							<button
								onclick={handleUpgrade}
								disabled={billingRedirecting}
								class="w-full py-2.5 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 disabled:opacity-50"
							>
								{billingRedirecting ? 'リダイレクト中...' : 'プレミアムを購入 (980円/月)'}
							</button>
						{:else}
							<div
								class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-500 font-light leading-relaxed"
							>
								すべてのプレミアム機能（AIプロファイリング、夜の処方特訓、詳細過去ログ）が有効化されています。
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
