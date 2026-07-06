import { writable } from 'svelte/store';

export interface UserState {
	uid: string | null;
	email: string | null;
	planStatus: 'beta_testing' | 'premium_active' | 'premium_free_year' | 'free';
	studyPlanType: '1_year_pass' | '2_year_pass';
	loading: boolean;
}

export const userStore = writable<UserState>({
	uid: null,
	email: null,
	planStatus: 'free',
	studyPlanType: '1_year_pass',
	loading: true
});
