<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
	import { page } from '$app/state';
	import type { UserGoal, Goal, DailyColumn } from '$lib/types';

	// Import Atomic Components
	import Meter from '$lib/components/molecules/Meter.svelte';
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import DailyColumnCard from '$lib/components/organisms/DailyColumnCard.svelte';
	import Modal from '$lib/components/organisms/Modal.svelte';
	import ReviewItem from '$lib/components/organisms/ReviewItem.svelte';

	let user = $state({ uid: null, planStatus: 'free', loading: true });
	let userGoal = $state<UserGoal | null>(null);
	let goalInfo = $state<Goal | null>(null);
	let dailyColumns = $state<DailyColumn[]>([]);

	let loadingData = $state(true);
	let billingRedirecting = $state(false);

	// Progress Dialog States
	let showProgressDialog = $state(false);
	let progressLogs = $state<any[]>([]);
	let loadingProgressLogs = $state(false);
	let editingNotes = $state<Record<string, string>>({});

	// Column Detail Dialog States
	let showColumnDialog = $state(false);
	let selectedColumn = $state<any>(null);

	userStore.subscribe((val) => {
		user = val as any;
	});

	// Calculate baseDate string (base timezone: morning starts at 7:00 AM)
	function getBaseDateString() {
		const now = new Date();
		// If before 7:00 AM, baseDate is yesterday
		if (now.getHours() < 7) {
			now.setDate(now.getDate() - 1);
		}
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}

	// Derived states for practice session completion
	let todayBaseDate = $derived(getBaseDateString());
	let isNewDay = $derived(userGoal?.lastSessionDate !== todayBaseDate);

	let morningFinished = $derived(isNewDay ? false : (userGoal?.morningCompleted || false));
	let afternoonFinished = $derived(isNewDay ? false : (userGoal?.afternoonCompleted || false));

	// Helper to check if setting notification time is passed
	function isTimePassed(timeStr: string) {
		if (!timeStr) return false;
		const [targetHour, targetMin] = timeStr.split(':').map(Number);
		const now = new Date();
		const nowHour = now.getHours();
		const nowMin = now.getMinutes();
		if (nowHour > targetHour) return true;
		if (nowHour === targetHour && nowMin >= targetMin) return true;
		return false;
	}

	// Check if sessions are unlocked based on custom settings
	let morningTimeLimit = $derived(userGoal?.morningNotificationTime || '07:00');
	let afternoonTimeLimit = $derived(userGoal?.afternoonNotificationTime || '12:00');

	let isMorningUnlocked = $derived(isTimePassed(morningTimeLimit));
	let isAfternoonUnlocked = $derived(isTimePassed(afternoonTimeLimit));

	// Calculate current stack count (0, 1, or 2)
	let exerciseStackCount = $derived.by(() => {
		let count = 0;
		if (isMorningUnlocked && !morningFinished) count++;
		if (isAfternoonUnlocked && !afternoonFinished) count++;
		return count;
	});

	async function openProgressDialog() {
		showProgressDialog = true;
		if (!user.uid) return;
		loadingProgressLogs = true;
		try {
			const logsSnap = await getDocs(
				collection(db, `users/${user.uid}/user_goals/1kyu_kenchikushi/questionLogs`)
			);
			const logs: any[] = [];
			logsSnap.forEach((doc) => {
				logs.push({ questionId: doc.id, ...doc.data() });
			});

			const questionsSnap = await getDocs(
				collection(db, 'goals/1kyu_kenchikushi/past_questions')
			);
			const questions: any[] = [];
			questionsSnap.forEach((doc) => {
				questions.push({ questionId: doc.id, ...doc.data() });
			});

			progressLogs = logs.map((log) => {
				const q = questions.find((item) => item.questionId === log.questionId);
				editingNotes[log.questionId] = log.note || '';
				return {
					...log,
					questionText: q?.questionText || '問題が見つかりません。',
					subject: q?.subject || '不明',
					chapter: q?.chapter || '不明',
					correctAnswer: q?.correctAnswer || 'O',
					explanation: q?.explanation || '解説はありません。'
				};
			});
		} catch (e) {
			console.error('Error fetching progress logs:', e);
		} finally {
			loadingProgressLogs = false;
		}
	}

	// Calculated values
	let daysLeft = $state(0);
	const examDate = new Date('2026-07-26'); // Exam target date for simulation

	let hasLoaded = false;

	$effect(() => {
		if (user.uid && !hasLoaded) {
			hasLoaded = true;
			loadDashboardData();
		}
	});

	async function loadDashboardData() {
		// Handle Mock Stripe Success
		if (page.url.searchParams.get('stripe_mock_success') === 'true') {
			const userRef = doc(db, `users/${user.uid}`);
			await updateDoc(userRef, { planStatus: 'premium_active' });
			// Update store
			userStore.update((store) => ({ ...store, planStatus: 'premium_active' }));
			user.planStatus = 'premium_active';
		}

		try {
			// Load user goal
			const userGoalSnap = await getDoc(
				doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi`)
			);
			if (userGoalSnap.exists()) {
				userGoal = userGoalSnap.data() as UserGoal;
			}

			// Load goal weights
			const goalSnap = await getDoc(doc(db, 'goals/1kyu_kenchikushi'));
			if (goalSnap.exists()) {
				goalInfo = goalSnap.data() as Goal;
			}

			// Load daily columns
			const columnsSnap = await getDocs(collection(db, 'goals/1kyu_kenchikushi/daily_columns'));
			const tempCols: DailyColumn[] = [];
			columnsSnap.forEach((doc) => {
				tempCols.push({ columnId: doc.id, ...doc.data() } as DailyColumn);
			});
			dailyColumns = tempCols;
		} catch (e) {
			console.error('Error loading dashboard data:', e);
		} finally {
			loadingData = false;
		}
	}

	onMount(() => {
		// Calculate countdown
		const today = new Date();
		const diffTime = examDate.getTime() - today.getTime();
		daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
	});

	// Trigger checkout via Stripe local API
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
				alert('決済手続きの開始に失敗しました。');
			}
		} catch (e) {
			console.error(e);
			alert('エラーが発生しました。');
		} finally {
			billingRedirecting = false;
		}
	}

	// Pick one column daily
	let todayColumn = $derived.by(() => {
		if (dailyColumns.length === 0) return null;
		const day = new Date().getDate();
		const index = day % dailyColumns.length;
		return dailyColumns[index];
	});
</script>

<div class="max-w-6xl mx-auto px-6 py-12 flex-grow flex flex-col space-y-12">
	{#if loadingData}
		<div class="flex-grow flex items-center justify-center min-h-[40vh]">
			<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<!-- TOP OVERVIEW SECTION (Restructured to 2 columns) -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- 1. Estimated Score Meter -> Leads to Mastery Page -->
			<a
				href="/mastery"
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col items-center justify-center text-center relative group hover:border-brass/60 transition-colors duration-300"
			>
				<h3
					class="text-xs tracking-widest text-gray-400 uppercase font-serif mb-4 group-hover:text-brass transition-colors"
				>
					想定本試験得点（習得度詳細へ）
				</h3>
				<Meter score={userGoal?.estimatedScore || 0} />
				<p class="text-xs font-light text-gray-400 mt-4">
					合格ライン：90点前後 | 現在偏差: {((userGoal?.estimatedScore || 0) > 90
						? '+'
						: '') + ((userGoal?.estimatedScore || 0) - 90)}
				</p>
			</a>

			<!-- 2. Countdown & Target Info -> Leads to Curriculum Page -->
			<div
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col justify-between"
			>
				<a
					href="/curriculum"
					class="block group focus:outline-none text-left"
				>
					<h3 class="text-xs tracking-widest text-gray-400 uppercase font-serif mb-4 group-hover:text-brass transition-colors">
						学科試験カウントダウン（計画詳細へ）
					</h3>
					<div class="flex items-baseline space-x-2">
						<span class="text-5xl font-serif font-black text-brass transition-transform group-hover:scale-105 origin-left inline-block">{daysLeft}</span>
						<span class="text-sm font-light text-gray-400">日後 (2026/07/26)</span>
					</div>
				</a>

				<button
					onclick={openProgressDialog}
					class="mt-6 space-y-3 w-full text-left focus:outline-none hover:opacity-85 transition-opacity group cursor-pointer"
				>
					<div class="flex justify-between text-xs font-light">
						<span class="text-gray-400 group-hover:text-brass transition-colors"
							>今週の演習ノルマ（クリックで履歴表示）</span
						>
						<span class="text-text-light dark:text-text-dark font-medium">12問 / 50問</span>
					</div>
					<Progress value={12} max={50} class="pointer-events-none" />
				</button>
			</div>
		</div>

		<!-- 3. DAILY PRACTICE TASK STACK SECTION (New feature) -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md text-left space-y-6">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 gap-2">
				<div>
					<h2 class="text-md font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
						毎日の過去問演習（10問 ✕ 2回）
					</h2>
					<p class="text-xs font-light text-gray-400 mt-1">
						朝7:00と昼12:00に配信。解いていない未消化分は当日中のみスタックされます。
					</p>
				</div>
				<div class="flex items-center space-x-2">
					<span class="text-[10px] tracking-widest text-gray-400 font-bold uppercase">現在のスタック状況:</span>
					<span class="px-2.5 py-0.5 rounded text-xs font-bold font-serif {exerciseStackCount > 0 ? 'bg-brass text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}">
						{exerciseStackCount > 0 ? `${exerciseStackCount}回分 未消化` : '完了'}
					</span>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
				<!-- Morning session -->
				<div class="p-6 border rounded flex flex-col justify-between items-start space-y-4 {morningFinished ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-gray-200 dark:border-gray-800'}">
					<div class="space-y-1">
						<span class="text-[9px] tracking-widest uppercase font-bold text-gray-400">AM {morningTimeLimit} 配信</span>
						<h4 class="font-serif font-bold text-sm text-text-light dark:text-text-dark">朝の過去問演習 ({userGoal?.questionCountPerSession || 10}問)</h4>
						<p class="text-[10px] font-light text-gray-400">一日の学習インデックスを朝一番に構築</p>
					</div>

					<div class="w-full flex items-center justify-between pt-2">
						{#if !isMorningUnlocked}
							<span class="text-xs font-light text-gray-400">
								🔒 {morningTimeLimit}に解放されます
							</span>
						{:else}
							<span class="text-xs font-light {morningFinished ? 'text-emerald-500 font-bold' : 'text-gray-400'}">
								{morningFinished ? '✓ 演習完了' : '未完了'}
							</span>
							{#if !morningFinished}
								<a
									href="/practice?session=morning"
									class="px-4 py-2 bg-brass hover:bg-brass-dark text-white text-[10px] tracking-widest font-bold rounded transition-all duration-300"
								>
									演習を開始する
								</a>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Afternoon session -->
				<div class="p-6 border rounded flex flex-col justify-between items-start space-y-4 {afternoonFinished ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-gray-200 dark:border-gray-800'}">
					<div class="space-y-1">
						<span class="text-[9px] tracking-widest uppercase font-bold text-gray-400">PM {afternoonTimeLimit} 配信</span>
						<h4 class="font-serif font-bold text-sm text-text-light dark:text-text-dark">昼・夕方の過去問演習 ({userGoal?.questionCountPerSession || 10}問)</h4>
						<p class="text-[10px] font-light text-gray-400">午後の空き時間に知識の定着度をテスト</p>
					</div>

					<div class="w-full flex items-center justify-between pt-2">
						{#if !isAfternoonUnlocked}
							<span class="text-xs font-light text-gray-400">
								🔒 {afternoonTimeLimit}に解放されます
							</span>
						{:else}
							<span class="text-xs font-light {afternoonFinished ? 'text-emerald-500 font-bold' : 'text-gray-400'}">
								{afternoonFinished ? '✓ 演習完了' : '未完了'}
							</span>
							{#if !afternoonFinished}
								<a
									href="/practice?session=afternoon"
									class="px-4 py-2 bg-brass hover:bg-brass-dark text-white text-[10px] tracking-widest font-bold rounded transition-all duration-300"
								>
									演習を開始する
								</a>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- SUBSCRIPTION CTA (If free user) -->
		{#if user.planStatus === 'free'}
			<div
				class="border border-dashed border-brass/50 bg-brass/5 p-8 rounded flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300"
			>
				<div class="space-y-2 text-left">
					<span
						class="px-2 py-0.5 border border-brass text-[9px] tracking-widest text-brass uppercase rounded font-bold"
						>Premium Plan</span
					>
					<h3 class="text-md font-serif font-bold text-text-light dark:text-text-dark">
						カリキュラム管理＆全問題解放 (月額 980円)
					</h3>
					<p class="text-xs font-light text-gray-400 max-w-xl">
						プレミアムプランに登録すると、夜のカリキュラム進捗管理、週次学習計画の詳細なカスタマイズ、無制限の1問1答演習、および過去ログのすべてを閲覧可能になります。
					</p>
				</div>
				<Button onclick={handleUpgrade} disabled={billingRedirecting}>
					{billingRedirecting ? 'リダイレクト中...' : 'アップグレードする'}
				</Button>
			</div>
		{/if}

		<!-- DAILY COLUMN SECTION -->
		<div class="space-y-4 text-left">
			<h2 class="text-lg font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
				今日の学習コラム（AI編纂）
			</h2>

			<div class="w-full max-w-2xl">
				{#if todayColumn}
					<DailyColumnCard
						column={todayColumn}
						onclick={() => {
							selectedColumn = todayColumn;
							showColumnDialog = true;
						}}
					/>
				{:else}
					<p class="text-xs font-light text-gray-400">今日のコラムはありません。</p>
				{/if}
			</div>
		</div>

		<!-- Progress dialog (modal) -->
		<Modal bind:show={showProgressDialog} title="今週の学習進捗とノート一覧">
			{#if loadingProgressLogs}
				<div class="py-12 flex flex-col items-center justify-center space-y-4">
					<div class="w-6 h-6 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
					<p class="text-[10px] tracking-widest text-gray-400 font-serif animate-pulse">読み込み中...</p>
				</div>
			{:else if progressLogs.length === 0}
				<div class="text-center py-12 text-gray-400 font-light text-xs">
					まだ解いた問題の履歴がありません。
				</div>
			{:else}
				<div class="space-y-6 divide-y divide-gray-100 dark:divide-gray-800/40">
					{#each progressLogs as log, index}
						<div class={index === 0 ? '' : 'pt-6'}>
							<ReviewItem
								userId={user.uid}
								questionId={log.questionId}
								index={index}
								subject={log.subject}
								chapter={log.chapter}
								questionText={log.questionText}
								correctAnswer={log.correctAnswer}
								explanation={log.explanation}
								initialNote={editingNotes[log.questionId]}
								onSave={(id: string, text: string) => {
									editingNotes[id] = text;
								}}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</Modal>

		<!-- Column detail dialog (modal) -->
		<Modal bind:show={showColumnDialog} title={selectedColumn?.title || 'コラム詳細'}>
			{#if selectedColumn}
				<div class="space-y-4 text-left">
					<div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
						<Badge text={selectedColumn.category} variant="subject" />
						{#if selectedColumn.relatedTags}
							<div class="flex gap-1.5">
								{#each selectedColumn.relatedTags as tag}
									<span
										class="text-[9px] font-light bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800 text-gray-500 px-2 py-0.5 rounded"
									>
										#{tag}
									</span>
								{/each}
							</div>
						{/if}
					</div>

					<p
						class="text-xs font-serif font-light text-text-light dark:text-text-dark leading-relaxed whitespace-pre-wrap"
					>
						{selectedColumn.content}
					</p>

					<!-- Image search URL helper -->
					<div class="pt-4 border-t border-gray-100 dark:border-gray-800/40">
						<a
							href="https://www.google.com/search?tbm=isch&q={encodeURIComponent(selectedColumn.title)}"
							target="_blank"
							class="text-[10px] tracking-widest font-bold text-brass-dark dark:text-brass-light hover:text-brass flex items-center space-x-1 w-max"
						>
							<span>ビジュアル脳内定着（画像検索）</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
						</a>
					</div>
				</div>
			{/if}
		</Modal>
	{/if}
</div>
