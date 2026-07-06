import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { userId, goalId } = await request.json();

		if (!userId || !goalId) {
			return json({ error: 'Missing userId or goalId' }, { status: 400 });
		}

		// 1. Fetch user's tag matrix from Firestore
		const tagMatrixRef = collection(db, `users/${userId}/user_goals/${goalId}/tagMatrix`);
		const querySnapshot = await getDocs(tagMatrixRef);

		const tagDataList: any[] = [];
		querySnapshot.forEach((doc) => {
			tagDataList.push({ id: doc.id, ...doc.data() });
		});

		// If no tag data exists or total attempts are 0, return early with generic message
		const totalAttempts = tagDataList.reduce((acc, tag) => acc + (tag.stats?.totalAttempted || 0), 0);
		if (tagDataList.length === 0 || totalAttempts === 0) {
			return json({
				overallSummary:
					'まだ学習データが不足しています。まずは「朝夕10問」の過去問演習を解いて、データが蓄積されるのを待ちましょう。',
				focusAreas: [],
				nextAction: '「朝夕10問」メニューから過去問演習を進めてください。'
			});
		}

		// If Gemini API is not configured, return mock profiling response for local testing
		if (!ai) {
			console.warn('GEMINI_API_KEY is not configured. Returning mock profile.');
			return json({
				overallSummary:
					'【ローカル開発用モック診断】「共用廊下」と「容積率」の関連性において、正答率が低下しています。共同住宅の共用廊下は容積率不算入（建築基準法第52条第6項）となる特例について、類似の地階不算入特例と混同している可能性があります。',
				focusAreas: [
					{
						tagName: '共用廊下',
						masteryLevel: 'critical',
						weight: -0.8,
						recommendation:
							'共同住宅の共用廊下・階段の床面積は、容積率の算定に一切算入されない点を再確認してください。'
					},
					{
						tagName: '容積率緩和',
						masteryLevel: 'unstable',
						weight: -0.4,
						recommendation:
							'住宅の地階緩和（1/3限度）と、共同住宅の共用廊下緩和（全額不算入）の適用条件の違いを整理しましょう。'
					}
				],
				nextAction:
					'法令集の建築基準法第52条を開き、第3項（地階）と第6項（共用廊下等）の条文を並べて読み比べてください。特に不算入割合の制限の有無に着目しましょう。'
			});
		}

		// 2. Prepare data for prompt
		const formattedStats = tagDataList
			.map((tag) => {
				return `Tag: ${tag.tagName} (Topic: ${tag.parentTopic})
- Total Attempted: ${tag.stats?.totalAttempted || 0}
- Correct: ${tag.stats?.totalCorrect || 0}
- Incorrect: ${tag.stats?.totalIncorrect || 0}
- Consecutive Incorrect: ${tag.stats?.consecutiveIncorrect || 0}`;
			})
			.join('\n\n');

		const prompt = `あなたは建築士国家試験（一級・二級）の受験対策指導を行う超一流のAIチューターです。
以下は、ある受験生の現在までの過去問演習履歴（タグ別の統計データ）です。

【受験生の過去問演習統計】
${formattedStats}

【あなたのタスク】
1. この受験生の正誤傾向を高度にプロファイリングし、表面的な間違いの裏にある根本的な「知識のバグ（類似概念の混同や、理解の曖昧さ）」を特定してください。
2. なぜ間違えやすいのかの理由と、建築の専門的知識に基づいたわかりやすい学習整理アドバイス（診断テキスト）を overallSummary に記述してください。
3. 提示された各タグについて、理解度（masteryLevel: safe, unstable, critical）、苦手度の重み（weight: -1.0から1.0。マイナスが大きいほど苦手）、および具体的な改善アドバイス（recommendation）を判定してください。
4. 「今夜の勉強（15分〜60分）」でピンポイントで実施すべき「法令集の閲覧ページ指示」や「概念整理の具体的手順」を nextAction に記述してください。

必ず以下のJSONスキーマに従って出力してください。`;

		// 3. Call Gemini API with Structured JSON output
		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
			config: {
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.OBJECT,
					properties: {
						overallSummary: {
							type: Type.STRING,
							description: '全体的な学習状況の診断と、混同しやすい知識の整理アドバイス。'
						},
						focusAreas: {
							type: Type.ARRAY,
							items: {
								type: Type.OBJECT,
								properties: {
									tagName: { type: Type.STRING },
									masteryLevel: {
										type: Type.STRING,
										enum: ['safe', 'unstable', 'critical']
									},
									weight: {
										type: Type.NUMBER,
										description: '苦手度の重み。-1.0（極めて苦手）から 1.0（完全に習得）の範囲。'
									},
									recommendation: {
										type: Type.STRING,
										description: 'このタグに対する具体的な対策アドバイス。'
									}
								},
								required: ['tagName', 'masteryLevel', 'weight', 'recommendation']
							}
						},
						nextAction: {
							type: Type.STRING,
							description:
								'今夜読むべき法令集のページや、紙に書いて整理すべき内容などの具体的なアクション指示。'
						}
					},
					required: ['overallSummary', 'focusAreas', 'nextAction']
				}
			}
		});

		const resultText = response.text;
		if (!resultText) {
			throw new Error('Empty response from Gemini API');
		}

		const resultJson = JSON.parse(resultText);

		// 4. Update Firestore tagMatrix with AI estimations
		const batch = writeBatch(db);
		let updatedCount = 0;

		for (const area of resultJson.focusAreas) {
			const tagDoc = tagDataList.find((t) => t.tagName === area.tagName);
			if (tagDoc) {
				const tagRef = doc(db, `users/${userId}/user_goals/${goalId}/tagMatrix/${area.tagName}`);
				batch.update(tagRef, {
					'aiEstimation.masteryLevel': area.masteryLevel,
					'aiEstimation.calculatedVectorWeight': area.weight,
					'aiEstimation.lastUpdated': new Date().toISOString()
				});
				updatedCount++;
			}
		}

		if (updatedCount > 0) {
			await batch.commit();
		}

		return json(resultJson);
	} catch (error: any) {
		console.error('Error in AI profiling API:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
};
