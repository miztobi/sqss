<script lang="ts">
	let { show = $bindable(false), title, onclose, children, footer } = $props();

	function close() {
		show = false;
		onclose?.();
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300"
	>
		<!-- Modal Container -->
		<div
			class="bg-white dark:bg-bg-dark-sub border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left"
		>
			<!-- Modal Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
				<h3 class="font-serif font-bold text-sm tracking-widest text-text-light dark:text-text-dark uppercase">
					{title}
				</h3>
				<button
					onclick={close}
					class="text-gray-400 hover:text-brass transition-colors focus:outline-none"
					aria-label="閉じる"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="p-6 overflow-y-auto space-y-6 flex-grow">
				{@render children?.()}
			</div>

			<!-- Modal Footer -->
			<div
				class="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/10 flex justify-end"
			>
				{#if footer}
					{@render footer()}
				{:else}
					<button
						onclick={close}
						class="px-4 py-2 border border-gray-200 dark:border-gray-800 text-text-light dark:text-text-dark text-[10px] tracking-widest font-bold uppercase rounded hover:border-brass transition-all duration-300 cursor-pointer"
					>
						閉じる
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
