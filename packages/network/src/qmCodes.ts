/**
 * qmCodes — Quick Match server reply codes.
 *
 * **Reverse-engineered stub (2026-05-07).** These string codes correspond to
 * the IRC-style RPL_* numeric replies the Quick Match (QM) server sends back
 * to a client that has joined the matchmaking queue. The original source was
 * never published in upstream and the WOL/CnCNet QM protocol is closed.
 *
 * QuickGameScreen.ts uses these codes via:
 *   - `message.text === RPL_WORKING`               (exact match)
 *   - `message.text.startsWith(RPL_QUEUE_LIST + " ")` (prefix + payload)
 *
 * As long as the values are distinct strings, typecheck passes and the
 * UI's no-op error branch handles unknown messages gracefully. Real values
 * must come from a live QM server if/when the project reconnects.
 */
export const RPL_QUEUE_LIST = '300';
export const RPL_WORKING = '301';
export const RPL_BAD_VERS = '302';
export const RPL_BAD_HASH = '303';
export const RPL_MODE_UNAVAIL = '304';
export const RPL_MATCHED = '310';
export const RPL_REQUEUE = '311';
export const RPL_STATS = '320';
