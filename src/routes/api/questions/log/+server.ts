import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { userId, goalId, questionId, isCorrect, tags, chapter } = await request.json();

		if (!userId || !goalId || !questionId || isCorrect === undefined) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const questionLogRef = doc(db, `users/${userId}/user_goals/${goalId}/questionLogs/${questionId}`);

		// Run Firestore transaction to safely update logs and tag matrices
		await runTransaction(db, async (transaction) => {
			// 1. Update question log
			const qLogDoc = await transaction.get(questionLogRef);
			const qLogData = qLogDoc.exists()
				? qLogDoc.data()
				: { history: { attemptCount: 0, correctCount: 0, incorrectCount: 0 } };

			transaction.set(
				questionLogRef,
				{
					questionId,
					lastAttemptedAt: new Date().toISOString(),
					history: {
						attemptCount: (qLogData.history?.attemptCount || 0) + 1,
						correctCount: (qLogData.history?.correctCount || 0) + (isCorrect ? 1 : 0),
						incorrectCount: (qLogData.history?.incorrectCount || 0) + (isCorrect ? 0 : 1)
					}
				},
				{ merge: true }
			);

			// 2. Update tag matrices
			if (tags && Array.isArray(tags)) {
				for (const tag of tags) {
					const tagRef = doc(db, `users/${userId}/user_goals/${goalId}/tagMatrix/${tag}`);
					const tagDoc = await transaction.get(tagRef);
					const tagData = tagDoc.exists()
						? tagDoc.data()
						: {
								stats: {
									totalAttempted: 0,
									totalCorrect: 0,
									totalIncorrect: 0,
									consecutiveIncorrect: 0
								}
							};

					const prevConsecutive = tagData.stats?.consecutiveIncorrect || 0;
					const newConsecutive = isCorrect ? 0 : prevConsecutive + 1;

					transaction.set(
						tagRef,
						{
							tagName: tag,
							parentTopic: chapter || '未分類',
							stats: {
								totalAttempted: (tagData.stats?.totalAttempted || 0) + 1,
								totalCorrect: (tagData.stats?.totalCorrect || 0) + (isCorrect ? 1 : 0),
								totalIncorrect: (tagData.stats?.totalIncorrect || 0) + (isCorrect ? 0 : 1),
								consecutiveIncorrect: newConsecutive
							},
							// aiEstimation is managed by the profiling AI, initialize if not exists
							aiEstimation: tagData.aiEstimation || {
								masteryLevel: 'unstable',
								calculatedVectorWeight: 0.0,
								lastUpdated: new Date().toISOString()
							}
						},
						{ merge: true }
					);
				}
			}
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error logging question attempt:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
};
