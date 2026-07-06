<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { doc, getDoc, getDocs, collection, updateDoc } from 'firebase/firestore';
	import type { UserGoal, Goal, TagMatrix } from '$lib/types';

	let user = $state({ uid: null, loading: true });
	let userGoal = $state<UserGoal | null>(null);
	let goalInfo = $state<Goal | null>(null);
	let tagMatrixList = $state<TagMatrix[]>([]);
	let loadingData = $state(true);
	let isSavingLoop = $state(false);

	userStore.subscribe((val) => {
		user = val as any;
	});

	onMount(async () => {
		if (user.uid) {
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
			} catch (e) {
				console.error(e);
			} finally {
				loadingData = false;
			}
		}
	});

	async function updateLoopMode(loop: number) {
		if (!user.uid || !userGoal) return;
		isSavingLoop = true;
		try {
			const ref = doc(db, `users/${user.uid}/user_goals/1kyu_kenchikushi`);
			await updateDoc(ref, { currentLoop: loop });
			userGoal.currentLoop = loop;
		} catch (e) {
			console.error(e);
			alert('周回モードの更新に失敗しました');
		} finally {
			isSavingLoop = false;
		}
	}

	// Calculate subject mastery score
	function getSubjectMastery(subject: string, weight: number) {
		const subjectTags = tagMatrixList.filter(
			(t) =>
				t.parentTopic === subject ||
				(subject === '法規' &&
					(t.tagName === '共用廊下' || t.tagName === '容積率' || t.tagName === '容積率緩和'))
		);
		if (subjectTags.length === 0) return { percentage: 0, estimatedScore: 0 };

		const totalCorrect = subjectTags.reduce((acc, t) => acc + (t.stats?.totalCorrect || 0), 0);
		const totalAttempted = subjectTags.reduce((acc, t) => acc + (t.stats?.totalAttempted || 0), 0);

		const ratio = totalAttempted > 0 ? totalCorrect / totalAttempted : 0;
		const estimatedScore = Math.round(ratio * weight);
		return {
			percentage: Math.round(ratio * 100),
			estimatedScore
		};
	}

	const loopModes = [
		{ value: 1, label: '1周目：最速基礎構築', desc: '基本知識の網羅的マッピングと暗記' },
		{ value: 2, label: '2周目：弱点特訓補強', desc: '誤答の多い苦手タグ・知識バグの重点補正' },
		{ value: 3, label: '3周目：時事予想実戦', desc: '新法改正や近年の時事コラムに関連した発展演習' }
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
				>Study Loop and Mastery</span
			>
			<h1 class="text-3xl font-serif font-black text-text-light dark:text-text-dark uppercase">
				習得度・カリキュラム状況
			</h1>
			<p class="text-xs font-light text-gray-400">
				現在の周回フェーズと、科目ごとの定着・想定得点のリアルタイム進捗状況です。
			</p>
		</div>

		<!-- Loop/Phase Selector -->
		<div
			class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6"
		>
			<div
				class="flex justify-between items-baseline border-b border-gray-100 dark:border-gray-800 pb-4"
			>
				<h3 class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase">
					現在の履修範囲（周回モード）
				</h3>
				{#if isSavingLoop}
					<span class="text-[10px] text-gray-400">更新中...</span>
				{/if}
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each loopModes as mode}
					<button
						onclick={() => updateLoopMode(mode.value)}
						disabled={isSavingLoop}
						class="p-6 border text-left rounded transition-all duration-300 active:scale-[0.98] {userGoal?.currentLoop ===
						mode.value
							? 'border-brass bg-brass/5'
							: 'border-gray-200 dark:border-gray-800 hover:border-brass/40 bg-transparent'}"
					>
						<span
							class="text-[10px] font-bold tracking-widest uppercase block mb-1 {userGoal?.currentLoop ===
							mode.value
								? 'text-brass'
								: 'text-gray-400'}"
						>
							Phase 0{mode.value}
						</span>
						<h4 class="font-serif font-bold text-sm text-text-light dark:text-text-dark mb-2">
							{mode.label}
						</h4>
						<p class="text-[10px] font-light text-gray-400 leading-relaxed">
							{mode.desc}
						</p>
					</button>
				{/each}
			</div>
		</div>

		<!-- Subject-by-subject mastery -->
		<div class="space-y-6">
			<h2 class="text-md font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
				科目別習得得点
			</h2>

			<div class="space-y-4">
				{#each Object.entries(goalInfo?.weights || { 計画: 20, 環境_設備: 20, 法規: 30, 構造: 30, 施工: 25 }) as [subject, weight]}
					{@const mastery = getSubjectMastery(subject, weight)}
					<div
						class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-6 rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
					>
						<!-- Subject Info -->
						<div class="md:w-48 flex-shrink-0 space-y-1">
							<h3 class="font-serif font-bold text-sm text-text-light dark:text-text-dark">
								{subject}
							</h3>
							<div class="text-[10px] text-gray-400 font-light">
								配点ウエイト: {weight}点満点
							</div>
						</div>

						<!-- Progress Gauge -->
						<div class="flex-grow space-y-2">
							<div class="flex justify-between text-[10px] font-light text-gray-400">
								<span>習得度</span>
								<span>{mastery.percentage}%</span>
							</div>
							<div class="w-full bg-gray-100 dark:bg-black/30 h-2 rounded overflow-hidden">
								<div class="bg-brass h-full transition-all duration-1000" style="width: {mastery.percentage}%"></div>
							</div>
						</div>

						<!-- Score Stats -->
						<div class="md:w-36 text-left md:text-right flex-shrink-0 space-y-1">
							<div class="text-[10px] text-gray-400 font-light">想定獲得点</div>
							<div class="flex items-baseline md:justify-end space-x-1">
								<span class="text-2xl font-serif font-black text-brass">{mastery.estimatedScore}</span>
								<span class="text-[10px] text-gray-400">/ {weight}点</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
