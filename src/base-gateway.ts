import * as crypto from 'crypto';
import * as fs from 'fs';
import HttpSmartError from 'http-smart-error';
import * as moment from 'moment';
import * as request from 'request';
import SmartError from 'smart-error';

import {
	IGatewayOptions, IResponse,
} from './__interfaces__';

export type PayOperation = 'payment' | 'oneclickPayment' | 'customPayment';
export type Currency = 'CZK' | 'EUR' | 'USD' | 'GBP' | 'HUF' | 'PLN' | 'HRK' | 'RON' | 'NOK' | 'SEK';
export type Language = 'CZ' | 'EN' | 'DE' | 'FR' | 'HU' | 'IT' | 'JP' | 'PL' | 'PT' | 'RO' | 'RU' | 'SK' | 'ES' | 'TR' | 'VN' | 'HR' | 'SI';

// #region CONSTANTS

const PAYLOAD_KEYS = [
	'merchantId',
	'origPayId',
	'orderNo',
	'payId',
	'dttm',
	'payOperation',
	'payMethod',
	'totalAmount',
	'currency',
	'closePayment',
	'returnUrl',
	'returnMethod',
];

const PAYLOAD_MESSAGE_KEYS = [
	'description',
	'merchantData',
	'customerId',
	'language',
	'ttlSec',
	'logoVersion',
	'colorSchemeVersion',
];

const RESULT_KEYS = [
	'merchantId',
	'payId',
	'dttm',
	'resultCode',
	'resultMessage',
	'paymentStatus',
	'authCode',
	'merchantData',
];

const CART_ITEMS_KEYS = [
	'name',
	'quantity',
	'amount',
	'description',
];

const RESPONSE_CODES: { [key: number]: string } = {
	0: 'OK',
	100: 'MISSING_PARAMETER',
	110: 'INVALID_PARAMETER',
	120: 'MERCHANT_BLOCKED',
	130: 'SESSION_EXPIRED',
	140: 'PAYMENT_NOT_FOUND',
	150: 'PAYMENT_NOT_IN_VALID_STATE',
	160: 'OPERATION_NOT_ALLOWED',
	800: 'CUSTOMER_NOT_FOUND',
	810: 'CUSTOM_HAS_NO_SAVED_CARDS',
	820: 'CUSTOM_HAS_SAVED_CARDS',
	900: 'INTERNAL_ERROR',
};

const PAYMENT_STATUS: { [key: number]: string } = {
	1: 'CREATED',
	2: 'IN_PROGRESS',
	3: 'CANCELED',
	5: 'REVERSED',
	6: 'DECLINED',
	7: 'WAITING_FOR_SETTLE',
	8: 'COMPLETED',
};

// #endregion

export default abstract class Gateway {

	protected _options: IGatewayOptions;

	constructor(options: IGatewayOptions) {
		this._options = {
			...options,
			bankPublicKey: fs.readFileSync(options.bankPublicKey).toString(),
			privateKey: fs.readFileSync(options.privateKey).toString(),
			publicKey: fs.readFileSync(options.publicKey).toString(),
			url: !options.url
				? options.sandbox
					? 'https://iapi.iplatebnibrana.csob.cz'
					: 'https://api.platebnibrana.csob.cz'
				: options.url,
		};
	}

	public getProcessPaymentUrl(payId: string): string {
		const { url, merchantId } = this._options;
		return `${url}/api/${this.getVersion()}/payment/process${this._createGetPath({ merchantId, payId }, this._createDttm())}`;
	}

	public verifyResponse(response: { [key: string]: any } & IResponse): void {
		if (!this._verify(this._createResultMessage(response), response.signature)) {
			throw new SmartError('Verification error.', 'verification_error');
		}
	}

	public abstract getVersion(): string;

	protected abstract _getHashAlgorithm(): string;

	protected _request<T = any>(
		method: 'get' | 'post' | 'put',
		endpoint: string, data: { [key: string]: any } = {},
		createGetPath: boolean = true,
	): Promise<T> {
		if (endpoint.indexOf('/') !== 0) {
			endpoint = `/${endpoint}`;
		}
		const { url, merchantId } = this._options;
		const dttm = this._createDttm();
		const apiUrl = `${url}/api/${this.getVersion()}${endpoint}${createGetPath && method === 'get' ? this._createGetPath({ merchantId, ...data }, dttm) : ''}`;
		console.log(apiUrl);
		return new Promise((resolve, reject) => {
			request[method]({
				body: method !== 'get' ? {
					...data,
					dttm,
					merchantId,
					signature: this._createSignature(this._createPayloadMessage({ ...data, merchantId, dttm })),
				} : undefined,
				gzip: true,
				json: true,
				qs: method === 'get' ? data : undefined,
				url: apiUrl,
			}, (err, res, body) => {
				if (err) {
					reject(err);
					return;
				}
				if (res.statusCode >= 400) {
					reject(HttpSmartError.create(res.statusCode));
					return;
				}
				const { resultMessage, resultCode, ...payload } = body;
				if (resultCode === 0) {
					if (this._verify(this._createResultMessage(body), body.signature)) {
						resolve(payload);
						return;
					}
					reject(new SmartError('Verification error.', 'verification_error'));
					return;
				}
				reject(new SmartError(resultMessage, RESPONSE_CODES[resultCode], payload));
			});
		});
	}

	protected _createDttm(date: Date = new Date()): string {
		return moment(date).format('YYYYMMDDHHmmss');
	}

	private _createGetPath(data: { [key: string]: any }, dttm: string): string {
		const payload: { [key: string]: any } = { ...data, dttm };
		const a: Array<any> = Object.keys(payload).map((key) => payload[key]);
		a.push(encodeURIComponent(this._createSignature(this._createPayloadMessage(payload))));
		return `/${a.join('/')}`;
	}

	private _createSignature(data: string): string {
		const { privateKey } = this._options;
		return crypto.createSign(this._getHashAlgorithm()).update(data).sign(privateKey, 'base64');
	}

	private _verify(data: string, signature: string): boolean {
		const { bankPublicKey } = this._options;
		return crypto.createVerify(this._getHashAlgorithm()).update(data).verify(bankPublicKey, signature, 'base64');
	}

	private _createPayloadMessage(payload: { [key: string]: any }): string {
		let payloadMessageArray = this._createMessageArray(payload, PAYLOAD_KEYS);
		if (payload.cart) {
			payload.cart.forEach((cartItem: any) => {
				payloadMessageArray = payloadMessageArray.concat(this._createMessageArray(cartItem, CART_ITEMS_KEYS));
			});
		}

		payloadMessageArray = payloadMessageArray.concat(this._createMessageArray(payload, PAYLOAD_MESSAGE_KEYS));
		return payloadMessageArray.join('|');
	}

	private _createResultMessage(result: { [key: string]: any }): string {
		return this._createMessageString(result, RESULT_KEYS);
	}

	private _createMessageArray(data: { [key: string]: any }, keys?: Array<string>): Array<string> {
		if (!keys) {
			keys = Object.keys(data);
		}
		return keys.map((key) => data[key]).filter((item) => typeof item !== 'undefined');
	}

	private _createMessageString(data: { [key: string]: any }, keys: Array<any> = []): string {
		return this._createMessageArray(data, keys).join('|');
	}

}
