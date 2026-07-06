import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';

const stripeSecretKey =
	process.env.STRIPE_SECRET_KEY || import.meta.env.VITE_STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey
	? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any })
	: null;

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { userId, planType } = await request.json();

		if (!userId) {
			return json({ error: 'Missing userId' }, { status: 400 });
		}

		const origin = url.origin;

		if (!stripe) {
			console.warn('STRIPE_SECRET_KEY is not configured. Returning mock checkout URL.');
			// Mock Checkout Session redirects directly to a success page or dashboard with query parameter
			return json({ url: `${origin}/dashboard?stripe_mock_success=true` });
		}

		// Create Checkout Session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [
				{
					price_data: {
						currency: 'jpy',
						product_data: {
							name: 'SQSS プレミアム月額プラン',
							description: 'AI自動プロファイリング、夜の処方特訓、無制限の過去問演習'
						},
						unit_amount: 980,
						recurring: {
							interval: 'month'
						}
					},
					quantity: 1
				}
			],
			mode: 'subscription',
			success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/`,
			client_reference_id: userId,
			metadata: {
				userId,
				planType: planType || '1_year_pass'
			}
		});

		return json({ url: session.url });
	} catch (error: any) {
		console.error('Error creating Stripe checkout session:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
};
