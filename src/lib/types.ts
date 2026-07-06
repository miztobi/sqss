export interface User {
	createdAt: string;
	planStatus: 'beta_testing' | 'premium_active' | 'premium_free_year';
	freePeriodEndsAt: string;
	stripeSubscriptionId?: string;
	studyPlanType: '1_year_pass' | '2_year_pass';
}

export interface UserGoal {
	goalId: string;
	activatedAt: string;
	currentWeek: number;
	currentLoop: number;
	estimatedScore: number;
	intensityPreference: number; // 毎晩の勉強強度（15, 30, 60分）
	status: 'on_track' | 'behind';
}

export interface TagStats {
	totalAttempted: number;
	totalCorrect: number;
	totalIncorrect: number;
	consecutiveIncorrect: number;
}

export interface TagAiEstimation {
	masteryLevel: 'safe' | 'unstable' | 'critical';
	calculatedVectorWeight: number;
	lastUpdated: string;
}

export interface TagMatrix {
	tagName: string;
	parentTopic: string;
	stats: TagStats;
	aiEstimation: TagAiEstimation;
}

export interface QuestionLogStats {
	attemptCount: number;
	correctCount: number;
	incorrectCount: number;
}

export interface QuestionLog {
	questionId: string;
	lastAttemptedAt: string;
	history: QuestionLogStats;
}

export interface Goal {
	goalId: string;
	title: string;
	creatorId: string;
	createdAt: string;
	isPublic: boolean;
	weights: Record<string, number>;
}

export interface QuestionAiVectors {
	tags: string[];
	difficultyRating: number;
}

export interface Question {
	questionId: string;
	subject: string;
	chapter: string;
	questionText: string;
	correctAnswer: 'O' | 'X';
	explanation: string;
	aiVectors: QuestionAiVectors;
}

export interface DailyColumn {
	columnId: string;
	title: string;
	publishedAt: string;
	category: '时事・トレンド' | '建筑作品' | '样式・建筑史' | string;
	content: string;
	imageUrl?: string;
	relatedTags: string[];
}
