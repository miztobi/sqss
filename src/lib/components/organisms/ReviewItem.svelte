<script lang="ts">
	import { db } from '$lib/firebase';
	import { doc, setDoc } from 'firebase/firestore';

	let {
		userId,
		questionId,
		index,
		subject,
		chapter,
		questionText,
		correctAnswer,
		explanation,
		userAnswer = null,
		initialNote = '',
		onSave
	}: {
		userId: string | null;
		questionId: string;
		index: number;
		subject: string;
		chapter: string;
		questionText: string;
		correctAnswer: 'O' | 'X';
		explanation: string;
		userAnswer?: 'O' | 'X' | null;
		initialNote?: string;
		onSave?: (id: string, text: string) => void;
	} = $props();

	let noteText = $state('');
	let noteStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	// Keep local note updated if initialNote updates (e.g. async fetch)
	$effect(() => {
		noteText = initialNote;
	});

	async function handleSave() {
		if (!userId) return;
		noteStatus = 'saving';
		try {
			const ref = doc(
				db,
				`users/${userId}/user_goals/1kyu_kenchikushi/questionLogs/${questionId}`
			);
			await setDoc(ref, { note: noteText }, { merge: true });
			noteStatus = 'saved';
			onSave?.(questionId, noteText);
			setTimeout(() => {
				noteStatus = 'idle';
			}, 2000);
		} catch (e) {
			console.error(e);
			noteStatus = 'error';
		}
	}

	let isCorrect = $derived(userAnswer === correctAnswer);
</script>

<div class="pt-6 space-y-3">
	<div class="flex items-center justify-between">
		<span class="text-[10px] text-gray-400">肢 {index + 1}（{subject}・{chapter}）</span>
		{#if userAnswer !== null}
			<span
				class="px-2.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider {isCorrect
					? 'bg-emerald-500/10 text-emerald-500'
					: 'bg-rose-500/10 text-rose-500'}"
			>
				{isCorrect ? '正解' : '不正解'}
			</span>
		{/if}
	</div>

	<p class="text-sm font-serif font-light text-text-light dark:text-text-dark leading-relaxed">
		{questionText}
	</p>

	<div
		class="p-4 bg-gray-50 dark:bg-black/20 border border-gray-150 dark:border-gray-800 rounded space-y-2"
	>
		<div class="text-[10px] text-gray-400 font-bold">
			正解: {correctAnswer}
			{#if userAnswer !== null}| あなたの解答: {userAnswer}{/if}
		</div>
		<p class="text-xs font-light text-gray-500 dark:text-gray-400 leading-relaxed">
			{explanation}
		</p>
	</div>

	<!-- Note saving form -->
	<div class="mt-2 space-y-2 border-t border-gray-100 dark:border-gray-800/40 pt-3 text-left">
		<div class="flex items-center justify-between">
			<label
				for="note-{questionId}"
				class="text-[9px] font-bold text-brass tracking-wider uppercase">学習ノート（メモ）</label
			>
			{#if noteStatus === 'saving'}
				<span class="text-[9px] text-gray-400">保存中...</span>
			{:else if noteStatus === 'saved'}
				<span class="text-[9px] text-emerald-500 font-bold">✓ 保存されました</span>
			{:else if noteStatus === 'error'}
				<span class="text-[9px] text-rose-500 font-bold">保存エラー</span>
			{/if}
		</div>
		<div class="flex space-x-2">
			<textarea
				id="note-{questionId}"
				bind:value={noteText}
				placeholder="この問題に関するメモを書き残せます..."
				class="flex-grow p-2 text-xs bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark resize-none h-12 transition-all duration-300"
			></textarea>
			<button
				onclick={handleSave}
				class="px-3 py-2 bg-brass hover:bg-brass-dark text-white text-[10px] tracking-wider rounded font-bold transition-all duration-300 active:scale-[0.97] self-end"
			>
				保存
			</button>
		</div>
	</div>
</div>
