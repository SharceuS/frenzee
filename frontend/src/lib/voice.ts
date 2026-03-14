"use client";
// ── WebRTC voice manager — hardened (VOICE-04) ────────────────────────────────
// Improvements over v1:
//   1. Perfect negotiation: per-peer makingOffer / ignoreOffer flags;
//      polite peer = lexicographically smaller id (deterministic, no deadlock).
//   2. Listener-safe: addTransceiver("audio",{direction:"recvonly"}) when no
//      local stream; upgrades to sendrecv cleanly when mic is enabled later.
//   3. ICE buffering: candidates queued per-peer until remoteDescription is set.
//   4. Autoplay recovery: play() failures surfaced via blockedAudioCount;
//      retryBlockedAudio() retries on user gesture.
//   5. Teardown correctness: local tracks stopped in leaveVoice and on unmount.
//   6. TURN-aware ICE: fetches GET /voice/config from backend; falls back to
//      STUN-only in dev when the endpoint is unreachable.
import { useRef, useState, useCallback, useEffect } from "react";
import { BACKEND, apiUpdateMic } from "./api";

type Permission = "unknown" | "granted" | "denied";

// Fallback ICE config used only when the backend config endpoint is unreachable
const FALLBACK_ICE: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

async function postSignal(url: string, body: Record<string, unknown>) {
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch { /* signaling errors are non-fatal */ }
}

// Fetch TURN-capable ICE configuration from the backend.
// Falls back to public STUN-only if the endpoint is unreachable (dev environment).
async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const res = await fetch(`${BACKEND}/voice/config`);
        const data = await res.json();
        if (data?.ok && Array.isArray(data.iceServers)) return data.iceServers;
    } catch { /* fall through to fallback */ }
    return FALLBACK_ICE;
}

// Per-peer negotiation flags for the WebRTC perfect negotiation pattern
interface PeerState {
    pc: RTCPeerConnection;
    makingOffer: boolean;
    ignoreOffer: boolean;
    isSettingRemoteAnswerPending: boolean;
    pendingCandidates: RTCIceCandidateInit[];
}

export function useVoice(code: string, myId: string) {
    const [micEnabled, setMicEnabled] = useState(false);
    const [micMuted, setMicMuted] = useState(true);
    const [micPermission, setMicPermission] = useState<Permission>("unknown");
    const [blockedAudioCount, setBlockedAudioCount] = useState(0);

    // Stable refs so async callbacks always see current values without re-creating
    const codeRef = useRef(code);
    const myIdRef = useRef(myId);
    const micPermissionRef = useRef<Permission>("unknown");
    const micMutedRef = useRef(true);
    const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE);

    useEffect(() => { codeRef.current = code; }, [code]);
    useEffect(() => { myIdRef.current = myId; }, [myId]);
    useEffect(() => { micPermissionRef.current = micPermission; }, [micPermission]);
    useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);

    const localStreamRef = useRef<MediaStream | null>(null);
    // Map from remoteId → PeerState (perfect-negotiation state per peer)
    const peersRef = useRef<Map<string, PeerState>>(new Map());
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    // Audio elements that failed autoplay — surfaced to user for recovery
    const blockedAudioRef = useRef<Set<HTMLAudioElement>>(new Set());

    // ── Polite peer rule (deterministic, prevents deadlock on glare) ──────────
    // The lexicographically smaller player id is the polite peer and defers
    // when both sides send offers simultaneously.
    const isPolite = useCallback((remoteId: string): boolean => {
        return myIdRef.current < remoteId;
    }, []);

    // ── Attempt to play audio; track autoplay failures for recovery UI ────────
    const tryPlay = useCallback((audio: HTMLAudioElement) => {
        audio.play().then(() => {
            if (blockedAudioRef.current.has(audio)) {
                blockedAudioRef.current.delete(audio);
                setBlockedAudioCount(blockedAudioRef.current.size);
            }
        }).catch(() => {
            if (!blockedAudioRef.current.has(audio)) {
                blockedAudioRef.current.add(audio);
                setBlockedAudioCount(blockedAudioRef.current.size);
            }
        });
    }, []);

    // ── Retry all blocked audio elements after a user gesture ─────────────────
    const retryBlockedAudio = useCallback(() => {
        for (const audio of Array.from(blockedAudioRef.current)) {
            audio.play().then(() => {
                blockedAudioRef.current.delete(audio);
                setBlockedAudioCount(blockedAudioRef.current.size);
            }).catch(() => { /* still blocked */ });
        }
    }, []);

    // ── Mount (or update) a remote audio element ──────────────────────────────
    const mountRemoteAudio = useCallback((remoteId: string, stream: MediaStream) => {
        let audio = audioElemsRef.current.get(remoteId);
        if (!audio) {
            audio = document.createElement("audio");
            audio.autoplay = true;
            audio.setAttribute("playsinline", "");
            audio.style.display = "none";
            document.body.appendChild(audio);
            audioElemsRef.current.set(remoteId, audio);
        }
        if (audio.srcObject !== stream) {
            audio.srcObject = stream;
            tryPlay(audio);
        }
    }, [tryPlay]);

    // ── Remove a peer and its audio element ──────────────────────────────────
    const removePeer = useCallback((remoteId: string) => {
        const ps = peersRef.current.get(remoteId);
        if (ps) {
            try { ps.pc.close(); } catch { /* already closed */ }
            peersRef.current.delete(remoteId);
        }
        const audio = audioElemsRef.current.get(remoteId);
        if (audio) {
            blockedAudioRef.current.delete(audio);
            audio.srcObject = null;
            try { audio.remove(); } catch { /* already removed */ }
            audioElemsRef.current.delete(remoteId);
        }
        setBlockedAudioCount(blockedAudioRef.current.size);
    }, []);

    const removePeerRef = useRef(removePeer);
    useEffect(() => { removePeerRef.current = removePeer; }, [removePeer]);

    // ── Flush buffered ICE candidates after remoteDescription is accepted ─────
    const flushPendingCandidates = useCallback(async (ps: PeerState) => {
        const queued = ps.pendingCandidates.splice(0); // atomically drain queue
        for (const c of queued) {
            try { await ps.pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* stale */ }
        }
    }, []);

    // ── Get or create a PeerState with perfect negotiation callbacks ──────────
    // Listener-safe: if no local stream, a recvonly transceiver is used so the
    // peer can receive remote audio without a microphone.
    // Safe to call from async handlers — uses refs only, no stale closures.
    const getOrCreatePeer = useCallback((remoteId: string): PeerState => {
        const existing = peersRef.current.get(remoteId);
        if (existing && existing.pc.signalingState !== "closed") return existing;

        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
        const ps: PeerState = {
            pc, makingOffer: false, ignoreOffer: false,
            isSettingRemoteAnswerPending: false, pendingCandidates: [],
        };
        peersRef.current.set(remoteId, ps);

        if (localStreamRef.current) {
            for (const track of localStreamRef.current.getTracks()) {
                pc.addTrack(track, localStreamRef.current);
            }
        } else {
            // Receive-only until the user enables their mic
            pc.addTransceiver("audio", { direction: "recvonly" });
        }

        // Perfect negotiation — onnegotiationneeded sends offers automatically
        pc.onnegotiationneeded = async () => {
            const c = codeRef.current;
            const me = myIdRef.current;
            if (!c || !me) return;
            try {
                ps.makingOffer = true;
                await pc.setLocalDescription(); // implicit rollback handled by browser
                postSignal(`${BACKEND}/rooms/${c}/voice/offer`, {
                    playerId: me, toPlayerId: remoteId, sdp: pc.localDescription,
                });
            } catch { /* non-fatal */ } finally {
                ps.makingOffer = false;
            }
        };

        pc.onicecandidate = ({ candidate }) => {
            if (!candidate) return;
            const c = codeRef.current;
            const me = myIdRef.current;
            if (!c || !me) return;
            postSignal(`${BACKEND}/rooms/${c}/voice/ice`, {
                playerId: me, toPlayerId: remoteId, candidate,
            });
        };

        pc.ontrack = ({ streams }) => {
            const stream = streams[0];
            if (!stream) return;
            mountRemoteAudio(remoteId, stream);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                removePeerRef.current(remoteId);
            }
        };

        return ps;
    }, [mountRemoteAudio]); // uses refs internally — mountRemoteAudio is the only non-ref dep

    // ── Upgrade existing recvonly peers when the user later enables their mic ─
    const upgradeToSendRecv = useCallback((stream: MediaStream) => {
        const track = stream.getAudioTracks()[0];
        if (!track) return;
        for (const [, ps] of Array.from(peersRef.current)) {
            const transceivers = ps.pc.getTransceivers();
            if (transceivers.length > 0) {
                const t = transceivers[0];
                t.sender.replaceTrack(track).catch(() => {});
                if (t.direction === "recvonly") t.direction = "sendrecv";
                // onnegotiationneeded fires automatically, sends a new offer
            } else {
                ps.pc.addTrack(track, stream);
            }
        }
    }, []);

    // ── Join voice session ────────────────────────────────────────────────────
    const joinVoice = useCallback(async () => {
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!c || !me || localStreamRef.current) return;

        // Fetch TURN-capable ICE config before opening any peer connections
        iceServersRef.current = await fetchIceServers();

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
            setMicPermission("denied");
            apiUpdateMic(c, me, false, true, "denied");
            return;
        }

        localStreamRef.current = stream;
        setMicEnabled(true);
        setMicMuted(false);
        setMicPermission("granted");
        apiUpdateMic(c, me, true, false, "granted");

        // Upgrade any recvonly peer connections that were opened before mic was granted
        upgradeToSendRecv(stream);

        // Register with backend — returns ids of peers already in the voice session
        const res: { ok: boolean; voiceParticipantIds?: string[] } = await fetch(
            `${BACKEND}/rooms/${c}/voice/join`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerId: me }),
            }
        ).then(r => r.json()).catch(() => ({ ok: false }));

        if (!res.ok) return;

        // getOrCreatePeer triggers onnegotiationneeded which sends the offer
        const existingIds = (res.voiceParticipantIds ?? []).filter((id: string) => id !== me);
        for (const remoteId of existingIds) {
            getOrCreatePeer(remoteId);
        }
    }, [getOrCreatePeer, upgradeToSendRecv]);

    // ── Leave voice session ───────────────────────────────────────────────────
    const leaveVoice = useCallback(() => {
        const c = codeRef.current;
        const me = myIdRef.current;
        const perm = micPermissionRef.current;

        // Stop local tracks before closing peer connections
        if (localStreamRef.current) {
            for (const track of localStreamRef.current.getTracks()) track.stop();
            localStreamRef.current = null;
        }

        for (const id of Array.from(peersRef.current.keys())) removePeerRef.current(id);

        setMicEnabled(false);
        setMicMuted(true);

        if (c && me) {
            postSignal(`${BACKEND}/rooms/${c}/voice/leave`, { playerId: me });
            apiUpdateMic(c, me, false, true, perm);
        }
    }, []);

    // ── Mute / unmute (keeps voice session and peer connections alive) ─────────
    const toggleMute = useCallback(() => {
        const stream = localStreamRef.current;
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!stream) return;
        const nextMuted = !micMutedRef.current;
        for (const track of stream.getAudioTracks()) track.enabled = !nextMuted;
        setMicMuted(nextMuted);
        if (c && me) apiUpdateMic(c, me, true, nextMuted, "granted");
    }, []);

    // ── Toggle voice on/off entirely ──────────────────────────────────────────
    const toggleVoice = useCallback(async () => {
        if (localStreamRef.current) {
            leaveVoice();
        } else {
            await joinVoice();
        }
    }, [joinVoice, leaveVoice]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                for (const track of localStreamRef.current.getTracks()) track.stop();
                localStreamRef.current = null;
            }
            for (const id of Array.from(peersRef.current.keys())) removePeerRef.current(id);
        };
    }, []);

    // ── SSE signal handlers (called from GameApp's SSE useEffect) ─────────────

    // New peer joined voice layer — getOrCreatePeer triggers onnegotiationneeded
    // which sends an offer. Works without a local stream (recvonly mode).
    const onVoicePeerJoined = useCallback(({ fromPlayerId }: { fromPlayerId: string }) => {
        getOrCreatePeer(fromPlayerId);
    }, [getOrCreatePeer]);

    // A peer left — clean up their connection and audio element
    const onVoicePeerLeft = useCallback(({ fromPlayerId }: { fromPlayerId: string }) => {
        removePeerRef.current(fromPlayerId);
    }, []);

    // Inbound SDP offer — perfect negotiation pattern
    const onVoiceOffer = useCallback(async ({
        fromPlayerId, sdp,
    }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!c || !me) return;

        // Works even if we have no local stream (recvonly transceiver path)
        const ps = getOrCreatePeer(fromPlayerId);
        const { pc } = ps;

        // Detect offer collision: we were also making an offer at the same moment
        const offerCollision = ps.makingOffer || pc.signalingState !== "stable";
        ps.ignoreOffer = !isPolite(fromPlayerId) && offerCollision;
        if (ps.ignoreOffer) return; // impolite peer discards on collision

        try {
            ps.isSettingRemoteAnswerPending = false;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // Flush ICE candidates that arrived before remoteDescription was set
            await flushPendingCandidates(ps);
            // setLocalDescription() with no args uses implicit rollback (modern browsers)
            await pc.setLocalDescription();
            postSignal(`${BACKEND}/rooms/${c}/voice/answer`, {
                playerId: me, toPlayerId: fromPlayerId, sdp: pc.localDescription,
            });
        } catch { /* non-fatal negotiation error */ }
    }, [getOrCreatePeer, isPolite, flushPendingCandidates]);

    // Inbound SDP answer — complete the negotiation
    const onVoiceAnswer = useCallback(async ({
        fromPlayerId, sdp,
    }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
        const ps = peersRef.current.get(fromPlayerId);
        if (!ps) return;
        try {
            ps.isSettingRemoteAnswerPending = true;
            await ps.pc.setRemoteDescription(new RTCSessionDescription(sdp));
            ps.isSettingRemoteAnswerPending = false;
            await flushPendingCandidates(ps);
        } catch {
            ps.isSettingRemoteAnswerPending = false;
        }
    }, [flushPendingCandidates]);

    // Inbound ICE candidate — buffer if remoteDescription is not yet set
    const onVoiceIceCandidate = useCallback(async ({
        fromPlayerId, candidate,
    }: { fromPlayerId: string; candidate: RTCIceCandidateInit }) => {
        if (!candidate) return;

        // Create a recvonly peer if this candidate arrives before voice_peer_joined
        const ps = peersRef.current.get(fromPlayerId) ?? getOrCreatePeer(fromPlayerId);

        const readyForCandidate =
            ps.pc.remoteDescription !== null &&
            !ps.isSettingRemoteAnswerPending &&
            !ps.ignoreOffer;

        if (!readyForCandidate) {
            ps.pendingCandidates.push(candidate);
            return;
        }

        try {
            await ps.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
            if (!ps.ignoreOffer) { /* candidate may be stale after rollback */ }
        }
    }, [getOrCreatePeer]);

    return {
        micEnabled,
        micMuted,
        micPermission,
        blockedAudioCount,
        retryBlockedAudio,
        toggleVoice,
        toggleMute,
        leaveVoice,
        onVoicePeerJoined,
        onVoicePeerLeft,
        onVoiceOffer,
        onVoiceAnswer,
        onVoiceIceCandidate,
    };
}

