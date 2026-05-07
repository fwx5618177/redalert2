/**
 * WolConfig — Westwood Online client constants.
 *
 * **Reverse-engineered stub (2026-05-07).** The original source file was never
 * published in the upstream `huangkaoya/redalert2` repository (referenced from
 * gui screens but absent from the distributed tree). Symbols below are the
 * minimal set actually imported anywhere in the codebase. The numeric/enum
 * values are picked to satisfy typecheck and produce sensible UI behavior;
 * they have no protocol effect because the WOL screens (Login, Lobby,
 * CustomGame, NewAccount) cannot reach a live server in any local
 * environment we ship.
 *
 * If the project ever reconnects a real WOL/CnCNet-style server, these
 * values must be replaced with the server's actual codes.
 */

/** Username length bounds — used by NewAccountBox + LoginBox form validation. */
export const MIN_USERNAME_LEN = 3;
export const MAX_USERNAME_LEN = 9;

/** Password length bound — used by NewAccountBox + LoginBox form validation. */
export const MAX_PASS_LEN = 16;

/**
 * Per-player map-availability status during a lobby session. LobbyScreen
 * tracks Map<username, WolHasMapStatus> and surfaces "downloading" UI when
 * any participant is in MapTransfer state. Other states (Has / Missing) are
 * defined for completeness even though only MapTransfer is read today.
 */
export enum WolHasMapStatus {
    Unknown = 'Unknown',
    Missing = 'Missing',
    MapTransfer = 'MapTransfer',
    Has = 'Has',
}
