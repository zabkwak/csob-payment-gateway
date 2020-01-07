import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import rs from 'resting-squirrel';

import Gateway from '../src/v1.7';

const MERCHANT_ID = fs.readFileSync(path.resolve(__dirname, './certs/merchantId')).toString();

const PAY_ID = '9957f055ff300FA';

const generateOrderId = () => Math.round(Date.now() / 100);

const gateway = new Gateway({
	bankPublicKey: path.resolve(__dirname, './certs/rsa_bank.pub'),
	merchantId: MERCHANT_ID,
	privateKey: path.resolve(__dirname, `./certs/rsa_${MERCHANT_ID}.key`),
	publicKey: path.resolve(__dirname, `./certs/rsa_${MERCHANT_ID}.pub`),
	sandbox: true,
});

const app = rs({ port: 9000 });

app.get(0, '/gateway-return', {}, async (req) => {
	gateway.verifyResponse(req.query);
	const { payId } = req.query;
	console.log(await gateway.paymentStatus(payId));
	// await gateway.cancelPayment(payId);
	// return gateway.oneClickEcho(payId);
	// return gateway.oneClickInit(payId, generateOrderId(), '178.77.238.161', 4000, 'CZK');
	// return gateway.statusPayment(payId);
	return await gateway.oneclick(payId, generateOrderId(), '178.77.238.161', 4000, 'CZK');
});

app.get(0, '/register-card', async (req, res) => {
	const { payId } = await gateway.paymentInit(
		generateOrderId(),
		'oneclickPayment',
		'CZK',
		5000,
		true,
		'http://localhost:9000/0/gateway-return',
		'GET',
		[{
			amount: 5000,
			name: 'oneclick test',
			quantity: 1,
		}],
		'CZ',
		'one-click test',
		Buffer.from('jebka').toString('base64'),
	);
	const url = gateway.getProcessPaymentUrl(payId);
	res.redirect(url);
	return null;
});

app.get(0, '/payment-status', async (req, res) => {
	return gateway.paymentStatus(req.query.payId);
});

app.get(0, '/payment-refund', async (req, res) => {
	return gateway.paymentRefund(req.query.payId);
});

app.get(0, '/payment-oneclick', async (req) => {
	return gateway.oneclick(req.query.payId, generateOrderId(), '178.77.238.161', 4000, 'CZK');
});

app.start();

(async () => {
	/*console.log(await gateway.echo());
	const { payId } = await gateway.initPayment(
		666,
		'oneclickPayment',
		'CZK',
		100,
		false,
		'http://localhost:9000/0/gateway-return',
		'GET',
		[{
			amount: 100,
			name: 'oneclick test',
			quantity: 1,
		}],
		'CZ',
	);
	console.log(gateway.getProcessPaymentUrl(payId));*/
	/*
		console.log(await gateway.echoOneClick(PAY_ID));
		// console.log(await gateway.oneclick(PAY_ID, Math.round(Date.now() / 1000), '100.64.0.4', 66600, 'CZK'));
		*/
})();
