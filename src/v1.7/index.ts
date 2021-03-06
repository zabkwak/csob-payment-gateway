import {
	ICartItem,
	IEchoResponse,
	IOneClickInitResponse,
	IOneClickStartResponse,
	IPaymentInitResponse,
	IPaymentRefundResponse,
	IPaymentStatusResponse,
	PaymentStatus,
} from '../__interfaces__';
import Base, { Currency, Language, PayOperation } from '../base-gateway';

export {
	PaymentStatus,
};

export default class Gateway extends Base {

	public echo(): Promise<IEchoResponse> {
		const { merchantId } = this._options;
		return this._request('post', '/echo', { merchantId });
	}

	public async oneclick(
		origPayId: string,
		orderNo: number,
		clientIp: string,
		totalAmount?: number,
		currency?: Currency,
		merchantData?: string,
	): Promise<IOneClickStartResponse> {
		const { payId } = await this.oneClickInit(origPayId, orderNo, clientIp, totalAmount, currency, merchantData);
		return this.oneClickStart(payId);
	}

	public paymentInit(
		orderNo: number,
		payOperation: PayOperation,
		currency: Currency,
		totalAmount: number,
		closePayment: boolean,
		returnUrl: string,
		returnMethod: 'GET' | 'POST',
		cart: Array<ICartItem>,
		language: Language,
		description: string,
		merchantData?: string,
		customerId?: string,
		ttlSec?: number,
		logoVersion?: number,
		customExpiry?: Date,
	): Promise<IPaymentInitResponse> {
		return this._request('post', '/payment/init', {
			cart,
			closePayment,
			currency,
			customExpiry: customExpiry ? this._createDttm(customExpiry) : undefined,
			customerId,
			description,
			language,
			logoVersion,
			merchantData,
			orderNo,
			payMethod: 'card',
			payOperation,
			returnMethod,
			returnUrl,
			totalAmount,
			ttlSec,
		});
	}

	public paymentStatus(payId: string): Promise<IPaymentStatusResponse> {
		return this._request('get', '/payment/status', { payId/*, extensions: ['maskClnRP']*/ });
	}

	public paymentRefund(payId: string, amount?: number): Promise<IPaymentRefundResponse> {
		return this._request('put', '/payment/refund', { payId, amount });
	}

	public paymentReverse(payId: string): Promise<IPaymentRefundResponse> {
		return this._request('put', '/payment/reverse', { payId });
	}

	public oneClickInit(
		origPayId: string,
		orderNo: number,
		clientIp: string,
		totalAmount?: number,
		currency?: Currency,
		merchantData?: string,
	): Promise<IOneClickInitResponse> {
		return this._request('post', '/payment/oneclick/init', {
			clientIp,
			currency,
			merchantData,
			orderNo,
			origPayId,
			totalAmount,
		});
	}

	public oneClickStart(payId: string): Promise<IOneClickStartResponse> {
		return this._request('post', '/payment/oneclick/start', { payId });
	}

	public getVersion(): string {
		return 'v1.7';
	}

	protected _getHashAlgorithm(): string {
		return 'RSA-SHA1';
	}
}
