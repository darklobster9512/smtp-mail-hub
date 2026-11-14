declare function encodeHeader(text: string): string;
type User = {
    name?: string;
    email: string;
};
type EmailOptions = {
    from: string | User;
    to: string | string[] | User | User[];
    reply?: string | User;
    cc?: string | string[] | User | User[];
    bcc?: string | string[] | User | User[];
    subject: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    attachments?: {
        filename: string;
        content: string;
        mimeType?: string;
    }[];
    dsnOverride?: {
        envelopeId?: string;
        RET?: {
            HEADERS?: boolean;
            FULL?: boolean;
        };
        NOTIFY?: {
            DELAY?: boolean;
            FAILURE?: boolean;
            SUCCESS?: boolean;
        };
    };
};
declare class Email {
    readonly from: User;
    readonly to: User[];
    readonly reply?: User;
    readonly cc?: User[];
    readonly bcc?: User[];
    readonly subject: string;
    readonly text?: string;
    readonly html?: string;
    readonly dsnOverride?: {
        envelopeId?: string;
        RET?: {
            HEADERS?: boolean;
            FULL?: boolean;
        };
        NOTIFY?: {
            DELAY?: boolean;
            FAILURE?: boolean;
            SUCCESS?: boolean;
        };
    };
    readonly attachments?: {
        filename: string;
        content: string;
        mimeType?: string;
    }[];
    readonly headers: Record<string, string>;
    setSent: () => void;
    setSentError: (e: unknown) => void;
    sent: Promise<void>;
    constructor(options: EmailOptions);
    private static toUsers;
    getEmailData(): string;
    private applyDotStuffing;
    private generateSafeBoundary;
    private getMimeType;
    private resolveHeader;
    private resolveFrom;
    private resolveTo;
    private resolveSubject;
    private resolveReply;
    private resolveCC;
}

declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

type AuthType = 'plain' | 'login' | 'cram-md5';
type Credentials = {
    username: string;
    password: string;
};
type WorkerMailerOptions = {
    host: string;
    port: number;
    secure?: boolean;
    startTls?: boolean;
    credentials?: Credentials;
    authType?: AuthType | AuthType[];
    logLevel?: LogLevel;
    dsn?: {
        RET?: {
            HEADERS?: boolean;
            FULL?: boolean;
        } | undefined;
        NOTIFY?: {
            DELAY?: boolean;
            FAILURE?: boolean;
            SUCCESS?: boolean;
        } | undefined;
    } | undefined;
    socketTimeoutMs?: number;
    responseTimeoutMs?: number;
    name?: string;
    /** Custom socket factory (replaces cloudflare:sockets connect). */
    connectSocket?: (address: { hostname: string; port: number }, options: { secureTransport: "on" | "off" | "starttls"; allowHalfOpen: boolean }) => unknown;
};
declare class WorkerMailer {
    private socket;
    private readonly host;
    private readonly port;
    private readonly secure;
    private readonly startTls;
    private readonly authType;
    private readonly credentials?;
    private readonly socketTimeoutMs;
    private readonly responseTimeoutMs;
    private readonly name;
    private reader;
    private readonly decoder;
    private writer;
    private readonly logger;
    private readonly dsn;
    private readonly sendNotificationsTo;
    private active;
    private emailSending;
    private emailToBeSent;
    /** SMTP server capabilities **/
    private supportsDSN;
    private allowAuth;
    private authTypeSupported;
    private supportsStartTls;
    private constructor();
    static connect(options: WorkerMailerOptions): Promise<WorkerMailer>;
    send(options: EmailOptions): Promise<void>;
    static send(options: WorkerMailerOptions, email: EmailOptions): Promise<void>;
    private readTimeout;
    private read;
    private writeLine;
    private write;
    private initializeSmtpSession;
    private start;
    close(error?: Error): Promise<void>;
    private waitForSocketConnected;
    private greet;
    private ehlo;
    private helo;
    private tls;
    private parseCapabilities;
    private auth;
    private authWithPlain;
    private authWithLogin;
    private authWithCramMD5;
    private mail;
    private rcpt;
    private data;
    private body;
    private rset;
    private notificationBuilder;
    private retBuilder;
}

export { Email, LogLevel, WorkerMailer, encodeHeader };
export type { AuthType, Credentials, EmailOptions, User, WorkerMailerOptions };
