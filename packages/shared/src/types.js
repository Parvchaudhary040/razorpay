"use strict";
// ============================================
// CommerceAI — Shared Domain Types
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.OrderStatus = void 0;
// --- Order ---
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["CREATED"] = "CREATED";
    OrderStatus["PAYMENT_INITIATED"] = "PAYMENT_INITIATED";
    OrderStatus["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    OrderStatus["PAYMENT_VERIFIED"] = "PAYMENT_VERIFIED";
    OrderStatus["PAYMENT_CAPTURED"] = "PAYMENT_CAPTURED";
    OrderStatus["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    OrderStatus["ORDER_COMPLETE"] = "ORDER_COMPLETE";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
// --- Payment ---
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["INITIATED"] = "INITIATED";
    PaymentStatus["VERIFIED"] = "VERIFIED";
    PaymentStatus["CAPTURED"] = "CAPTURED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
//# sourceMappingURL=types.js.map