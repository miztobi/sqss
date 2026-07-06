<script lang="ts">
	let { score = 0 } = $props();
	let positionX = $derived(Math.min(190, Math.max(10, 10 + (180 * score) / 125)));
	let positionY = $derived(15 + 60 * Math.pow(1.5, -Math.pow((score - 62.5) / 30, 2)));
</script>

<div class="flex-grow flex items-end justify-center h-24 relative mb-4">
	<svg class="w-full h-full" viewBox="0 0 200 80">
		<!-- Curve path -->
		<path
			d="M 10 75 Q 50 75 80 50 T 100 15 T 120 50 T 190 75"
			fill="none"
			stroke="currentColor"
			stroke-width="1"
			class="text-gray-300 dark:text-gray-700"
		/>
		<!-- Average Line -->
		<line
			x1="100"
			y1="15"
			x2="100"
			y2="75"
			stroke="currentColor"
			stroke-dasharray="2"
			class="text-gray-300 dark:text-gray-700"
		/>
		<!-- My Position Marker -->
		<circle
			cx={positionX}
			cy={positionY}
			r="4"
			fill="var(--color-brass)"
			class="animate-ping"
		/>
		<circle cx={positionX} cy={positionY} r="4" fill="var(--color-brass)" />
	</svg>
	<!-- Labels -->
	<div class="absolute bottom-[-15px] left-0 right-0 flex justify-between text-[8px] text-gray-400">
		<span>0点</span>
		<span>平均 65点</span>
		<span>125点</span>
	</div>
</div>
