<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
	import type { Question } from '$lib/types';
	import { goto } from '$app/navigation';

	let user = $state({ uid: null, loading: true });
	let questions = $state<Question[]>([]);
	let currentIndex = $state(0);
	let answers = $state<Record<string, 'O' | 'X'>>({});
	let isSessionFinished = $state(false);
	let loadingData = $state(true);

	// Notes states
	let notes = $state<Record<string, string>>({});
	let noteStatus = $state<Record<string, string>>({}); // 'idle' | 'saving' | 'saved' | 'error'

	// Session type (morning or evening based on time)
	let sessionType = $state<'morning' | 'evening'>('morning');

	async function saveNote(questionId: string) {
		if (!user.uid) return;
		const text = notes[questionId] || '';
		noteStatus[questionId] = 'saving';
		try {
			const ref = doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi/questionLogs/${questionId}`);
			await setDoc(ref, { note: text }, { merge: true });
			noteStatus[questionId] = 'saved';
			setTimeout(() => {
				noteStatus[questionId] = 'idle';
			}, 2000);
		} catch (e) {
			console.error(e);
			noteStatus[questionId] = 'error';
		}
	}

	userStore.subscribe((val) => {
		user = val as any;
	});

	onMount(async () => {
		// Determine session type based on current time
		const hour = new Date().getHours();
		sessionType = hour < 12 ? 'morning' : 'evening';

		if (user.uid) {
			try {
				// Load past questions from Firestore
				const questionsSnap = await getDocs(
					collection(db, 'goals/1kyu_kenchikushi/past_questions')
				);
				const tempQuestions: Question[] = [];
				questionsSnap.forEach((doc) => {
					tempQuestions.push({ questionId: doc.id, ...doc.data() } as Question);
				});

				// Slice to 10 questions max for daily set (fallback to all if < 10)
				questions = tempQuestions.slice(0, 10);

				// Load saved session if exists
				const savedSession = localStorage.getItem('sqss_practice_session');
				if (savedSession) {
					const session = JSON.parse(savedSession);
					// Verify it matches the current user and question set
					if (session.userId === user.uid && session.questionsHash === getQuestionsHash(questions)) {
						if (confirm('前回の未完了セッションがあります。再開しますか？')) {
							currentIndex = session.currentIndex;
							answers = session.answers;
						} else {
							localStorage.removeItem('sqss_practice_session');
						}
					}
				}
			} catch (e) {
				console.error('Error fetching questions:', e);
			} finally {
				loadingData = false;
			}
		}
	});

	function getQuestionsHash(qs: Question[]) {
		return qs.map((q) => q.questionId).join(',');
	}

	function saveSession() {
		if (!user.uid) return;
		const session = {
			userId: user.uid,
			questionsHash: getQuestionsHash(questions),
			currentIndex,
			answers
		};
		localStorage.setItem('sqss_practice_session', JSON.stringify(session));
	}

	function handleAnswer(answer: 'O' | 'X') {
		const currentQuestion = questions[currentIndex];
		answers[currentQuestion.questionId] = answer;
		saveSession();

		if (currentIndex < questions.length - 1) {
			currentIndex++;
		} else {
			finishSession();
		}
	}

	async function finishSession() {
		isSessionFinished = true;
		localStorage.removeItem('sqss_practice_session');

		// Post results to increment API
		if (user.uid) {
			for (const q of questions) {
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
					console.error('Error logging result for question:', q.questionId, e);
				}
			}
		}
	}

	// Score metrics
	let correctCount = $derived(
		questions.filter((q) => answers[q.questionId] === q.correctAnswer).length
	);
	let scorePercentage = $derived(
		questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
	);
</script>

<div class="max-w-3xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center">
	{#if loadingData}
		<div class="flex items-center justify-center min-h-[40vh]">
			<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if questions.length === 0}
		<div class="text-center py-12 bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded">
			<p class="font-serif text-gray-500 dark:text-gray-400">登録されている問題がありません。</p>
			<a href="/dashboard" class="mt-4 inline-block text-sm text-brass hover:underline">ダッシュボードへ戻る</a>
		</div>
	{:else if !isSessionFinished}
		<!-- QUESTION EXERCISE SCREEN -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 md:p-12 rounded flex flex-col justify-between min-h-[450px] shadow-lg transition-colors duration-300">
			<!-- Header Info -->
			<div class="flex items-center justify-between text-xs tracking-widest text-gray-400 font-serif mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
				<span>{sessionType === 'morning' ? '朝の10問過去問' : '夕方の10問過去問'}</span>
				<span>{currentIndex + 1} / {questions.length} 問</span>
			</div>

			<!-- Main Question Box -->
			<div class="flex-grow flex flex-col justify-center space-y-6">
				<div class="flex flex-wrap gap-2">
					<span class="px-2.5 py-0.5 bg-brass/10 border border-brass/30 text-[10px] text-brass rounded font-bold uppercase tracking-wider">
						{questions[currentIndex].subject}
					</span>
					<span class="px-2.5 py-0.5 bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800 text-[10px] text-gray-400 rounded">
						{questions[currentIndex].chapter}
					</span>
				</div>

				<!-- Question Text -->
				<p class="font-serif text-md md:text-lg text-text-light dark:text-text-dark leading-relaxed font-light">
					「{questions[currentIndex].questionText}」
				</p>
			</div>

			<!-- Footer One-Hand Tap Choices -->
			<div class="grid grid-cols-2 gap-6 mt-12">
				<button
					onclick={() => handleAnswer('O')}
					class="py-6 border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 font-serif text-3xl font-bold rounded-lg transition-all duration-300 active:scale-[0.97]"
				>
					O
				</button>
				<button
					onclick={() => handleAnswer('X')}
					class="py-6 border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-serif text-3xl font-bold rounded-lg transition-all duration-300 active:scale-[0.97]"
				>
					X
				</button>
			</div>

			<!-- Back navigation -->
			<div class="mt-6 text-center">
				<button
					onclick={() => {
						if (confirm('現在の進捗を一時保存して中断しますか？')) {
							saveSession();
							goto('/dashboard');
						}
					}}
					class="text-[10px] text-gray-400 hover:text-brass transition-colors tracking-widest font-light uppercase"
				>
					一時中断してダッシュボードに戻る
				</button>
			</div>
		</div>
	{:else}
		<!-- EXERCISE RESULTS SCREEN -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 md:p-12 rounded shadow-lg transition-colors duration-300 space-y-8">
			<!-- Result Header -->
			<div class="text-center space-y-4">
				<span class="text-[10px] tracking-[0.3em] text-brass font-serif uppercase">Exercise Completed</span>
				<h2 class="text-2xl font-serif font-black text-text-light dark:text-text-dark">演習結果レポート</h2>
				
				<!-- Score Badge -->
				<div class="inline-flex flex-col items-center justify-center p-6 rounded-full border border-brass bg-brass/5 mt-4">
					<span class="text-3xl font-serif font-black text-brass">{correctCount} / {questions.length}</span>
					<span class="text-[9px] text-gray-400 font-light mt-1">正解率 {scorePercentage}%</span>
				</div>
			</div>

			<!-- Review List -->
			<div class="space-y-4">
				<h3 class="text-xs tracking-widest font-serif text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800 pb-2">
					問題の確認・解説
				</h3>
				
				<div class="space-y-6 divide-y divide-gray-100 dark:divide-gray-800/50">
					{#each questions as q, index}
						{@const userAns = answers[q.questionId]}
						{@const isCorrect = userAns === q.correctAnswer}
						<div class="pt-6 space-y-3 {index === 0 ? 'pt-0' : ''}">
							<div class="flex items-center justify-between">
								<span class="text-[10px] text-gray-400">肢 {index + 1}（{q.subject}・{q.chapter}）</span>
								<span class="px-2.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider {isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}">
									{isCorrect ? '正解' : '不正解'}
								</span>
							</div>

							<p class="text-sm font-serif font-light text-text-light dark:text-text-dark leading-relaxed">
								{q.questionText}
							</p>

							<div class="p-4 bg-gray-50 dark:bg-black/20 border border-gray-150 dark:border-gray-800 rounded space-y-2">
								<div class="text-[10px] text-gray-400 font-bold">
									正解: {q.correctAnswer} | あなたの解答: {userAns}
								</div>
								<p class="text-xs font-light text-gray-500 dark:text-gray-400 leading-relaxed">
									{q.explanation}
								</p>
							</div>

							<!-- Note saving form -->
							<div class="mt-2 space-y-2 border-t border-gray-100 dark:border-gray-800/40 pt-3">
								<div class="flex items-center justify-between">
									<label for="note-{q.questionId}" class="text-[9px] font-bold text-brass tracking-wider uppercase">学習ノート（メモ）</label>
									{#if noteStatus[q.questionId] === 'saving'}
										<span class="text-[9px] text-gray-400">保存中...</span>
									{:else if noteStatus[q.questionId] === 'saved'}
										<span class="text-[9px] text-emerald-500 font-bold">✓ 保存されました</span>
									{:else if noteStatus[q.questionId] === 'error'}
										<span class="text-[9px] text-rose-500 font-bold">保存エラー</span>
									{/if}
								</div>
								<div class="flex space-x-2">
									<textarea
										id="note-{q.questionId}"
										bind:value={notes[q.questionId]}
										placeholder="この問題に関するメモを書き残せます（例: 共用廊下は容積率不算入！地階の1/3制限と混同しないこと）"
										class="flex-grow p-2 text-xs bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark resize-none h-12 transition-all duration-300"
									></textarea>
									<button
										onclick={() => saveNote(q.questionId)}
										class="px-3 py-2 bg-brass hover:bg-brass-dark text-white text-[10px] tracking-wider rounded font-bold transition-all duration-300 active:scale-[0.97] self-end"
									>
										保存
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Back to Dashboard -->
			<div class="text-center pt-6">
				<a
					href="/dashboard"
					class="px-8 py-3 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 inline-block"
				>
					ダッシュボードに戻る
				</a>
			</div>
		</div>
	{/if}
</div>
