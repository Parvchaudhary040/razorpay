/** Audit event types */
export declare const AuditEventTypes: {
    readonly USER_REGISTER: "USER_REGISTER";
    readonly USER_LOGIN: "USER_LOGIN";
    readonly USER_LOGOUT: "USER_LOGOUT";
    readonly AGENT_SESSION_START: "AGENT_SESSION_START";
    readonly AGENT_SESSION_END: "AGENT_SESSION_END";
    readonly AGENT_TOOL_CALL: "AGENT_TOOL_CALL";
    readonly TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED";
    readonly UNKNOWN_TOOL_ATTEMPT: "UNKNOWN_TOOL_ATTEMPT";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly POLICY_VIOLATION: "POLICY_VIOLATION";
    readonly CART_ITEM_ADDED: "CART_ITEM_ADDED";
    readonly CART_ITEM_REMOVED: "CART_ITEM_REMOVED";
    readonly CART_ITEM_UPDATED: "CART_ITEM_UPDATED";
    readonly ORDER_CREATED: "ORDER_CREATED";
    readonly PAYMENT_INITIATED: "PAYMENT_INITIATED";
    readonly PAYMENT_VERIFIED: "PAYMENT_VERIFIED";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly WEBHOOK_RECEIVED: "WEBHOOK_RECEIVED";
    readonly WEBHOOK_VERIFIED: "WEBHOOK_VERIFIED";
    readonly WEBHOOK_INVALID_SIGNATURE: "WEBHOOK_INVALID_SIGNATURE";
    readonly WEBHOOK_PAYMENT_CAPTURED: "WEBHOOK_PAYMENT_CAPTURED";
    readonly ORDER_COMPLETED: "ORDER_COMPLETED";
    readonly INTENT_CLASSIFIED: "INTENT_CLASSIFIED";
    readonly AGENT_RESPONSE_GENERATED: "AGENT_RESPONSE_GENERATED";
};
export type AuditEventType = (typeof AuditEventTypes)[keyof typeof AuditEventTypes];
/** Order status transitions */
export declare const VALID_ORDER_TRANSITIONS: Record<string, string[]>;
//# sourceMappingURL=constants.d.ts.map