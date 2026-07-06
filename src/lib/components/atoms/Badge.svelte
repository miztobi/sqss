<script lang="ts">
	let { text, variant = 'subject', class: className = '' } = $props();
</script>

<span
	class="px-2.5 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider transition-colors duration-300 {variant ===
	'subject'
		? 'bg-brass/10 border border-brass/30 text-brass'
		: ''} {variant === 'column'
		? 'bg-black/60 backdrop-blur text-white font-light'
		: ''} {variant === 'status'
		? 'bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800 text-gray-400 font-light'
		: ''} {className}"
>
	{text}
</span>
