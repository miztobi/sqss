<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { collection, getDocs } from 'firebase/firestore';
	import type { Question } from '$lib/types';
	import { goto } from '$app/navigation';

	interface ProfileResponse {
		overallSummary: string;
		focusAreas: {
			tagName: string;
			masteryLevel: 'safe' | 'unstable' | 'critical';
			weight: number;
			recommendation: string;
		}[];
		nextAction: string;
	}

	let user = $state({ uid: null, planStatus: 'free', loading: true });
	let selectedIntensity = $state(30); // Default 30 min
	let step = $state<'select' | 'training' | 'test_result'>('select');

	// Profile data from Gemini
	let profile = $state<ProfileResponse | null>(null);
	let loadingProfile = $state(false);

	// Timer variables
	let timeLeft = $state(0);
	let timerInterval = $state<any>(null);
	let timerFormatted = $derived(
		`${Math.floor(timeLeft / 60)
			.toString()
			.padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
	);

	// Test questions for verification
	let testQuestions = $state<Question[]>([]);
	let answers = $state<Record<string, 'O' | 'X'>>({});
	let isSubmittingTest = $state(false);

	userStore.subscribe((val) => {
		user = val as any;
	});

	onMount(() => {
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	});

	async function startTraining() {
		if (!user.uid) return;
		step = 'training';
		loadingProfile = true;
		timeLeft = selectedIntensity * 60;

		try {
			// 1. Fetch AI profiling from SvelteKit API
			const res = await fetch('/api/ai/profile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: user.uid, goalId: '1kyu_kenchikushi' })
			});
			profile = (await res.json()) as ProfileResponse;

			// Start timer countdown
			timerInterval = setInterval(() => {
				if (timeLeft > 0) {
					timeLeft--;
				} else {
					clearInterval(timerInterval);
				}
			}, 1000);

			// 2. Fetch test questions matching critical tags
			const questionsSnap = await getDocs(
				collection(db, 'goals/1kyu_kenchikushi/past_questions')
			);
			const allQs: Question[] = [];
			questionsSnap.forEach((doc) => {
				allQs.push({ questionId: doc.id, ...doc.data() } as Question);
			});

			// Filter questions matching critical/unstable tags
			const criticalTags =
				profile?.focusAreas
					?.filter((a) => a.masteryLevel === 'critical' || a.masteryLevel === 'unstable')
					.map((a) => a.tagName) || [];

			let matchingQs = allQs.filter((q) =>
				q.aiVectors?.tags?.some((t) => criticalTags.includes(t))
			);

			// Fallback: If no matching questions, just pick 3 questions
			if (matchingQs.length === 0) {
				matchingQs = allQs.slice(0, 3);
			}

			testQuestions = matchingQs.slice(0, 3); // Pick up to 3 validation questions
		} catch (e) {
			console.error(e);
		} finally {
			loadingProfile = false;
		}
	}

	async function submitTest() {
		isSubmittingTest = true;
		if (timerInterval) clearInterval(timerInterval);

		// Post results to database
		if (user.uid) {
			for (const q of testQuestions) {
				const isCorrect = answers[q.questionId] === q.correctAnswer;
				try {
					await fetch('/api/questions/log', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							userId: user.uid,
							goalId: '1kyu_kenchikushi',
							questionId: q.questionId,
							isCorrect,
							tags: q.aiVectors?.tags || [],
							chapter: q.chapter
						})
					});
				} catch (e) {
					console.error(e);
				}
			}
		}

		step = 'test_result';
		isSubmittingTest = false;
	}

	let correctCount = $derived(
		testQuestions.filter((q) => answers[q.questionId] === q.correctAnswer).length
	);
</script>

<div class="max-w-4xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center">
	{#if user.planStatus === 'free'}
		<!-- Locked feature representation for non-paying users -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 md:p-12 rounded shadow-lg text-center space-y-6">
			<div class="w-16 h-16 bg-brass/10 border border-brass rounded-full flex items-center justify-center mx-auto text-brass">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
			</div>
			
			<div class="space-y-2">
				<span class="px-2.5 py-0.5 border border-brass text-[9px] text-brass uppercase rounded font-bold tracking-widest">Premium Feature</span>
				<h2 class="text-xl font-serif font-black text-text-light dark:text-text-dark">夜の30分：AI処方特訓</h2>
				<p class="text-xs font-light text-gray-400 max-w-lg mx-auto leading-relaxed">
					AI処方特訓はプレミアム機能です。
					Geminiが直近の誤答ログから「類似概念の混同」を診断し、今夜読むべき法令集のページや概念整理の仕方をピンポイントで処方します。
				</p>
			</div>

			<div class="pt-4">
				<a href="/dashboard" class="px-6 py-3 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300">
					ダッシュボードでアップグレード
				</a>
			</div>
		</div>
	{:else if step === 'select'}
		<!-- FLIGHT LEVEL SELECTION -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 md:p-12 rounded shadow-lg space-y-8 transition-colors duration-300">
			<div class="space-y-2 text-center">
				<span class="text-[10px] tracking-[0.3em] text-brass font-serif uppercase">Variable Intensity Training</span>
				<h2 class="text-2xl font-serif font-black text-text-light dark:text-text-dark">夜の処方特訓の強度選択</h2>
				<p class="text-xs font-light text-gray-400">
					今夜確保できる学習時間に合わせて強度を選択してください。AIが診断と確認テストを適正配分します。
				</p>
			</div>

			<div class="grid grid-cols-3 gap-4">
				{#each [15, 30, 60] as intensity}
					<button
						onclick={() => selectedIntensity = intensity}
						class="py-8 border rounded flex flex-col items-center justify-center transition-all duration-300 active:scale-[0.98] {selectedIntensity === intensity ? 'border-brass bg-brass/5 text-brass font-bold' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-bg-dark hover:border-brass/50'}"
					>
						<span class="text-3xl font-serif font-black">{intensity}</span>
						<span class="text-[9px] font-light tracking-widest uppercase mt-1">minutes</span>
					</button>
				{/each}
			</div>

			<div class="text-center pt-4">
				<button
					onclick={startTraining}
					class="px-8 py-3 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300"
				>
					特訓を開始する
				</button>
			</div>
		</div>
	{:else if step === 'training'}
		<!-- TRAINING / READING TEXT & TIMER RUNNING -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			
			<!-- Left: Timer and Next Action -->
			<div class="space-y-6">
				<!-- Timer widget -->
				<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col items-center justify-center text-center shadow-md">
					<span class="text-[9px] tracking-widest text-gray-400 font-serif uppercase mb-2">Remaining Time</span>
					<span class="text-4xl font-mono font-bold text-text-light dark:text-text-dark">{timerFormatted}</span>
					<div class="w-full bg-gray-100 dark:bg-black/30 h-1 rounded overflow-hidden mt-4">
						<div class="bg-brass h-full transition-all duration-1000" style="width: {(timeLeft / (selectedIntensity * 60)) * 100}%"></div>
					</div>
				</div>

				<!-- Instructions / Action items -->
				<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-6 rounded shadow-md space-y-4">
					<h3 class="text-xs tracking-widest font-serif text-brass uppercase font-bold">
						今夜のピンポイント指示
					</h3>
					{#if loadingProfile}
						<div class="h-12 flex items-center justify-center">
							<div class="w-5 h-5 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
						</div>
					{:else}
						<p class="text-xs font-light leading-relaxed text-text-light dark:text-text-dark">
							{profile?.nextAction}
						</p>
					{/if}
				</div>
			</div>

			<!-- Right: AI Profiling Report & Verification Test -->
			<div class="lg:col-span-2 space-y-6">
				<!-- AI Diagnosis -->
				<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6">
					<h3 class="text-xs tracking-widest font-serif text-gray-400 uppercase border-b border-gray-150 dark:border-gray-800 pb-2">
						AI診断：知識のバグ特定レポート
					</h3>

					{#if loadingProfile}
						<div class="py-12 flex flex-col items-center justify-center space-y-4">
							<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
							<p class="text-xs font-serif tracking-widest text-gray-400 animate-pulse">Gemini 脳内マップ分析中...</p>
						</div>
					{:else}
						<p class="text-sm font-serif font-light leading-relaxed text-text-light dark:text-text-dark whitespace-pre-line">
							{profile?.overallSummary}
						</p>

						<!-- Mastery targets -->
						<div class="space-y-3 pt-4">
							<h4 class="text-[10px] tracking-widest text-gray-400 uppercase font-bold">
								判定された要注意概念
							</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								{#each profile?.focusAreas || [] as area}
									<div class="p-3 border border-gray-200 dark:border-gray-800 rounded bg-gray-50 dark:bg-black/20 flex flex-col justify-between">
										<div class="flex justify-between items-baseline mb-2">
											<span class="text-xs font-serif font-bold text-text-light dark:text-text-dark">#{area.tagName}</span>
											<span class="text-[9px] uppercase font-bold {area.masteryLevel === 'critical' ? 'text-rose-500' : 'text-amber-500'}">
												{area.masteryLevel === 'critical' ? '危険' : '不安'}
											</span>
										</div>
										<p class="text-[10px] font-light text-gray-400 leading-normal">
											{area.recommendation}
										</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Verification Test -->
				{#if !loadingProfile && testQuestions.length > 0}
					<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6">
						<h3 class="text-xs tracking-widest font-serif text-gray-400 uppercase border-b border-gray-150 dark:border-gray-800 pb-2">
							理解度チェックテスト (一問一答)
						</h3>

						<div class="space-y-8 divide-y divide-gray-100 dark:divide-gray-800/50">
							{#each testQuestions as q, index}
								<div class="space-y-4 {index === 0 ? '' : 'pt-6'}">
									<div class="flex items-center justify-between">
										<span class="text-[10px] text-gray-400">設問 {index + 1}</span>
										<span class="text-[10px] text-brass font-bold">{q.subject} • {q.chapter}</span>
									</div>
									<p class="text-sm font-serif font-light text-text-light dark:text-text-dark leading-relaxed">
										{q.questionText}
									</p>
									<!-- Options -->
									<div class="flex space-x-4">
										<button
											onclick={() => answers[q.questionId] = 'O'}
											class="flex-1 py-3 border text-sm rounded font-serif transition-all duration-300 {answers[q.questionId] === 'O' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold' : 'border-gray-200 dark:border-gray-800 hover:border-emerald-500/50'}"
										>
											O
										</button>
										<button
											onclick={() => answers[q.questionId] = 'X'}
											class="flex-1 py-3 border text-sm rounded font-serif transition-all duration-300 {answers[q.questionId] === 'X' ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : 'border-gray-200 dark:border-gray-800 hover:border-rose-500/50'}"
										>
											X
										</button>
									</div>
								</div>
							{/each}
						</div>

						<div class="pt-6 border-t border-gray-100 dark:border-gray-800">
							<button
								onclick={submitTest}
								disabled={testQuestions.some(q => !answers[q.questionId]) || isSubmittingTest}
								class="w-full py-3 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 disabled:opacity-30"
							>
								{isSubmittingTest ? '結果送信中...' : '理解度テストを完了する'}
							</button>
						</div>
					</div>
				{/if}
			</div>

		</div>
	{:else if step === 'test_result'}
		<!-- TEST RESULTS SCREEN -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 md:p-12 rounded shadow-lg max-w-2xl mx-auto space-y-8 text-center transition-colors duration-300">
			<div class="space-y-4">
				<span class="text-[10px] tracking-[0.3em] text-brass font-serif uppercase">Training Completed</span>
				<h2 class="text-2xl font-serif font-black text-text-light dark:text-text-dark">バグ修正テスト結果</h2>
				
				<!-- Score Badge -->
				<div class="inline-flex flex-col items-center justify-center p-6 rounded-full border border-brass bg-brass/5 mt-4">
					<span class="text-3xl font-serif font-black text-brass">{correctCount} / {testQuestions.length}</span>
					<span class="text-[9px] text-gray-400 font-light mt-1">正答数</span>
				</div>
			</div>

			<div class="text-left space-y-4 max-w-md mx-auto">
				<p class="text-xs font-light text-gray-400 leading-relaxed text-center">
					お疲れ様でした。AIによるバグ修正テストの正誤データが蓄積されました。明日の「想定得点」および「戦闘マップ」に反映されます。
				</p>
			</div>

			<div class="pt-4 flex flex-col md:flex-row gap-4 justify-center">
				<a href="/dashboard" class="px-6 py-3 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 inline-block">
					ダッシュボードに戻る
				</a>
				<button onclick={() => { step = 'select'; answers = {}; }} class="px-6 py-3 border border-gray-200 dark:border-gray-800 text-text-light dark:text-text-dark text-xs tracking-widest font-light rounded transition-all duration-300 hover:border-brass">
					別の特訓を行う
				</button>
			</div>
		</div>
	{/if}
</div>
