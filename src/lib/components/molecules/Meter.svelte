<script lang="ts">
	let { score = 0, maxScore = 125 } = $props();
</script>

<div class="relative w-36 h-36 flex items-center justify-center">
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
			stroke-dashoffset={251.2 - (251.2 * score) / maxScore}
			stroke-linecap="round"
			class="transition-all duration-1000 ease-out"
		/>
	</svg>
	<div class="absolute flex flex-col items-center">
		<span class="text-4xl font-serif font-black text-text-light dark:text-text-dark">{score}</span>
		<span class="text-[10px] text-gray-400 font-light mt-1">/ {maxScore}点</span>
	</div>
</div>
