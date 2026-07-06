<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { userStore } from '$lib/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	let isDarkMode = $state(true); // Default to Dark mode (premium architectural theme)
	let user = $state({ uid: null, email: null, loading: true });

	// Subscribe to store
	userStore.subscribe((val) => {
		user = val as any;
	});

	onMount(async () => {
		// 1. PWA Service Worker Registration
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}

		// 2. Dark Mode check from localStorage or preference
		const storedTheme = localStorage.getItem('theme');
		if (storedTheme === 'light') {
			isDarkMode = false;
		}
		updateDOMTheme();

		// 3. Monitor Auth State
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				// Get or create user document in Firestore
				const userRef = doc(db, `users/${firebaseUser.uid}`);
				let docSnap = await getDoc(userRef);

				if (!docSnap.exists()) {
					// Create default user settings
					const defaultUserData = {
						createdAt: new Date().toISOString(),
						planStatus: 'beta_testing', // Default to beta testing free plan for phase 0
						freePeriodEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year free
						studyPlanType: '1_year_pass'
					};
					await setDoc(userRef, defaultUserData);
					docSnap = await getDoc(userRef);
				}

				const userData = docSnap.data();

				userStore.set({
					uid: firebaseUser.uid,
					email: firebaseUser.email,
					planStatus: userData?.planStatus || 'free',
					studyPlanType: userData?.studyPlanType || '1_year_pass',
					loading: false
				});

				// Also create goal if not exists for user
				const userGoalRef = doc(db, `users/${firebaseUser.uid}/user_goals/1kyu_kenchikushi`);
				const goalSnap = await getDoc(userGoalRef);
				if (!goalSnap.exists()) {
					await setDoc(userGoalRef, {
						goalId: '1kyu_kenchikushi',
						activatedAt: new Date().toISOString(),
						currentWeek: 1,
						currentLoop: 1,
						estimatedScore: 65, // Start with a realistic baseline estimated score
						intensityPreference: 30, // Default 30 min daily intensity
						status: 'on_track'
					});
				}
			} else {
				userStore.set({
					uid: null,
					email: null,
					planStatus: 'free',
					studyPlanType: '1_year_pass',
					loading: false
				});
				// If not on public top page, redirect to home
				if (page.url.pathname !== '/' && page.url.pathname !== '') {
					goto('/');
				}
			}
		});

		return () => unsubscribe();
	});

	function toggleTheme() {
		isDarkMode = !isDarkMode;
		localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
		updateDOMTheme();
	}

	function updateDOMTheme() {
		if (typeof document !== 'undefined') {
			if (isDarkMode) {
				document.documentElement.classList.add('dark');
				document.body.className = 'bg-bg-dark text-text-dark grid-bg-dark min-h-screen';
			} else {
				document.documentElement.classList.remove('dark');
				document.body.className = 'bg-bg-light text-text-light grid-bg-light min-h-screen';
			}
		}
	}

	async function handleLogout() {
		await signOut(auth);
		goto('/');
	}
</script>

<div class="flex flex-col min-h-screen font-sans">
	<!-- Header -->
	<header
		class="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/85 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300"
	>
		<div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
			<!-- Logo -->
			<a href={user.uid ? '/dashboard' : '/'} class="flex items-center space-x-3 group">
				<div
					class="w-8 h-8 rounded border border-brass flex items-center justify-center font-serif font-black text-brass text-lg tracking-tighter bg-gradient-to-br from-brass-light/20 to-brass-dark/20 transition-all duration-300 group-hover:border-brass-light group-hover:scale-105"
				>
					S
				</div>
				<span
					class="font-serif font-bold text-xl tracking-[0.2em] text-text-light dark:text-text-dark group-hover:text-brass transition-colors duration-300"
				>
					SQSS
				</span>
			</a>

			<!-- Nav / Right section -->
			<div class="flex items-center space-x-6">
				{#if user.uid}
					<nav class="hidden md:flex items-center space-x-8 text-sm font-light">
						<a
							href="/dashboard"
							class="hover:text-brass transition-colors {page.url.pathname === '/dashboard'
								? 'text-brass font-normal border-b border-brass pb-1'
								: ''}">ダッシュボード</a
						>
						<a
							href="/practice"
							class="hover:text-brass transition-colors {page.url.pathname === '/practice'
								? 'text-brass font-normal border-b border-brass pb-1'
								: ''}">過去問演習</a
						>
						<a
							href="/special-training"
							class="hover:text-brass transition-colors {page.url.pathname === '/special-training'
								? 'text-brass font-normal border-b border-brass pb-1'
								: ''}">AI処方特訓</a
						>
						<a
							href="/logs"
							class="hover:text-brass transition-colors {page.url.pathname === '/logs'
								? 'text-brass font-normal border-b border-brass pb-1'
								: ''}">学習ログ</a
						>
					</nav>
				{/if}

				<div class="flex items-center space-x-4">
					<!-- Theme Toggle -->
					<button
						onclick={toggleTheme}
						class="p-2 rounded-full border border-gray-200 dark:border-gray-800 hover:border-brass dark:hover:border-brass transition-all duration-300 text-gray-500 dark:text-gray-400"
						aria-label="テーマ切り替え"
					>
						{#if isDarkMode}
							<!-- Sun icon -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						{:else}
							<!-- Moon icon -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
								/>
							</svg>
						{/if}
					</button>

					<!-- User Menu / Sign Out -->
					{#if !user.loading}
						{#if user.uid}
							<div
								class="flex items-center space-x-3 text-sm border-l border-gray-200 dark:border-gray-800 pl-4"
							>
								<span
									class="hidden lg:inline text-gray-500 dark:text-gray-400 font-light truncate max-w-[150px]"
									>{user.email}</span
								>
								<button
									onclick={handleLogout}
									class="px-3 py-1.5 border border-gray-200 dark:border-gray-800 hover:border-red-500 hover:text-red-500 text-xs rounded transition-all duration-300 font-light"
								>
									サインアウト
								</button>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content Area -->
	<main class="flex-grow flex flex-col">
		{#if user.loading}
			<div class="flex-grow flex items-center justify-center min-h-[50vh]">
				<div class="flex flex-col items-center space-y-4">
					<div class="w-10 h-10 border-2 border-brass border-t-transparent rounded-full animate-spin">
					</div>
					<p
						class="font-serif text-sm tracking-[0.25em] text-gray-500 dark:text-gray-400 animate-pulse"
					>
						SQSS LOADING
					</p>
				</div>
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>

	<!-- Footer -->
	<footer
		class="py-8 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 bg-white/50 dark:bg-black/50 transition-colors duration-300"
	>
		<div
			class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0"
		>
			<div class="font-light">
				&copy; {new Date().getFullYear()} SQSS. All rights reserved.
			</div>
			<div class="flex space-x-6 font-light">
				<a href="/" class="hover:text-brass transition-colors">免責事項</a>
				<a href="/" class="hover:text-brass transition-colors">利用規約</a>
				<a href="/" class="hover:text-brass transition-colors">プライバシーポリシー</a>
			</div>
		</div>
	</footer>
</div>
