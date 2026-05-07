/**
 * WolError — typed error class thrown by Westwood Online client connection.
 *
 * **Reverse-engineered stub (2026-05-07).** The original source file was never
 * published in the upstream `huangkaoya/redalert2` repository. The `code`
 * members below were extracted from every `WolError.Code.X` reference in the
 * gui screens; the underlying numeric values are arbitrary because the
 * relevant code paths (login failures, channel errors) are gated behind a
 * live WOL server that does not exist in local dev.
 */
export class WolError extends Error {
    constructor(
        public readonly code: WolError.Code,
        message?: string,
    ) {
        super(message ?? `WolError(${WolError.Code[code] ?? code})`);
        this.name = 'WolError';
        Object.setPrototypeOf(this, WolError.prototype);
    }
}

export namespace WolError {
    /**
     * Failure modes surfaced by the WOL client. Numeric values are stub —
     * real protocol mapping is unknown.
     */
    export enum Code {
        // Login failures
        BadLogin = 1,
        BannedFromServer = 2,
        ServerFull = 3,
        OutdatedClient = 4,
        // Channel / game-room failures
        NoSuchChannel = 10,
        BadChannelPass = 11,
        ChannelFull = 12,
        BannedFromChannel = 13,
        GameHasClosed = 14,
    }
}
