export interface IGatewayOptions {
	merchantId: string;
	publicKey: string;
	privateKey: string;
	bankPublicKey: string;
	url?: string;
	sandbox?: boolean;
}

export interface ICartItem {
	name: string;
	quantity: number;
	amount: number;
	description?: string;
}

export enum ResultCode {
	OK = 0,
	MISSING_PARAMETER = 100,
	INVALID_PARAMETER = 110,
	MERCHANT_BLOCKED = 120,
	SESSION_EXPIRED = 130,
	PAYMENT_NOT_FOUND = 140,
	PAYMENT_NOT_IN_VALID_STATE = 150,
	OPERATION_NOT_ALLOWED = 160,
	CUSTOMER_NOT_FOUND = 800,
	CUSTOM_HAS_NO_SAVED_CARDS = 810,
	CUSTOM_HAS_SAVED_CARDS = 820,
	INTERNAL_ERROR = 900,
}

export enum PaymentStatus {
	CREATED = 1,
	IN_PROGRESS = 2,
	CANCELED = 3,
	CONFIRMED = 4,
	REVERSED = 5,
	DECLINED = 6,
	WAITING_FOR_SETTLE = 7,
	COMPLETED = 8,
	WAITING_FOR_REFUND = 9,
	REFUND_COMPLETED = 10,
}

// #region RESPONSES

export interface IResponse {
	// resultCode: number;
	// resultMessage: string;
	dttm: string;
	signature: string;
}

export interface IEchoResponse extends IResponse { }

export interface IPaymentResponse extends IResponse {
	payId: string;
	paymentStatus: number;
}

export interface IPaymentInitResponse extends IPaymentResponse { }

export interface IPaymentStatusResponse extends IPaymentResponse { }

export interface IPaymentRefundResponse extends IPaymentResponse { }

export interface IPaymentReverseResponse extends IPaymentResponse { }

export interface IOneClickInitResponse extends IResponse {
	payId: string;
	resultCode: ResultCode;
	resultMessage: string;
	paymentStatus: PaymentStatus;
}

export interface IOneClickStartResponse extends IResponse {
	payId: string;
	resultCode: ResultCode;
	resultMessage: string;
	paymentStatus: PaymentStatus;
}

export interface IOneClickEchoResponse extends IResponse {
	origPayId: string;
	resultCode: ResultCode;
	resultMessage: string;
}

// #endregion