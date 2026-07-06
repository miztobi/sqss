import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Set emulator host environment variable if not already set
if (!process.env.FIRESTORE_EMULATOR_HOST) {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
	console.log('Using Firestore Emulator at localhost:8080');
}

// Initialize Firebase Admin for Emulator (no actual service account needed for emulator)
const app = initializeApp({
	projectId: 'sqss-app'
});

const db = getFirestore(app);

const goalsData = [
	{
		goalId: '1kyu_kenchikushi',
		title: '一級建築士 学科試験',
		creatorId: 'system',
		createdAt: new Date().toISOString(),
		isPublic: true,
		weights: {
			計画: 20,
			環境_設備: 20,
			法規: 30,
			構造: 30,
			施工: 25
		}
	},
	{
		goalId: '2kyu_kenchikushi',
		title: '二級建築士 学科試験',
		creatorId: 'system',
		createdAt: new Date().toISOString(),
		isPublic: true,
		weights: {
			計画: 25,
			法規: 25,
			構造: 25,
			施工: 25
		}
	}
];

const pastQuestions1Kyu = [
	{
		questionId: 'q_2026_houki_05',
		subject: '法規',
		chapter: '容積率',
		questionText: '共同住宅の共用廊下・階段の床面積は、容積率の算定の基礎となる延べ面積に算入しない。',
		correctAnswer: 'O',
		explanation: '建築基準法第52条第6項に基づき、共同住宅の共用廊下・階段の床面積は、容積率の算定において延べ面積に算入しません。',
		aiVectors: {
			tags: ['共用廊下', '容積率緩和', '共同住宅特例'],
			difficultyRating: 1.2
		}
	},
	{
		questionId: 'q_2026_houki_06',
		subject: '法規',
		chapter: '容積率',
		questionText: '住宅の用に供する地階の床面積は、その建築物の住宅の用途に供する部分の床面積の合計の1/3を限度として、容積率の算定の基礎となる延べ面積に算入しない。',
		correctAnswer: 'O',
		explanation: '建築基準法第52条第3項に基づき、住宅の用途に供する部分の地階の床面積は、住宅部分の床面積の合計の1/3まで容積率算定の基礎となる延べ面積に算入しません。',
		aiVectors: {
			tags: ['地階緩和', '容積率緩和', '住宅特例'],
			difficultyRating: 1.4
		}
	},
	{
		questionId: 'q_2026_keikaku_01',
		subject: '計画',
		chapter: '共同住宅',
		questionText: '片廊下型の共同住宅において、共用廊下の有効幅員は一般に1.2m以上とする。',
		correctAnswer: 'O',
		explanation: '避難および通行の安全性を考慮し、片側のみに住戸がある共用廊下の有効幅員は1.2m以上とすることが一般的です。両側廊下の場合は1.6m以上が推奨されます。',
		aiVectors: {
			tags: ['共用廊下', '避難計画', '片廊下'],
			difficultyRating: 1.0
		}
	},
	{
		questionId: 'q_2026_kouzou_01',
		subject: '構造',
		chapter: '耐震構造',
		questionText: '制震構造は、地震時にエネルギーを吸収するダンパー等の装置を構造物内に配置することで、建物の変形や揺れを抑制する構造である。',
		correctAnswer: 'O',
		explanation: '制震（制振）構造は、梁やブレースなどに設置した各種ダンパー（粘性、摩擦、鋼材ダンパーなど）によって地震エネルギーを吸収させ、構造物の被害を低減させる技術です。',
		aiVectors: {
			tags: ['制震構造', 'エネルギー吸収', 'ダンパー'],
			difficultyRating: 1.1
		}
	},
	{
		questionId: 'q_2026_seikou_01',
		subject: '施工',
		chapter: '鉄筋工事',
		questionText: '鉄筋のガス圧接継手において、圧接部の膨らみの直径は、鉄筋径の1.4倍以上とする。',
		correctAnswer: 'O',
		explanation: '公共建築工事標準仕様書等において、鉄筋ガス圧接継手部の膨らみの直径は鉄筋の呼び名の1.4倍以上、長さは1.1倍以上、偏心量は1/5以下と規定されています。',
		aiVectors: {
			tags: ['ガス圧接', '鉄筋工事', '圧接部膨らみ'],
			difficultyRating: 1.3
		}
	}
];

const dailyColumns = [
	{
		columnId: 'col_001',
		title: '4号特例の縮小と木造構造計算の義務化',
		publishedAt: new Date().toISOString(),
		category: '時事・トレンド',
		content: `2025年4月から建築基準法が改正され、いわゆる「4号特例」が縮小されました。これにより、木造2階建てや延べ面積200㎡を超える建築物において、構造安全性の確認書類（構造計算書など）の提出が義務化されました。
一級建築士試験においても、構造および法規の分野でこの法改正に関連した問題が出題される可能性が非常に高まっています。
特に、以下のポイントに留意しましょう：
1. 従来の「4号建築物」が「新2号建築物」および「新3号建築物」に再編された点。
2. 構造計算書（許容応力度計算等）の提出が必要となる規模の境界値。
3. 設計者の責任範囲と審査省略制度の適用対象の変更。

今後の法規の勉強では、単に過去問を解くだけでなく、最新の法改正情報を反映したテキストを使用することが重要です。`,
		imageUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7eed',
		relatedTags: ['法改正', '4号特例', '構造計算']
	},
	{
		columnId: 'col_002',
		title: '近代建築の5原則を具現化した名作：サヴォア邸',
		publishedAt: new Date().toISOString(),
		category: '建築作品',
		content: `ル・コルビュジエによって設計され、1931年に竣工したフランスの「サヴォア邸」は、近代建築の金字塔としてあまりにも有名です。
コルビュジエ自身が提唱した「近代建築の5原則」が完ぺきな形で表現されています。
- **ピロティ (Pilotis)**: 構造体を地面から浮かせ、1階部分を自由な動線やガレージとして開放する。
- **屋上庭園 (Roof Garden)**: 平らな陸屋根の上に庭園を設け、失われた地上の緑を回復する。
- **自由な平面 (Free Plan)**: 鉄筋コンクリートの柱（ドミノシステム）で荷重を支えることで、間仕切り壁を自由に配置する。
- **水平連続窓 (Horizontal Windows)**: 壁に耐力を持たせないため、立面に光を均等に取り込む細長い窓を走らせる。
- **自由な立面 (Free Facade)**: 構造体から独立したファサード（外観デザイン）を自由に構成する。

一級建築士の「計画」科目では、サヴォア邸の特徴について度々問われます。スロープを用いた内部の建築的プロムナード（遊歩性）や、ピロティ部分の車の回転半径を考慮した設計など、細部まで確認しておきましょう。`,
		imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
		relatedTags: ['サヴォア邸', '近代建築の5原則', 'ル・コルビュジエ']
	},
	{
		columnId: 'col_003',
		title: '法隆寺金堂に見る飛鳥様式の特徴',
		publishedAt: new Date().toISOString(),
		category: '様式・建築史',
		content: `世界最古の木造建築群である法隆寺西院伽藍。その中心にある「金堂」は、飛鳥時代（7世紀後半〜8世紀初頭）の仏教建築様式を今に伝える貴重な建物です。
試験に出題されやすい飛鳥様式の主な特徴は以下の通りです：
- **胴張りのある柱（エンタシス）**: 柱の中央部付近がやや膨らんでおり、視覚的な安定感を生むギリシャ建築の円柱デザインとの関連性が指摘されています。
- **雲斗（くもと）・雲肘木（くもひじき）**: 組物に雲の文様があしらわれており、有機的な曲線を描く彫刻的な表現がなされています。
- **卍崩しの高欄（まんじくずしのこうらん）**: 2階手すり部分に卍の形を崩した格子デザインが用いられています。
- **人字形割束（ひとじがたわりづか）**: 梁の間を支える短い柱（束）が「人」の字の形をしています。

これらの様式は、後の奈良時代（唐招提寺など）の「和様」へと進化していく過程の原点となります。写真資料を見ながら、各部材の名称と形状を紐づけて覚えるのが効果的です。`,
		imageUrl: 'https://images.unsplash.com/photo-1542044896530-05d85be9b11a',
		relatedTags: ['法隆寺', '飛鳥様式', '日本建築史']
	}
];

async function seed() {
	console.log('Starting seed process...');

	for (const goal of goalsData) {
		console.log(`Writing goal: ${goal.goalId}`);
		await db.collection('goals').doc(goal.goalId).set(goal);

		// Write questions for 1kyu_kenchikushi
		if (goal.goalId === '1kyu_kenchikushi') {
			console.log('Writing 1kyu questions...');
			for (const q of pastQuestions1Kyu) {
				await db
					.collection('goals')
					.doc(goal.goalId)
					.collection('past_questions')
					.doc(q.questionId)
					.set(q);
			}

			console.log('Writing daily columns...');
			for (const col of dailyColumns) {
				await db
					.collection('goals')
					.doc(goal.goalId)
					.collection('daily_columns')
					.doc(col.columnId)
					.set(col);
			}
		}
	}

	console.log('Seed process completed successfully.');
}

seed().catch((err) => {
	console.error('Error during seed:', err);
	process.exit(1);
});
