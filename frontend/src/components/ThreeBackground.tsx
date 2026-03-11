"use client";
import { useEffect, useRef } from "react";

// Lazy-loads Three.js only when the home screen is mounted
export default function ThreeBackground() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animId = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let renderer: any = null;

        import("three").then((THREE) => {
            const mount = mountRef.current;
            if (!mount) return;

            const W = window.innerWidth;
            const H = window.innerHeight;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 200);
            camera.position.z = 35;

            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setSize(W, H);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            mount.appendChild(renderer.domElement);

            // Colour palette: purple / pink / blue / amber / teal
            const COLORS = [0x7c3aed, 0xec4899, 0x3b82f6, 0xfbbf24, 0x06b6d4, 0xa78bfa, 0xf472b6];

            // Mix of geometric primitives for visual interest
            const GEOS = [
                () => new THREE.OctahedronGeometry(0.8 + Math.random() * 0.6),
                () => new THREE.TetrahedronGeometry(0.7 + Math.random() * 0.6),
                () => new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.5),
                () => new THREE.TorusGeometry(0.55 + Math.random() * 0.3, 0.14, 4, 12),
                () => new THREE.BoxGeometry(0.8, 0.8, 0.8),
            ];

            interface ShapeMeta {
                rotX: number; rotY: number;
                floatAmp: number; floatFreq: number; floatOffset: number;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const shapes: any[] = [];

            for (let i = 0; i < 28; i++) {
                const geoFn = GEOS[i % GEOS.length];
                const geo = geoFn();
                const col = COLORS[i % COLORS.length];

                const mat = new THREE.MeshBasicMaterial({
                    color: col,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.10 + Math.random() * 0.14,
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mesh = new THREE.Mesh(geo, mat) as any;
                mesh.position.set(
                    (Math.random() - 0.5) * 70,
                    (Math.random() - 0.5) * 110,
                    (Math.random() - 0.5) * 18 - 5,
                );
                mesh.rotation.set(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                );
                mesh.userData = {
                    rotX: (Math.random() - 0.5) * 0.012,
                    rotY: (Math.random() - 0.5) * 0.014,
                    floatAmp: 0.06 + Math.random() * 0.08,
                    floatFreq: 0.3 + Math.random() * 0.4,
                    floatOffset: Math.random() * Math.PI * 2,
                };
                scene.add(mesh);
                shapes.push(mesh);
            }

            // Particle field (tiny dots)
            const ptGeo = new THREE.BufferGeometry();
            const ptCount = 120;
            const pos = new Float32Array(ptCount * 3);
            for (let i = 0; i < ptCount * 3; i++) {
                pos[i] = (Math.random() - 0.5) * (i % 3 === 2 ? 30 : 90);
            }
            ptGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            const ptMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.3 });
            scene.add(new THREE.Points(ptGeo, ptMat));

            const startTime = Date.now();

            const animate = () => {
                animId = requestAnimationFrame(animate);
                const t = (Date.now() - startTime) / 1000;

                shapes.forEach((m) => {
                    m.rotation.x += m.userData.rotX;
                    m.rotation.y += m.userData.rotY;
                    m.position.y += Math.sin(t * m.userData.floatFreq + m.userData.floatOffset) * m.userData.floatAmp * 0.02;
                });

                // Slowly drift camera
                camera.position.x = Math.sin(t * 0.05) * 3;
                camera.position.y = Math.cos(t * 0.04) * 2;

                renderer.render(scene, camera);
            };
            animate();

            const onResize = () => {
                const W2 = window.innerWidth, H2 = window.innerHeight;
                camera.aspect = W2 / H2;
                camera.updateProjectionMatrix();
                renderer.setSize(W2, H2);
            };
            window.addEventListener("resize", onResize);

            // Store cleanup on mount div for the outer cleanup
            (mount as unknown as { _cleanup?: () => void })._cleanup = () => {
                window.removeEventListener("resize", onResize);
            };
        });

        return () => {
            cancelAnimationFrame(animId);
            const mount = mountRef.current;
            if (mount) {
                (mount as unknown as { _cleanup?: () => void })._cleanup?.();
            }
            if (renderer) {
                renderer.dispose();
                try { renderer.domElement.remove(); } catch { /* ok */ }
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            aria-hidden="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1,
                pointerEvents: "none",
            }}
        />
    );
}
