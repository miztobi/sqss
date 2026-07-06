<script lang="ts">
	let { value = 0, max = 100, class: className = '' } = $props();
</script>

<progress
	class="w-full h-1.5 rounded overflow-hidden accent-brass [&::-webkit-progress-bar]:bg-gray-100 dark:[&::-webkit-progress-bar]:bg-gray-900 [&::-webkit-progress-value]:bg-brass [&::-moz-progress-bar]:bg-brass {className}"
	{value}
	{max}
></progress>
