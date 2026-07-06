<script lang="ts">
	import Badge from '../atoms/Badge.svelte';
	let { column, onclick }: { column: any; onclick?: (e: MouseEvent) => void } = $props();
</script>

<button
	{onclick}
	type="button"
	class="border border-gray-200 dark:border-gray-800 bg-white dark:bg-bg-dark-sub rounded p-6 flex flex-col justify-between group transition-all duration-300 hover:shadow-lg w-full text-left focus:outline-none cursor-pointer"
>
	<div class="space-y-3 w-full">
		<div class="flex items-center justify-between">
			<Badge text={column.category} variant="column" />
			<span class="text-[9px] text-gray-400 group-hover:text-brass transition-colors"
				>詳細を読む →</span
			>
		</div>
		<h3
			class="font-serif font-bold text-sm tracking-wide text-text-light dark:text-text-dark leading-snug group-hover:text-brass transition-colors"
		>
			{column.title}
		</h3>
		<p class="text-xs font-light leading-relaxed text-gray-400 line-clamp-3">
			{column.content}
		</p>
	</div>

	<div
		class="pt-4 flex flex-wrap gap-1.5 border-t border-gray-150 dark:border-gray-800/40 mt-4 w-full"
	>
		{#each column.relatedTags || [] as tag}
			<span
				class="text-[9px] font-light bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800 text-gray-500 px-2 py-0.5 rounded"
			>
				#{tag}
			</span>
		{/each}
	</div>
</button>
