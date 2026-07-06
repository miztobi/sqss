<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
	import type { UserGoal, TagMatrix } from '$lib/types';

	// Import Atomic Components
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Button from '$lib/components/atoms/Button.svelte';

	let user = $state({ uid: null, loading: true });
	let userGoal = $state<UserGoal & { targetYear?: number } | null>(null);
	let tagMatrixList = $state<TagMatrix[]>([]);
	let loadingData = $state(true);
	let isSaving = $state(false);
	let saveMessage = $state('');

	userStore.subscribe((val) => {
		user = val as any;
	});

	// Curriculum details by week
	const weeklyCurriculum = [
		{ weeks: '第1週 〜 第4週', subject: '計画・環境・設備', focus: '環境工学の用語整理、音・光・熱の基礎計算、気候・日照の暗記' },
		{ weeks: '第5週 〜 第10週', subject: '法規', focus: '建築基準法の構成、単体規定、集団規定（容積率・建ぺい率・高さ制限・道路規制）' },
		{ weeks: '第11週 〜 第16週', subject: '構造', focus: '静定構造物の応力計算、断面の性質、RC造・S造の部材設計、基礎構造' },
		{ weeks: '第17週 〜 第20週', subject: '施工', focus: '地盤調査、仮設工事、鉄筋コンクリート工事、仕上げ工事、施工計画の策定' },
		{ weeks: '第21週 〜 第24週', subject: '総演習・弱点特訓', focus: '各年度本試験過去問の制限時間内シミュレーション、新法改正・時事コラムの総点検' }
	];

	onMount(async () => {
		if (user.uid) {
			try {
				const userGoalSnap = await getDoc(
					doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi`)
				);
				if (userGoalSnap.exists()) {
					userGoal = userGoalSnap.data() as any;
					if (!userGoal.targetYear) {
						userGoal.targetYear = 2026; // Default goal target
					}
				}

				// Load tag matrix for catching up on mastery
				const tagMatrixSnap = await getDocs(
					collection(db, `users/${user.uid}/user_goals/1kyu_kenchikushi/tagMatrix`)
				);
				const tempTags: TagMatrix[] = [];
				tagMatrixSnap.forEach((doc) => {
					tempTags.push({ tagName: doc.id, ...doc.data() } as TagMatrix);
				});
				tagMatrixList = tempTags;
			} catch (e) {
				console.error(e);
			} finally {
				loadingData = false;
			}
		}
	});

	async function saveGoalSettings() {
		if (!user.uid || !userGoal) return;
		isSaving = true;
		saveMessage = '';
		try {
			const ref = doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi`);
			await updateDoc(ref, {
				targetYear: userGoal.targetYear,
				currentLoop: userGoal.currentLoop,
				currentWeek: userGoal.currentWeek
			});
			saveMessage = 'カリキュラム設定を保存しました。';
			setTimeout(() => (saveMessage = ''), 3000);
		} catch (e) {
			console.error(e);
			saveMessage = '設定の保存に失敗しました。';
		} finally {
			isSaving = false;
		}
	}

	async function nextWeek() {
		if (!user.uid || !userGoal) return;
		userGoal.currentWeek = (userGoal.currentWeek || 1) + 1;
		await saveGoalSettings();
	}

	async function prevWeek() {
		if (!user.uid || !userGoal || (userGoal.currentWeek || 1) <= 1) return;
		userGoal.currentWeek = (userGoal.currentWeek || 1) - 1;
		await saveGoalSettings();
	}

	// Calculate overall curriculum catchup stats
	let safeTagsCount = $derived(
		tagMatrixList.filter((t) => t.aiEstimation?.masteryLevel === 'safe').length
	);
	let totalTagsCount = $derived(tagMatrixList.length || 1);
	let tagProgressPercentage = $derived(Math.round((safeTagsCount / totalTagsCount) * 100));

	// Get current active curriculum step
	let activePlanIndex = $derived.by(() => {
		const week = userGoal?.currentWeek || 1;
		if (week <= 4) return 0;
		if (week <= 10) return 1;
		if (week <= 16) return 2;
		if (week <= 20) return 3;
		return 4;
	});

	const loopModes = [
		{ value: 1, label: '1周目：最速基礎構築', desc: '全重要過去問を1周し、全体知識のインデックスを構築' },
		{ value: 2, label: '2周目：弱点特訓補強', desc: '1周目の誤答ログに基づいて苦手分野を重点的に演習' },
		{ value: 3, label: '3周目：時事予想実戦', desc: '新法改正・建築トレンドに対応した発展・時事コラムの学習' }
	];
</script>

<div class="max-w-4xl mx-auto px-6 py-12 flex-grow flex flex-col space-y-12">
	{#if loadingData}
		<div class="flex-grow flex items-center justify-center min-h-[40vh]">
			<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<div class="space-y-2 text-center">
			<span class="text-[10px] tracking-[0.3em] text-brass font-serif uppercase"
				>Learning Roadmap & Roadmap</span
			>
			<h1 class="text-3xl font-serif font-black text-text-light dark:text-text-dark uppercase">
				学習カリキュラム計画
			</h1>
			<p class="text-xs font-light text-gray-400">
				目標とする本試験、現在の周回、週ごとの短期カリキュラムおよび習得度進捗を計画・管理します。
			</p>
		</div>

		{#if saveMessage}
			<div
				class="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs rounded text-center"
			>
				{saveMessage}
			</div>
		{/if}

		<!-- 1. Goal Setting (Target Year) & Mid-Term (Loop) -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<!-- Goal setting -->
			<div
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6 text-left"
			>
				<h3
					class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase border-b border-gray-100 dark:border-gray-800 pb-3"
				>
					目標試験年度の決定
				</h3>

				<div class="space-y-4">
					<div class="space-y-2">
						<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
							>目標本試験年</span
						>
						<select
							bind:value={userGoal.targetYear}
							class="w-full px-4 py-2.5 text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark font-serif"
						>
							<option value={2026}>2026年度（令和8年）本試験</option>
							<option value={2027}>2027年度（令和9年）本試験</option>
							<option value={2028}>2028年度（令和10年）本試験</option>
						</select>
					</div>

					<Button variant="primary" onclick={saveGoalSettings} disabled={isSaving} class="w-full">
						{isSaving ? '保存中...' : '目標を確定する'}
					</Button>
				</div>
			</div>

			<!-- Mid-term Loop planning -->
			<div
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6 text-left md:col-span-2"
			>
				<h3
					class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase border-b border-gray-100 dark:border-gray-800 pb-3"
				>
					中期計画（現在の周回フェーズ）
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{#each loopModes as mode}
						<button
							onclick={() => {
								userGoal.currentLoop = mode.value;
								saveGoalSettings();
							}}
							class="p-4 border text-left rounded transition-all duration-300 active:scale-[0.98] {userGoal?.currentLoop ===
							mode.value
								? 'border-brass bg-brass/5'
								: 'border-gray-200 dark:border-gray-800 hover:border-brass/40 bg-transparent'}"
						>
							<span
								class="text-[9px] font-bold tracking-widest uppercase block mb-1 {userGoal?.currentLoop ===
								mode.value
									? 'text-brass'
									: 'text-gray-400'}"
							>
								Phase 0{mode.value}
							</span>
							<h4 class="font-serif font-bold text-xs text-text-light dark:text-text-dark mb-1">
								{mode.label.split('：')[1]}
							</h4>
							<p class="text-[9px] font-light text-gray-400 leading-normal">
								{mode.desc}
							</p>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- 2. Weekly Short-Term Plan Proposal -->
		<div
			class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-8 text-left"
		>
			<div
				class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4"
			>
				<h3 class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase">
					週次学習計画の提案（短期計画）
				</h3>
				<div class="flex items-center space-x-2">
					<Button variant="outline" onclick={prevWeek} disabled={userGoal.currentWeek <= 1} class="px-2.5 py-1 text-[10px]">
						前週
					</Button>
					<span class="text-xs font-serif font-bold text-brass px-2"
						>第 {userGoal.currentWeek} 週目</span
					>
					<Button variant="outline" onclick={nextWeek} class="px-2.5 py-1 text-[10px]">次週</Button>
				</div>
			</div>

			<!-- Active Curriculum Week Proposal card -->
			<div class="p-6 border border-brass/30 bg-brass/5 rounded space-y-4">
				<div class="flex items-center justify-between">
					<span class="px-2 py-0.5 bg-brass text-white text-[9px] font-bold rounded uppercase tracking-widest"
						>推奨プラン</span
					>
					<span class="text-[10px] text-gray-400"
						>推奨期間: {weeklyCurriculum[activePlanIndex].weeks}</span
					>
				</div>

				<div class="space-y-2">
					<h4 class="font-serif font-black text-md text-text-light dark:text-text-dark">
						推奨履修科目: <span class="text-brass"
							>{weeklyCurriculum[activePlanIndex].subject}</span
						>
					</h4>
					<p class="text-xs font-light text-gray-500 dark:text-gray-400 leading-relaxed">
						{weeklyCurriculum[activePlanIndex].focus}
					</p>
				</div>

				<div class="border-t border-brass/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div class="space-y-1">
						<span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider block"
							>今週の推奨演習目標</span
						>
						<span class="text-xs font-light text-text-light dark:text-text-dark"
							>1日10問過去問演習 ✕ 5日 ＝ 50問の完全習得</span
						>
					</div>

					<Button variant="dashed" onclick={nextWeek} class="text-[10px] tracking-widest font-bold">
						今週の計画を完了し、次の週に進む
					</Button>
				</div>
			</div>

			<!-- Whole roadmap mapping -->
			<div class="space-y-3">
				<span class="text-[10px] tracking-widest text-gray-400 uppercase font-bold"
					>24週学習ロードマップ</span
				>
				<div class="grid grid-cols-1 md:grid-cols-5 gap-3">
					{#each weeklyCurriculum as cur, idx}
						<div
							class="p-4 border rounded text-xs flex flex-col justify-between {idx ===
							activePlanIndex
								? 'border-brass bg-brass/5 shadow-sm'
								: 'border-gray-150 dark:border-gray-900 bg-gray-50/50 dark:bg-black/10'}"
						>
							<div class="space-y-1">
								<span
									class="text-[9px] font-bold block {idx === activePlanIndex
										? 'text-brass'
										: 'text-gray-400'}"
								>
									{cur.weeks}
								</span>
								<h5 class="font-bold text-text-light dark:text-text-dark text-xs">{cur.subject}</h5>
							</div>
							<p class="text-[9px] font-light text-gray-400 mt-2 line-clamp-3 leading-normal">
								{cur.focus}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 3. Mastery Catch-up -->
		<div
			class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6 text-left"
		>
			<h3
				class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase border-b border-gray-100 dark:border-gray-800 pb-3"
			>
				習得度キャッチアップ状況
			</h3>

			<div class="space-y-4">
				<div class="flex items-center justify-between text-xs">
					<span class="text-gray-400">AI推定・完全定着度（Safeステータス）</span>
					<span class="font-bold text-brass">{tagProgressPercentage}%</span>
				</div>

				<Progress value={tagProgressPercentage} max={100} />

				<p class="text-[10px] font-light text-gray-400 leading-relaxed max-w-2xl">
					カリキュラム進行度と同時に、AIによる知識の定着度診断が安全圏内（Safe）に達している割合です。
					週次の学習計画で各科目の単元を消化し、正答率を高めることで、このキャッチアップインジケータが上昇します。
				</p>
			</div>
		</div>
	{/if}
</div>
