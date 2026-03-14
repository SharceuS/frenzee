"use client";
// ── WebRTC voice manager hook ─────────────────────────────────────────────────
// Manages RTCPeerConnection instances for audio-only room voice chat.
// Signaling travels via SSE (server → client) and HTTP POST (client → server).
// No audio is relayed through the Frenzee server; only SDP/ICE are exchanged.
import { useRef, useState, useCallback, useEffect } from "react";
import { BACKEND, apiUpdateMic } from "./api";

type Permission = "unknown" | "granted" | "denied";

const ICE_SERVERS = [
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

export function useVoice(code: string, myId: string) {
    const [micEnabled, setMicEnabled] = useState(false);
    const [micMuted, setMicMuted] = useState(true);
    const [micPermission, setMicPermission] = useState<Permission>("unknown");

    // Stable refs so async callbacks always see current values without re-creating
    const codeRef = useRef(code);
    const myIdRef = useRef(myId);
    const micPermissionRef = useRef<Permission>("unknown");
    const micMutedRef = useRef(true);

    useEffect(() => { codeRef.current = code; }, [code]);
    useEffect(() => { myIdRef.current = myId; }, [myId]);
    useEffect(() => { micPermissionRef.current = micPermission; }, [micPermission]);
    useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // ── Remove a peer and its audio element ──────────────────────────────────
    const removePeer = useCallback((remoteId: string) => {
        const pc = peersRef.current.get(remoteId);
        if (pc) {
            try { pc.close(); } catch { /* already closed */ }
            peersRef.current.delete(remoteId);
        }
        const audio = audioElemsRef.current.get(remoteId);
        if (audio) {
            audio.srcObject = null;
            try { audio.remove(); } catch { /* already removed */ }
            audioElemsRef.current.delete(remoteId);
        }
    }, []);

    // Use a ref so inner callbacks (onconnectionstatechange) see latest removePeer
    const removePeerRef = useRef(removePeer);
    useEffect(() => { removePeerRef.current = removePeer; }, [removePeer]);

    // ── Create a peer connection for a remote player ──────────────────────────
    // Uses refs only → stable across renders, safe to call from async handlers.
    const createPeer = useCallback((remoteId: string): RTCPeerConnection => {
        const existing = peersRef.current.get(remoteId);
        if (existing && existing.signalingState !== "closed") return existing;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Attach local audio tracks
        if (localStreamRef.current) {
            for (const track of localStreamRef.current.getTracks()) {
                pc.addTrack(track, localStreamRef.current);
            }
        }

        // Forward gathered ICE candidates to the remote peer via backend relay
        pc.onicecandidate = ({ candidate }) => {
            if (!candidate) return;
            const c = codeRef.current;
            const me = myIdRef.current;
            if (!c || !me) return;
            postSignal(`${BACKEND}/rooms/${c}/voice/ice`, {
                playerId: me, toPlayerId: remoteId, candidate,
            });
        };

        // Mount remote audio stream into a hidden <audio> element
        pc.ontrack = ({ streams }) => {
            const stream = streams[0];
            if (!stream) return;
            let audio = audioElemsRef.current.get(remoteId);
            if (!audio) {
                audio = document.createElement("audio");
                audio.autoplay = true;
                audio.style.display = "none";
                document.body.appendChild(audio);
                audioElemsRef.current.set(remoteId, audio);
            }
            if (audio.srcObject !== stream) {
                audio.srcObject = stream;
                audio.play().catch(() => { /* autoplay policy — user gesture required */ });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                removePeerRef.current(remoteId);
            }
        };

        peersRef.current.set(remoteId, pc);
        return pc;
    }, []); // intentionally empty — uses refs only

    // ── Join voice session ────────────────────────────────────────────────────
    const joinVoice = useCallback(async () => {
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!c || !me || localStreamRef.current) return;

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
            setMicPermission("denied");
            if (c && me) apiUpdateMic(c, me, false, true, "denied");
            return;
        }

        localStreamRef.current = stream;
        setMicEnabled(true);
        setMicMuted(false);
        setMicPermission("granted");
        apiUpdateMic(c, me, true, false, "granted");

        // Register with backend — get list of already-joined participants
        const res: { ok: boolean; voiceParticipantIds?: string[] } = await fetch(
            `${BACKEND}/rooms/${c}/voice/join`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerId: me }),
            }
        ).then(r => r.json()).catch(() => ({ ok: false }));

        if (!res.ok) return;

        // Create offers for every peer already in the voice session
        const existingIds = (res.voiceParticipantIds ?? []).filter((id: string) => id !== me);
        for (const remoteId of existingIds) {
            const pc = createPeer(remoteId);
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                postSignal(`${BACKEND}/rooms/${c}/voice/offer`, {
                    playerId: me, toPlayerId: remoteId, sdp: offer,
                });
            } catch { /* offer failed — non-fatal */ }
        }
    }, [createPeer]);

    // ── Leave voice session ───────────────────────────────────────────────────
    const leaveVoice = useCallback(() => {
        const c = codeRef.current;
        const me = myIdRef.current;
        const perm = micPermissionRef.current;

        for (const id of Array.from(peersRef.current.keys())) removePeerRef.current(id);

        if (c && me) {
            postSignal(`${BACKEND}/rooms/${c}/voice/leave`, { playerId: me });
            apiUpdateMic(c, me, false, true, perm);
        }
    }, []);

    // ── Mute / unmute (keeps voice session alive) ─────────────────────────────
    const toggleMute = useCallback(() => {
        const stream = localStreamRef.current;
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!stream) return;
        const nextMuted = !micMutedRef.current;
        for (const track of stream.getAudioTracks()) {
            track.enabled = !nextMuted;
        }
        setMicMuted(nextMuted);
        if (c && me) apiUpdateMic(c, me, true, nextMuted, "granted");
    }, []);

    // ── Toggle voice on/off entirely ─────────────────────────────────────────
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
            for (const id of Array.from(peersRef.current.keys())) removePeerRef.current(id);
            if (localStreamRef.current) {
                for (const track of localStreamRef.current.getTracks()) track.stop();
                localStreamRef.current = null;
            }
        };
    }, []);

    // ── SSE signal handlers — called from GameApp's SSE useEffect ─────────────

    // A new peer just joined the room's voice layer — we initiate the offer
    const onVoicePeerJoined = useCallback(async ({ fromPlayerId }: { fromPlayerId: string }) => {
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!c || !me || !localStreamRef.current) return;
        const pc = createPeer(fromPlayerId);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            postSignal(`${BACKEND}/rooms/${c}/voice/offer`, {
                playerId: me, toPlayerId: fromPlayerId, sdp: offer,
            });
        } catch { /* offer failed */ }
    }, [createPeer]);

    // A peer left the voice layer — close and clean up their connection
    const onVoicePeerLeft = useCallback(({ fromPlayerId }: { fromPlayerId: string }) => {
        removePeerRef.current(fromPlayerId);
    }, []);

    // Inbound SDP offer — set remote, create answer, send back
    const onVoiceOffer = useCallback(async ({
        fromPlayerId, sdp,
    }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
        const c = codeRef.current;
        const me = myIdRef.current;
        if (!c || !me || !localStreamRef.current) return;
        const pc = createPeer(fromPlayerId);
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            postSignal(`${BACKEND}/rooms/${c}/voice/answer`, {
                playerId: me, toPlayerId: fromPlayerId, sdp: answer,
            });
        } catch { /* negotiation error */ }
    }, [createPeer]);

    // Inbound SDP answer — complete the negotiation
    const onVoiceAnswer = useCallback(async ({
        fromPlayerId, sdp,
    }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = peersRef.current.get(fromPlayerId);
        if (!pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch { /* late answer or state mismatch */ }
    }, []);

    // Inbound ICE candidate — add to the relevant peer
    const onVoiceIceCandidate = useCallback(async ({
        fromPlayerId, candidate,
    }: { fromPlayerId: string; candidate: RTCIceCandidateInit }) => {
        const pc = peersRef.current.get(fromPlayerId);
        if (!pc || !candidate) return;
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* candidate arrived before remote description — can be ignored */ }
    }, []);

    return {
        micEnabled,
        micMuted,
        micPermission,
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
