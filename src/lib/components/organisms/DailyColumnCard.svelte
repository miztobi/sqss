<script lang="ts">
	import Badge from '../atoms/Badge.svelte';
	let { column } = $props();
</script>

<div
	class="border border-gray-200 dark:border-gray-800 bg-white dark:bg-bg-dark-sub rounded overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-lg"
>
	<div>
		<!-- Thumbnail -->
		{#if column.imageUrl}
			<div class="h-40 overflow-hidden bg-gray-100 relative">
				<img
					src={column.imageUrl}
					alt={column.title}
					class="w-full h-full object-cover grayscale opacity-80 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-500"
				/>
				<div class="absolute top-3 left-3">
					<Badge text={column.category} variant="column" />
				</div>
			</div>
		{/if}

		<div class="p-6 space-y-3">
			<h3
				class="font-serif font-bold text-sm tracking-wide text-text-light dark:text-text-dark leading-snug group-hover:text-brass transition-colors"
			>
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
				<span
					class="text-[9px] font-light bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800 text-gray-500 px-2 py-0.5 rounded"
				>
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
