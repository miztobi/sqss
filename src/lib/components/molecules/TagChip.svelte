<script lang="ts">
	let { tagName, masteryLevel, correctCount = null, attemptedCount = null } = $props();

	function getMasteryColor(level: 'safe' | 'unstable' | 'critical' | undefined) {
		if (level === 'safe')
			return 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400';
		if (level === 'unstable')
			return 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400';
		if (level === 'critical')
			return 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400';
		return 'bg-gray-500/10 border-gray-300 dark:border-gray-800 text-gray-400';
	}
</script>

<div
	class="p-2 border text-[10px] rounded flex justify-between items-center transition-all duration-300 hover:scale-[1.02] {getMasteryColor(
		masteryLevel
	)}"
>
	<span class="truncate pr-1">{tagName}</span>
	{#if correctCount !== null && attemptedCount !== null}
		<span class="font-mono scale-90">{correctCount}/{attemptedCount}</span>
	{/if}
</div>
