<script lang="ts">
	let {
		type = 'button',
		variant = 'primary',
		oxType = 'O',
		disabled = false,
		onclick,
		class: className = '',
		children
	} = $props();
</script>

{#if variant === 'ox'}
	<button
		{type}
		{disabled}
		{onclick}
		class="py-6 border font-serif text-3xl font-bold rounded-lg transition-all duration-300 active:scale-[0.97] disabled:opacity-50 {oxType ===
		'O'
			? 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500'
			: 'border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500'} {className}"
	>
		{oxType}
	</button>
{:else}
	<button
		{type}
		{disabled}
		{onclick}
		class="transition-all duration-300 active:scale-[0.98] disabled:opacity-50 {variant ===
		'primary'
			? 'bg-brass hover:bg-brass-dark text-white text-xs tracking-widest font-bold rounded px-6 py-2.5'
			: ''} {variant === 'outline'
			? 'border border-gray-200 dark:border-gray-800 text-text-light dark:text-text-dark text-xs tracking-widest font-light rounded hover:border-brass px-6 py-2.5'
			: ''} {variant === 'dashed'
			? 'border border-dashed border-brass/50 text-brass hover:border-brass hover:bg-brass/5 dark:hover:bg-brass/10 text-xs tracking-widest font-light rounded px-6 py-2.5'
			: ''} {className}"
	>
		{@render children?.()}
	</button>
{/if}
