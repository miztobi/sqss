<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
	import { page } from '$app/state';
	import type { UserGoal, Goal, TagMatrix, DailyColumn } from '$lib/types';

	let user = $state({ uid: null, planStatus: 'free', loading: true });
	let userGoal = $state<UserGoal | null>(null);
	let goalInfo = $state<Goal | null>(null);
	let tagMatrixList = $state<TagMatrix[]>([]);
	let dailyColumns = $state<DailyColumn[]>([]);

	let loadingData = $state(true);
	let billingRedirecting = $state(false);

	// Progress Dialog States
	let showProgressDialog = $state(false);
	let progressLogs = $state<any[]>([]);
	let loadingProgressLogs = $state(false);
	let editingNotes = $state<Record<string, string>>({});
	let savingNoteId = $state<string | null>(null);

	userStore.subscribe((val) => {
		user = val as any;
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
					chapter: q?.chapter || '不明'
				};
			});
		} catch (e) {
			console.error('Error fetching progress logs:', e);
		} finally {
			loadingProgressLogs = false;
		}
	}

	async function saveProgressNote(questionId: string) {
		if (!user.uid) return;
		savingNoteId = questionId;
		try {
			const ref = doc(
				db,
				`users/${user.uid}/user_goals/1kyu_kenchikushi/questionLogs/${questionId}`
			);
			await setDoc(ref, { note: editingNotes[questionId] }, { merge: true });

			progressLogs = progressLogs.map((log) => {
				if (log.questionId === questionId) {
					return { ...log, note: editingNotes[questionId] };
				}
				return log;
			});
		} catch (e) {
			console.error(e);
			alert('ノートの保存に失敗しました');
		} finally {
			savingNoteId = null;
		}
	}

	// Calculated values
	let daysLeft = $state(0);
	const examDate = new Date('2026-07-26'); // Exam target date for simulation

	onMount(async () => {
		// Calculate countdown
		const today = new Date();
		const diffTime = examDate.getTime() - today.getTime();
		daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

		if (user.uid) {
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

				// Load user's tag matrix
				const tagMatrixSnap = await getDocs(
					collection(db, `users/${user.uid}/user_goals/1kyu_kenchikushi/tagMatrix`)
				);
				const tempTags: TagMatrix[] = [];
				tagMatrixSnap.forEach((doc) => {
					tempTags.push({ tagName: doc.id, ...doc.data() } as TagMatrix);
				});
				tagMatrixList = tempTags;

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

	// Custom color utilities for mastery status
	function getMasteryColor(level: 'safe' | 'unstable' | 'critical' | undefined) {
		if (level === 'safe') return 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400';
		if (level === 'unstable') return 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400';
		if (level === 'critical') return 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400';
		return 'bg-gray-500/10 border-gray-300 dark:border-gray-800 text-gray-400';
	}
</script>

<div class="max-w-6xl mx-auto px-6 py-12 flex-grow flex flex-col space-y-12">
	{#if loadingData}
		<div class="flex-grow flex items-center justify-center min-h-[40vh]">
			<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<!-- TOP OVERVIEW SECTION -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- 1. Estimated Score Meter -->
			<div
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col items-center justify-center text-center relative group"
			>
				<h3 class="text-xs tracking-widest text-gray-400 uppercase font-serif mb-4">
					想定本試験得点
				</h3>
				<div class="relative w-36 h-36 flex items-center justify-center mb-4">
					<!-- Visual SVG Meter -->
					<svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
						<circle
							cx="50"
							cy="50"
							r="40"
							stroke="currentColor"
							stroke-width="3"
							fill="transparent"
							class="text-gray-100 dark:text-gray-900"
						/>
						<circle
							cx="50"
							cy="50"
							r="40"
							stroke="var(--color-brass)"
							stroke-width="5"
							fill="transparent"
							stroke-dasharray="251.2"
							stroke-dashoffset={251.2 - (251.2 * (userGoal?.estimatedScore || 0)) / 125}
							stroke-linecap="round"
							class="transition-all duration-1000 ease-out"
						/>
					</svg>
					<div class="absolute flex flex-col items-center">
						<span class="text-4xl font-serif font-black text-text-light dark:text-text-dark"
							>{userGoal?.estimatedScore || 0}</span
						>
						<span class="text-[10px] text-gray-400 font-light mt-1">/ 125点</span>
					</div>
				</div>
				<p class="text-xs font-light text-gray-400">
					合格ライン：90点前後 | 現在偏差: {((userGoal?.estimatedScore || 0) > 90
						? '+'
						: '') + ((userGoal?.estimatedScore || 0) - 90)}
				</p>
			</div>

			<!-- 2. Bell Curve / Rival Graph -->
			<div
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col justify-between"
			>
				<h3 class="text-xs tracking-widest text-gray-400 uppercase font-serif mb-2 text-center">
					全国ライバル比較 (想定点分布)
				</h3>
				<!-- Bell Curve visual representation -->
				<div class="flex-grow flex items-end justify-center h-24 relative mb-4">
					<svg class="w-full h-full" viewBox="0 0 200 80">
						<!-- Curve path -->
						<path
							d="M 10 75 Q 50 75 80 50 T 100 15 T 120 50 T 190 75"
							fill="none"
							stroke="currentColor"
							stroke-width="1"
							class="text-gray-300 dark:text-gray-700"
						/>
						<!-- Average Line -->
						<line
							x1="100"
							y1="15"
							x2="100"
							y2="75"
							stroke="currentColor"
							stroke-dasharray="2"
							class="text-gray-300 dark:text-gray-700"
						/>
						<!-- My Position Marker -->
						<circle
							cx={Math.min(
								190,
								Math.max(10, 10 + (180 * (userGoal?.estimatedScore || 0)) / 125)
							)}
							cy={15 +
								60 *
									Math.pow(
										1.5,
										-Math.pow(
											((userGoal?.estimatedScore || 0) - 62.5) / 30,
											2
										)
									)}
							r="4"
							fill="var(--color-brass)"
							class="animate-ping"
						/>
						<circle
							cx={Math.min(
								190,
								Math.max(10, 10 + (180 * (userGoal?.estimatedScore || 0)) / 125)
							)}
							cy={15 +
								60 *
									Math.pow(
										1.5,
										-Math.pow(
											((userGoal?.estimatedScore || 0) - 62.5) / 30,
											2
										)
									)}
							r="4"
							fill="var(--color-brass)"
						/>
					</svg>
					<!-- Labels -->
					<div class="absolute bottom-[-15px] left-0 right-0 flex justify-between text-[8px] text-gray-400">
						<span>0点</span>
						<span>平均 65点</span>
						<span>125点</span>
					</div>
				</div>
				<p class="text-xs font-light text-center text-gray-400">
					あなたは現在、上位約 <span class="text-brass font-bold">42%</span> に位置しています。
				</p>
			</div>

			<!-- 3. Countdown & Target Info -->
			<div
				class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded flex flex-col justify-between"
			>
				<div>
					<h3 class="text-xs tracking-widest text-gray-400 uppercase font-serif mb-4">
						学科試験カウントダウン
					</h3>
					<div class="flex items-baseline space-x-2">
						<span class="text-5xl font-serif font-black text-brass">{daysLeft}</span>
						<span class="text-sm font-light text-gray-400">日後 (2026/07/26)</span>
					</div>
				</div>

				<button onclick={openProgressDialog} class="mt-6 space-y-3 w-full text-left focus:outline-none hover:opacity-85 transition-opacity group cursor-pointer">
					<div class="flex justify-between text-xs font-light">
						<span class="text-gray-400 group-hover:text-brass transition-colors">今週の演習ノルマ（クリックで履歴ダイアログを表示）</span>
						<span class="text-text-light dark:text-text-dark font-medium">12問 / 50問</span>
					</div>
					<progress class="w-full h-1.5 rounded overflow-hidden accent-brass [&::-webkit-progress-bar]:bg-gray-100 dark:[&::-webkit-progress-bar]:bg-gray-900 [&::-webkit-progress-value]:bg-brass [&::-moz-progress-bar]:bg-brass pointer-events-none" value="12" max="50"></progress>
				</button>
			</div>
		</div>

		<!-- BATTLE MAP / TREEMAP AREA -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
					科目別・戦闘マップ（定着度ツリー）
				</h2>
				<div class="flex items-center space-x-4 text-xs font-light text-gray-400">
					<div class="flex items-center space-x-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500"></span>
						<span>安全 (Safe)</span>
					</div>
					<div class="flex items-center space-x-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500"></span>
						<span>不安 (Unstable)</span>
					</div>
					<div class="flex items-center space-x-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500"></span>
						<span>危険 (Critical)</span>
					</div>
					<div class="flex items-center space-x-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-gray-500/10 border border-gray-300 dark:border-gray-800"></span>
						<span>未履修</span>
					</div>
				</div>
			</div>

			<!-- Grid based Combat Map -->
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
				{#each Object.entries(goalInfo?.weights || { '計画': 20, '環境_設備': 20, '法規': 30, '構造': 30, '施工': 25 }) as [subject, weight]}
					{@const subjectTags = tagMatrixList.filter(t => t.parentTopic === subject || (subject === '法規' && (t.tagName === '共用廊下' || t.tagName === '容積率' || t.tagName === '容積率緩和')))}
					<div class="border border-gray-200 dark:border-gray-800 p-6 rounded bg-white dark:bg-bg-dark-sub flex flex-col justify-between">
						<div>
							<div class="flex justify-between items-baseline mb-2">
								<span class="font-serif font-bold text-sm">{subject}</span>
								<span class="text-[10px] text-gray-400 font-light">配点:{weight}</span>
							</div>
							<div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>
						</div>
						
						<!-- Tags under this subject -->
						<div class="space-y-2 mt-4">
							{#if subjectTags.length > 0}
								{#each subjectTags as tag}
									<div class="p-2 border text-[10px] rounded flex justify-between items-center transition-all duration-300 hover:scale-[1.02] {getMasteryColor(tag.aiEstimation?.masteryLevel)}">
										<span class="truncate pr-1">{tag.tagName}</span>
										<span class="font-mono scale-90">{(tag.stats?.totalCorrect || 0)}/{(tag.stats?.totalAttempted || 0)}</span>
									</div>
								{/each}
							{:else}
								<div class="p-2 border border-dashed border-gray-200 dark:border-gray-800 text-[10px] rounded text-center text-gray-400 font-light">
									未履修
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- SUBSCRIPTION CTA (If free user) -->
		{#if user.planStatus === 'free'}
			<div class="border border-dashed border-brass/50 bg-brass/5 p-8 rounded flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
				<div class="space-y-2 text-left">
					<span class="px-2 py-0.5 border border-brass text-[9px] tracking-widest text-brass uppercase rounded font-bold">Premium Plan</span>
					<h3 class="text-md font-serif font-bold text-text-light dark:text-text-dark">
						AI処方特訓＆全問題解放 (月額 980円)
					</h3>
					<p class="text-xs font-light text-gray-400 max-w-xl">
						プレミアムプランに登録すると、夜の30分「AI処方特訓」による混同バグの自動診断、無制限の一問一答、および最新時事コラムの全容を表示させることができます。
					</p>
				</div>
				<button
					onclick={handleUpgrade}
					disabled={billingRedirecting}
					class="w-full md:w-auto px-6 py-3 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 disabled:opacity-50"
				>
					{billingRedirecting ? 'リダイレクト中...' : 'アップグレードする'}
				</button>
			</div>
		{/if}

		<!-- DAILY COLUMN SECTION -->
		<div class="space-y-4">
			<h2 class="text-lg font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
				今日の学習コラム（AI編纂）
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each dailyColumns as column}
					<div class="border border-gray-200 dark:border-gray-800 bg-white dark:bg-bg-dark-sub rounded overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-lg">
						<div>
							<!-- Thumbnail -->
							{#if column.imageUrl}
								<div class="h-40 overflow-hidden bg-gray-100 relative">
									<img
										src={column.imageUrl}
										alt={column.title}
										class="w-full h-full object-cover grayscale opacity-80 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-500"
									/>
									<span class="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur text-[9px] tracking-widest text-white uppercase rounded font-light">
										{column.category}
									</span>
								</div>
							{/if}

							<div class="p-6 space-y-3">
								<h3 class="font-serif font-bold text-sm tracking-wide text-text-light dark:text-text-dark leading-snug group-hover:text-brass transition-colors">
									{column.title}
								</h3>
								<p class="text-xs font-light leading-relaxed text-gray-400 line-clamp-4">
									{column.content}
								</p>
							</div>
						</div>

						<div class="p-6 pt-0 flex flex-col space-y-4">
							<div class="flex flex-wrap gap-1.5">
								{#each column.relatedTags || [] as tag}
									<span class="text-[9px] font-light bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800 text-gray-500 px-2 py-0.5 rounded">
										#{tag}
									</span>
								{/each}
							</div>

							<!-- Image search URL helper -->
							<a
								href="https://www.google.com/search?tbm=isch&q={encodeURIComponent(column.title)}"
								target="_blank"
								class="text-[10px] tracking-widest font-bold text-brass-dark dark:text-brass-light hover:text-brass flex items-center space-x-1"
							>
								<span>ビジュアル脳内定着（画像検索）</span>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
						</div>
					</div>
				{/each}
			</div>
		</div>
		<!-- Progress dialog (modal) -->
		{#if showProgressDialog}
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
				<!-- Modal Container -->
				<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left">
					<!-- Modal Header -->
					<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
						<h3 class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase">
							今週の学習進捗とノート一覧
						</h3>
						<button
							onclick={() => (showProgressDialog = false)}
							class="text-gray-400 hover:text-brass transition-colors focus:outline-none"
							aria-label="閉じる"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- Modal Body (Scrollable) -->
					<div class="p-6 overflow-y-auto space-y-6 flex-grow">
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
									<div class="space-y-3 {index === 0 ? '' : 'pt-6'}">
										<div class="flex items-center justify-between text-[10px] text-gray-400">
											<span>肢 ID: {log.questionId}（{log.subject} • {log.chapter}）</span>
											<span class="font-light">最終演習: {new Date(log.lastAttemptedAt).toLocaleDateString()}</span>
										</div>

										<p class="text-xs font-serif font-light text-text-light dark:text-text-dark leading-relaxed">
											「{log.questionText}」
										</p>

										<div class="flex items-center space-x-4 text-[10px] text-gray-400 font-mono">
											<span>解いた回数: {log.history?.attemptCount || 0}回</span>
											<span class="text-emerald-500">正解: {log.history?.correctCount || 0}回</span>
											<span class="text-rose-500">不正解: {log.history?.incorrectCount || 0}回</span>
										</div>

										<!-- Notebook/Memo edit in modal -->
										<div class="space-y-1.5 pt-2">
											<div class="flex items-center justify-between">
												<label for="modal-note-{log.questionId}" class="text-[8px] font-bold text-brass tracking-widest uppercase">ノート（メモ）</label>
												{#if savingNoteId === log.questionId}
													<span class="text-[8px] text-gray-400 animate-pulse">保存中...</span>
												{/if}
											</div>
											<div class="flex space-x-2">
												<input
													type="text"
													id="modal-note-{log.questionId}"
													bind:value={editingNotes[log.questionId]}
													placeholder="メモを入力..."
													class="flex-grow px-3 py-1.5 text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark transition-all duration-300"
												/>
												<button
													onclick={() => saveProgressNote(log.questionId)}
													disabled={savingNoteId === log.questionId}
													class="px-3 py-1.5 bg-brass hover:bg-brass-dark text-white text-[9px] tracking-wider rounded font-bold transition-all duration-300 disabled:opacity-50"
												>
													保存
												</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Modal Footer -->
					<div class="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/10 flex justify-end">
						<button
							onclick={() => showProgressDialog = false}
							class="px-4 py-2 border border-gray-200 dark:border-gray-800 text-text-light dark:text-text-dark text-[10px] tracking-widest font-bold uppercase rounded hover:border-brass transition-all duration-300 cursor-pointer"
						>
							閉じる
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
