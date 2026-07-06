<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/store';
	import { db } from '$lib/firebase';
	import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
	import type { DailyColumn } from '$lib/types';

	let user = $state({ uid: null, planStatus: 'free', loading: true });
	let dailyColumns = $state<DailyColumn[]>([]);
	let loadingData = $state(true);

	// Story post form variables
	let storyText = $state('');
	let nickname = $state('');
	let selectedTags = $state<string[]>([]);
	let isSubmittingStory = $state(false);
	let storyStatusMessage = $state('');

	const storyTags = ['#独学', '#予備校併用', '#短期集中', '#社会人受験', '#一発合格'];

	userStore.subscribe((val) => {
		user = val as any;
	});

	onMount(async () => {
		if (user.uid) {
			try {
				// Fetch columns
				const columnsSnap = await getDocs(collection(db, 'goals/1kyu_kenchikushi/daily_columns'));
				const tempCols: DailyColumn[] = [];
				columnsSnap.forEach((doc) => {
					tempCols.push({ columnId: doc.id, ...doc.data() } as DailyColumn);
				});
				dailyColumns = tempCols;
			} catch (e) {
				console.error(e);
			} finally {
				loadingData = false;
			}
		}
	});

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	async function handleSubmitStory(e: Event) {
		e.preventDefault();
		if (!user.uid || !storyText || !nickname) return;

		isSubmittingStory = true;
		storyStatusMessage = '';

		try {
			const storyRef = doc(db, `users/${user.uid}/stories/${new Date().getTime()}`);
			await setDoc(storyRef, {
				nickname,
				content: storyText,
				tags: selectedTags,
				createdAt: new Date().toISOString()
			});
			storyStatusMessage = '体験談を投稿しました。貴重なシェアをありがとうございます！';
			nickname = '';
			storyText = '';
			selectedTags = [];
		} catch (error: any) {
			console.error(error);
			storyStatusMessage = '投稿に失敗しました。';
		} finally {
			isSubmittingStory = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto px-6 py-12 flex-grow flex flex-col space-y-12">
	{#if loadingData}
		<div class="flex-grow flex items-center justify-center min-h-[40vh]">
			<div class="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<!-- 1. Weekly General Report from AI -->
		<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-8 rounded shadow-md space-y-6">
			<div class="space-y-1">
				<span class="text-[9px] tracking-widest text-brass font-serif uppercase">Weekly AI Review</span>
				<h2 class="text-lg font-serif font-bold text-text-light dark:text-text-dark uppercase">
					週次学習総括レポート
				</h2>
			</div>
			
			<div class="border-t border-gray-150 dark:border-gray-800/80 pt-4 space-y-4">
				<p class="text-sm font-serif font-light leading-relaxed text-text-light dark:text-text-dark">
					今週は「法規（容積率）」および「計画（共同住宅）」の分野を中心に学習が進みました。
					容積率の共用廊下不算入について、地階の緩和制限（1/3上限）と混同してしまいがちですが、金曜日の処方特訓を経てその差異が論理的に整理されつつあります。
					来週は「構造（鉄筋・鉄骨）」の基礎数値暗記に着手する予定です。このペースを維持しましょう。
				</p>
				
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t border-gray-100 dark:border-gray-800/40 pt-4">
					<div class="p-4 bg-gray-50 dark:bg-black/10 rounded">
						<div class="text-[10px] text-gray-400 font-light">総回答数</div>
						<div class="text-xl font-serif font-black text-brass">124問</div>
					</div>
					<div class="p-4 bg-gray-50 dark:bg-black/10 rounded">
						<div class="text-[10px] text-gray-400 font-light">平均正解率</div>
						<div class="text-xl font-serif font-black text-brass">74%</div>
					</div>
					<div class="p-4 bg-gray-50 dark:bg-black/10 rounded">
						<div class="text-[10px] text-gray-400 font-light">バグ修正完了数</div>
						<div class="text-xl font-serif font-black text-brass">3個</div>
					</div>
					<div class="p-4 bg-gray-50 dark:bg-black/10 rounded">
						<div class="text-[10px] text-gray-400 font-light">学習日数</div>
						<div class="text-xl font-serif font-black text-brass">6日 / 7日</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 2. Column Archive & Story Submission Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Columns Archive List (Left 2 cols) -->
			<div class="lg:col-span-2 space-y-6">
				<h2 class="text-md font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
					コラムアーカイブ
				</h2>

				<div class="space-y-4">
					{#each dailyColumns as column}
						<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-6 rounded transition-all duration-300 hover:border-brass/40 flex items-start space-x-6">
							{#if column.imageUrl}
								<div class="hidden sm:block w-24 h-24 rounded overflow-hidden flex-shrink-0 bg-gray-100">
									<img src={column.imageUrl} alt={column.title} class="w-full h-full object-cover grayscale" />
								</div>
							{/if}
							
							<div class="flex-grow space-y-2">
								<div class="flex justify-between items-baseline">
									<span class="text-[9px] tracking-widest text-brass-dark dark:text-brass-light font-bold uppercase">{column.category}</span>
									<span class="text-[9px] text-gray-400 font-light">{new Date(column.publishedAt).toLocaleDateString()}</span>
								</div>
								<h3 class="font-serif font-bold text-sm text-text-light dark:text-text-dark hover:text-brass transition-colors">
									<a href="https://www.google.com/search?tbm=isch&q={encodeURIComponent(column.title)}" target="_blank" class="flex items-center space-x-1">
										<span>{column.title}</span>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 inline text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</a>
								</h3>
								<p class="text-xs font-light text-gray-400 leading-relaxed line-clamp-2">
									{column.content}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Story Posting Form (Right 1 col) -->
			<div class="space-y-6">
				<h2 class="text-md font-serif font-bold tracking-widest text-text-light dark:text-text-dark uppercase">
					合格体験談・学習報告のシェア
				</h2>

				<div class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 p-6 rounded shadow-md space-y-4">
					{#if storyStatusMessage}
						<div class="p-3 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">
							{storyStatusMessage}
						</div>
					{/if}

					<form onsubmit={handleSubmitStory} class="space-y-4">
						<div class="space-y-1.5">
							<label for="nickname" class="text-[10px] tracking-widest text-gray-400 uppercase">ニックネーム</label>
							<input
								type="text"
								id="nickname"
								bind:value={nickname}
								required
								placeholder="例：合格0年目"
								class="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark transition-all duration-300"
							/>
						</div>

						<div class="space-y-1.5">
							<label for="story" class="text-[10px] tracking-widest text-gray-400 uppercase">体験談・学習レポート</label>
							<textarea
								id="story"
								rows="5"
								bind:value={storyText}
								required
								placeholder="例：今日、AIの指示通りに法令集の52条を読み込みました！最初は難しかったですが、O/Xテストで満点が取れるようになり自信がつきました。"
								class="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 focus:border-brass outline-none rounded text-text-light dark:text-text-dark transition-all duration-300 resize-none"
							></textarea>
						</div>

						<div class="space-y-2">
							<span class="text-[10px] tracking-widest text-gray-400 uppercase block">学習スタイル</span>
							<div class="flex flex-wrap gap-1.5">
								{#each storyTags as tag}
									<button
										type="button"
										onclick={() => toggleTag(tag)}
										class="px-2.5 py-1 text-[9px] rounded border transition-all duration-300 {selectedTags.includes(tag) ? 'bg-brass border-brass text-white font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-400 bg-transparent hover:border-brass/50'}"
									>
										{tag}
									</button>
								{/each}
							</div>
						</div>

						<button
							type="submit"
							disabled={isSubmittingStory}
							class="w-full py-2.5 bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded transition-all duration-300 disabled:opacity-50"
						>
							{isSubmittingStory ? '送信中...' : '体験談を投稿する'}
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>
