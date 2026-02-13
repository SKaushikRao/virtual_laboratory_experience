import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { HandData, TrackingState } from '../types';
import { Vector3, Quaternion, Matrix4, Vector2 } from 'three';
import { PINCH_THRESHOLD, SMOOTHING_FACTOR } from '../constants';

interface HandTrackerProps {
  onUpdate: (state: TrackingState) => void;
}

export interface HandTrackerRef {
  getLatestState: () => TrackingState;
}

const HandTracker = forwardRef<HandTrackerRef, HandTrackerProps>(({ onUpdate }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const stateRef = useRef<TrackingState>({
    leftHand: null,
    rightHand: null,
    gesture: 'none',
    interactionStrength: 0,
  });

  useImperativeHandle(ref, () => ({
    getLatestState: () => stateRef.current
  }));

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        
        startWebcam();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    initMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setIsReady(true);
          predict();
        };
      }
    } catch (err) {
      console.error("Webcam access denied", err);
    }
  };

  const lerpVector3 = (v1: Vector3, v2: Vector3, alpha: number) => {
    return new Vector3().copy(v1).lerp(v2, alpha);
  };
  
  const lerpQuaternion = (q1: Quaternion, q2: Quaternion, alpha: number) => {
    return new Quaternion().copy(q1).slerp(q2, alpha);
  };

  const calculateRotation = (landmarks: any[]): Quaternion => {
    // 0: Wrist, 5: IndexMCP, 17: PinkyMCP
    const wrist = new Vector3(landmarks[0].x, landmarks[0].y, landmarks[0].z);
    const indexMCP = new Vector3(landmarks[5].x, landmarks[5].y, landmarks[5].z);
    const pinkyMCP = new Vector3(landmarks[17].x, landmarks[17].y, landmarks[17].z);

    // Vector from wrist to indexMCP (approximate forward/up depending on frame)
    const v1 = new Vector3().subVectors(indexMCP, wrist).normalize();
    // Vector from pinkyMCP to indexMCP (approximate side vector)
    const v2 = new Vector3().subVectors(indexMCP, pinkyMCP).normalize();

    // Normal of the palm
    const normal = new Vector3().crossVectors(v1, v2).normalize();

    // Create rotation matrix
    // Assuming Z is "out of palm", Y is "fingers up", X is "side"
    // We need to construct a basis.
    // Let's define: Y axis = v1 (Wrist -> IndexMCP)
    // Z axis = normal (Palm Normal)
    // X axis = Cross(Y, Z)
    
    const xAxis = new Vector3().crossVectors(v1, normal).normalize();
    
    const m = new Matrix4();
    m.makeBasis(xAxis, v1, normal);
    
    return new Quaternion().setFromRotationMatrix(m);
  };

  const countExtendedFingers = (landmarks: any[]): number => {
    // Indices for tips and their corresponding PIP joints (closer to palm)
    // Thumb: 4 vs 2, Index: 8 vs 6, Middle: 12 vs 10, Ring: 16 vs 14, Pinky: 20 vs 18
    const fingerTips = [8, 12, 16, 20];
    const fingerPIPs = [6, 10, 14, 18];
    
    let count = 0;
    
    // Check thumb separately (based on x distance for simplistic check, or distance from pinky MCP)
    // Simple heuristic: distance from tip to pinky MCP(17) vs IP(3) to pinky MCP
    // Or just vector alignment.
    // Let's stick to simple distance from wrist comparison for main 4 fingers
    const wrist = landmarks[0];
    
    // Check 4 fingers
    for (let i = 0; i < 4; i++) {
        const tip = landmarks[fingerTips[i]];
        const pip = landmarks[fingerPIPs[i]];
        
        // Calculate distance to wrist (using only X/Y for simplicity as Z can be tricky in 2D video feed)
        // Actually MediaPipe provides Z, so utilize full 3D distance
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        
        if (dTip > dPip) count++;
    }
    
    // Thumb logic: compare x distance of tip and IP relative to wrist?
    // Simplified: check if thumb tip is far from index MCP
    const thumbTip = landmarks[4];
    const indexMCP = landmarks[5];
    const dThumb = Math.hypot(thumbTip.x - indexMCP.x, thumbTip.y - indexMCP.y);
    if (dThumb > 0.05) count++; // Threshold for thumb extension

    return count;
  };

  const processHand = (landmarks: any[], handedness: any, lastHand: HandData | null): HandData => {
    // 4: Thumb Tip, 8: Index Tip
    const thumbTip = new Vector3(landmarks[4].x, landmarks[4].y, landmarks[4].z);
    const indexTip = new Vector3(landmarks[8].x, landmarks[8].y, landmarks[8].z);
    const wrist = new Vector3(landmarks[0].x, landmarks[0].y, landmarks[0].z);

    const pinchDist = thumbTip.distanceTo(indexTip);
    const isPinching = pinchDist < PINCH_THRESHOLD;
    
    const pinchPos = new Vector3().addVectors(thumbTip, indexTip).multiplyScalar(0.5);
    
    // Smooth data
    let smoothedPinchPos = pinchPos;
    let smoothedPalmPos = wrist;
    let smoothedRotation = calculateRotation(landmarks);

    if (lastHand) {
      smoothedPinchPos = lerpVector3(lastHand.pinchPosition, pinchPos, SMOOTHING_FACTOR);
      smoothedPalmPos = lerpVector3(lastHand.palmPosition, wrist, SMOOTHING_FACTOR);
      smoothedRotation = lerpQuaternion(lastHand.rotation, smoothedRotation, SMOOTHING_FACTOR);
    }
    
    const extendedCount = countExtendedFingers(landmarks);
    
    let gestureType: HandData['gestureType'] = 'open_palm';
    if (isPinching) gestureType = 'fist'; // Simplified logic, usually pinch is specific
    else if (extendedCount === 1) gestureType = 'one_finger';
    else if (extendedCount === 2) gestureType = 'two_fingers';
    else if (extendedCount === 3) gestureType = 'three_fingers';
    else if (extendedCount === 4) gestureType = 'four_fingers';
    else if (extendedCount === 5) gestureType = 'open_palm';

    return {
      landmarks: landmarks,
      worldLandmarks: [], 
      handedness: handedness.categoryName,
      isPinching,
      pinchStrength: Math.max(0, 1 - (pinchDist / PINCH_THRESHOLD)), 
      pinchPosition: smoothedPinchPos,
      palmPosition: smoothedPalmPos,
      rotation: smoothedRotation,
      extendedFingers: extendedCount,
      gestureType
    };
  };

  const predict = () => {
    if (!landmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    let startTimeMs = performance.now();
    const result = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const drawingUtils = new DrawingUtils(ctx);
      
      let newLeftHand: HandData | null = null;
      let newRightHand: HandData | null = null;
      
      if (result.landmarks) {
        for (let i = 0; i < result.landmarks.length; i++) {
          const landmarks = result.landmarks[i];
          const handedness = result.handedness[i][0]; 
          
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 1
          });
          drawingUtils.drawLandmarks(landmarks, {
            color: "#FFFFFF",
            radius: 1,
            lineWidth: 0
          });

          // Match hand to previous state for smoothing based on handedness label
          const prevHand = handedness.categoryName === 'Left' ? stateRef.current.leftHand : stateRef.current.rightHand;
          
          const processed = processHand(
            landmarks, 
            handedness, 
            prevHand
          );

          if (handedness.categoryName === 'Left') {
            newLeftHand = processed;
          } else {
            newRightHand = processed;
          }
        }
      }

      let gesture: TrackingState['gesture'] = 'none';
      let strength = 0;

      if (newLeftHand && newRightHand) {
        const dist = newLeftHand.palmPosition.distanceTo(newRightHand.palmPosition);
        // Heuristic: if both hands are open and far apart -> zoom
        if (dist > 0.2 && !newLeftHand.isPinching && !newRightHand.isPinching) {
             gesture = 'zoom';
             strength = dist;
        }
      } else if (newLeftHand || newRightHand) {
        const activeHand = newLeftHand || newRightHand;
        if (activeHand?.isPinching) {
          gesture = 'pinch_drag';
          strength = activeHand.pinchStrength;
        } else {
          gesture = 'rotate';
        }
      }

      stateRef.current = {
        leftHand: newLeftHand,
        rightHand: newRightHand,
        gesture,
        interactionStrength: strength
      };

      onUpdate(stateRef.current);
    }

    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="fixed bottom-4 right-4 w-48 h-36 bg-black/80 border border-white/20 rounded-lg overflow-hidden backdrop-blur-md z-50 shadow-2xl transition-opacity duration-500" style={{ opacity: isReady ? 1 : 0 }}>
      <div className="relative w-full h-full">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-50 grayscale" 
          autoPlay 
          playsInline 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
          width={640} 
          height={480} 
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <div className="flex items-center gap-1">
             <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-[10px] font-mono text-white/80 uppercase">System Active</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HandTracker;