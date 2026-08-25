export declare function loadConfig(): {
    readonly nodeEnv: string;
    readonly port: number;
    readonly database: {
        readonly url: string;
        readonly host: string;
        readonly port: number;
        readonly user: string;
        readonly password: string;
        readonly name: string;
    };
    readonly redis: {
        readonly url: string;
        readonly password: string | undefined;
    };
    readonly jwt: {
        readonly secret: string;
        readonly expiresIn: string;
        readonly refreshExpiresIn: string;
    };
    readonly gemini: {
        readonly apiKey: string;
    };
    readonly razorpay: {
        readonly keyId: string;
        readonly keySecret: string;
        readonly webhookSecret: string;
    };
    readonly cors: {
        readonly origin: string;
    };
};
export type AppConfig = ReturnType<typeof loadConfig>;
//# sourceMappingURL=config.d.ts.map