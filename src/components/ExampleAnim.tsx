import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 타입 정의
interface LandmarkData {
  pose?: number[][][];
  left_hand?: number[][][];
  right_hand?: number[][][];
}

interface LandmarkViewerProps {
  data: LandmarkData | null;
  currentFrame: number;
  showCylinders: boolean;
  showLeftHand: boolean;
  showRightHand: boolean;
}

interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

interface CameraRotation {
  x: number;
  y: number;
  z: number;
}

// Three.js 객체 타입 정의
type ThreeScene = THREE.Scene;
type ThreeCamera = THREE.PerspectiveCamera;
type ThreeRenderer = THREE.WebGLRenderer;
type ThreeMesh = THREE.Mesh;
type ThreeDirectionalLight = THREE.DirectionalLight;

// CSS-in-JS 스타일 정의
const styles = {
  leftPanel: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column' as const,
    border: '1px solid #ccc',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f8f9fa'
  },
  panelTitle: {
    padding: '12px 16px',
    backgroundColor: '#e9ecef',
    borderBottom: '1px solid #dee2e6',
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#495057'
  },
  canvasContainer: {
    flex: '1',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  landmarkCanvas: {
    width: '100%',
    height: '100%',
    display: 'block'
  }
};

const LandmarkViewerTSX = ({ 
  data, 
  currentFrame, 
  showCylinders, 
  showLeftHand, 
  showRightHand 
}: LandmarkViewerProps) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const poseObjectsRef = useRef([]);
  const leftHandObjectsRef = useRef([]);
  const rightHandObjectsRef = useRef([]);
  const poseLinesRef = useRef([]);
  const leftHandLinesRef = useRef([]);
  const rightHandLinesRef = useRef([]);
  const animationIdRef = useRef(null);


  const poseCylinderPool = useRef([]);
  const leftHandCylinderPool = useRef([]);
  const rightHandCylinderPool = useRef([]);

  // 색상 상수
  const POSE_COLOR: number = 0x00b894;
  const LEFT_COLOR: number = 0x0984e3;
  const RIGHT_COLOR: number = 0xd63031;

  // 연결 구조
  const POSE_CONNECTIONS: number[][] = [
    [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],
    [15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],
    [23,24],[23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32],[27,31],[28,32]
  ];
  const HAND_CONNECTIONS: number[][] = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17],[5,17]
  ];




  // 카메라에 대한 초기 위치 값 지정
  // A) 좌우반전 전 지정 값
 // const cameraInitPos: CameraPosition = { x: 0.108, y: 0.474, z: -0.855 };
 // const cameraInitRot: CameraRotation = { x: 0, y: 0, z: 0 };

   // const yawRef = useRef(-10.3 * Math.PI / 180);
  // const pitchRef = useRef(178.7 * Math.PI / 180);
  // const rollRef = useRef(0 * Math.PI / 180);

  const cameraInitPos: CameraPosition = { x: -0.061, y: 0.739, z: 0.592 };
  const cameraInitRot: CameraRotation = { x: 0, y: 0, z: 0 };

  // 카메라에 대한 초기 회전 값 지정
  // const yawRef = useRef(-10.3 * Math.PI / 180);
  // const pitchRef = useRef(178.7 * Math.PI / 180);
  // const rollRef = useRef(0 * Math.PI / 180);

    const yawRef = useRef(-186.2 * Math.PI / 180);
  const pitchRef = useRef(192.5 * Math.PI / 180);
  const rollRef = useRef(0 * Math.PI / 180);

function initPools() {
  // 포즈 연결용 풀
  for (let i = 0; i < POSE_CONNECTIONS.length * 2; i++) {
    const geometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 12);
    const material = new THREE.MeshLambertMaterial({ color: POSE_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    sceneRef.current.add(mesh);
    poseCylinderPool.current.push(mesh);
  }
  // 왼손, 오른손도 동일하게
  for (let i = 0; i < HAND_CONNECTIONS.length * 2; i++) {
    // left hand
    const geometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 12);
    const material = new THREE.MeshLambertMaterial({ color: LEFT_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    sceneRef.current.add(mesh);
    leftHandCylinderPool.current.push(mesh);
  }
  for (let i = 0; i < HAND_CONNECTIONS.length * 2; i++) {
    // right hand
    const geometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 12);
    const material = new THREE.MeshLambertMaterial({ color: RIGHT_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    sceneRef.current.add(mesh);
    rightHandCylinderPool.current.push(mesh);
  }
}
  // 초기화
  useEffect(() => {
    initLandmarkViewer();
    initPools();
    // 전역 함수로 카메라 리셋 함수 등록
    (window as { resetLandmarkCamera?: () => void }).resetLandmarkCamera = resetCamera;

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // 정리 작업
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // 프레임이 변경될 때마다 랜드마크 업데이트
  useEffect(() => {
    if (data && sceneRef.current) {
      loadFramePast(currentFrame);
      //loadFrame(currentFrame);
    }
  }, [data, currentFrame, showCylinders, showLeftHand, showRightHand]);

  

  const initLandmarkViewer = (): void => {
    const canvas = canvasRef.current;  
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;

    // 씬 생성
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0xf0f0f0);

    // 컨테이너 크기에 맞춘 반응형 해상도 설정
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 카메라 생성 및 카메라 시야각 조정 가능
    cameraRef.current = new THREE.PerspectiveCamera(70, containerWidth / containerHeight, 0.001, 1000);
    cameraRef.current.position.set(cameraInitPos.x, cameraInitPos.y, cameraInitPos.z);
    cameraRef.current.rotation.set(cameraInitRot.x, cameraInitRot.y, cameraInitRot.z);
    updateCameraDirection();

    // 렌더러 생성
    rendererRef.current = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });

    // 디바이스 픽셀 비율 고려하여 해상도 설정
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    rendererRef.current.setPixelRatio(pixelRatio);

    // 반응형 캔버스 크기 설정
    canvas.width = containerWidth * pixelRatio;
    canvas.height = containerHeight * pixelRatio;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    rendererRef.current.setSize(containerWidth * 2, containerHeight * 2);
    rendererRef.current.setClearColor(0xf0f0f0, 1);

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    sceneRef.current.add(ambientLight);
    const directionalLight: ThreeDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    sceneRef.current.add(directionalLight);
    const directionalLight2: ThreeDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, 1, -1);
    sceneRef.current.add(directionalLight2);

    const mirrorMatrix = new THREE.Matrix4().makeScale(-1, 1, 1);
    sceneRef.current.applyMatrix4(mirrorMatrix);

    // 애니메이션 루프 시작
    animate();
  };

  let lastTime = performance.now();
  const animate = (): void => {
    animationIdRef.current = requestAnimationFrame(animate);
    const currentTime = performance.now();
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const updateCameraDirection = (): void => {
    if (cameraRef.current) {
      cameraRef.current.rotation.order = 'YXZ';
      cameraRef.current.rotation.y = yawRef.current;
      cameraRef.current.rotation.x = pitchRef.current;
      cameraRef.current.rotation.z = rollRef.current;
    }
  };

  const resetCamera = (): void => {
    if (cameraRef.current) {
      cameraRef.current.position.set(cameraInitPos.x, cameraInitPos.y, cameraInitPos.z);
      yawRef.current = -10.3 * Math.PI / 180;
      pitchRef.current = 178.7 * Math.PI / 180;
      rollRef.current = 0 * Math.PI / 180;
      updateCameraDirection();
      logCameraState('카메라 리셋');
    }
  };

  const logCameraState = (action: string): void => {
    if (!cameraRef.current) return;
    
    const yawDegrees = (yawRef.current * 180 / Math.PI).toFixed(1);
    const pitchDegrees = (pitchRef.current * 180 / Math.PI).toFixed(1);
    const rollDegrees = (rollRef.current * 180 / Math.PI).toFixed(1);
    console.log(`[${action}] 카메라 상태:`, {
      위치: {
        x: cameraRef.current.position.x.toFixed(3),
        y: cameraRef.current.position.y.toFixed(3),
        z: cameraRef.current.position.z.toFixed(3)
      },
      각도: {
        yaw: yawDegrees + '°',
        pitch: pitchDegrees + '°',
        roll: rollDegrees + '°'
      }
    });
  };

  const clearScene = (): void => {
    if (!sceneRef.current) return;

    [...poseObjectsRef.current, ...leftHandObjectsRef.current, ...rightHandObjectsRef.current].forEach(obj => {
      sceneRef.current!.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    [...poseLinesRef.current, ...leftHandLinesRef.current, ...rightHandLinesRef.current].forEach(line => {
      sceneRef.current!.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });
    poseObjectsRef.current = [];
    leftHandObjectsRef.current = [];
    rightHandObjectsRef.current = [];
    poseLinesRef.current = [];
    leftHandLinesRef.current = [];
    rightHandLinesRef.current = [];
  };

  const drawConnectionsCylinder = (
    landmarks: number[][], 
    connections: number[][], 
    color: number, 
    lineArray: ThreeMesh[]
  ): void => {
    if (!sceneRef.current) return;

    connections.forEach(connection => {
      if (connection[0] < landmarks.length && connection[1] < landmarks.length) {
        const start = landmarks[connection[0]];
        const end = landmarks[connection[1]];
        let IsPipFinger = false;
        let IsRight = false;

        if(color == 0xd63031)
                        IsRight = true;
                    else
                        IsRight = false;
                    
                    if(connection[0] === 3 && connection[1] === 4
                        || connection[0] === 7 && connection[1] === 8
                        || connection[0] === 11 && connection[1] === 12
                        || connection[0] === 15 && connection[1] === 16
                        || connection[0] === 19 && connection[1] === 20
                    )
                        {
                            IsPipFinger = true;
                        }
        const startVec = new THREE.Vector3(start[0], start[1], start[2]);
        const endVec = new THREE.Vector3(end[0], end[1], end[2]);
        const distance = startVec.distanceTo(endVec);

        // 메인 원기둥 (더 진한 색상)
        const geometry = new THREE.CylinderGeometry(0.008, 0.008, distance, 12);
         if(IsPipFinger)
                    {
                     if(IsRight)
                    {
const material = new THREE.MeshLambertMaterial({ 
          color: 0xffc4c4, 
          transparent: true, 
          opacity: 0.9,
          emissive: color,
          emissiveIntensity: 0.1
        });
        const cylinder: ThreeMesh = new THREE.Mesh(geometry, material);
        cylinder.position.copy(startVec).add(endVec).multiplyScalar(0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3().subVectors(endVec, startVec).normalize());
        cylinder.quaternion.copy(quaternion);
        sceneRef.current!.add(cylinder);
        lineArray.push(cylinder);

        // 외곽선 원기둥 (더 큰 반지름, 어두운 색상)
        const outlineGeometry = new THREE.CylinderGeometry(0.012, 0.012, distance, 12);
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0.6,
          side: THREE.BackSide
        });
        const outlineCylinder: ThreeMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outlineCylinder.position.copy(cylinder.position);
        outlineCylinder.quaternion.copy(cylinder.quaternion);
        sceneRef.current!.add(outlineCylinder);
        lineArray.push(outlineCylinder);
                    }   
                    else
                    {
const material = new THREE.MeshLambertMaterial({ 
          color: 0xcffffc, 
          transparent: true, 
          opacity: 0.9,
          emissive: color,
          emissiveIntensity: 0.1
        });
        const cylinder: ThreeMesh = new THREE.Mesh(geometry, material);
        cylinder.position.copy(startVec).add(endVec).multiplyScalar(0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3().subVectors(endVec, startVec).normalize());
        cylinder.quaternion.copy(quaternion);
        sceneRef.current!.add(cylinder);
        lineArray.push(cylinder);

        // 외곽선 원기둥 (더 큰 반지름, 어두운 색상)
        const outlineGeometry = new THREE.CylinderGeometry(0.012, 0.012, distance, 12);
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0.6,
          side: THREE.BackSide
        });
        const outlineCylinder: ThreeMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outlineCylinder.position.copy(cylinder.position);
        outlineCylinder.quaternion.copy(cylinder.quaternion);
        sceneRef.current!.add(outlineCylinder);
        lineArray.push(outlineCylinder);
                    }
                        
                    }
                    else
                    {
const material = new THREE.MeshLambertMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 0.9,
          emissive: color,
          emissiveIntensity: 0.1
        });
        const cylinder: ThreeMesh = new THREE.Mesh(geometry, material);
        cylinder.position.copy(startVec).add(endVec).multiplyScalar(0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3().subVectors(endVec, startVec).normalize());
        cylinder.quaternion.copy(quaternion);
        sceneRef.current!.add(cylinder);
        lineArray.push(cylinder);

        // 외곽선 원기둥 (더 큰 반지름, 어두운 색상)
        const outlineGeometry = new THREE.CylinderGeometry(0.012, 0.012, distance, 12);
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0.6,
          side: THREE.BackSide
        });
        const outlineCylinder: ThreeMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outlineCylinder.position.copy(cylinder.position);
        outlineCylinder.quaternion.copy(cylinder.quaternion);
        sceneRef.current!.add(outlineCylinder);
        lineArray.push(outlineCylinder);
                    }


                }
            });
  };

    const loadFramePast = (frameIndex: number): void => {
    if (!data || !sceneRef.current) return;
    clearScene();

    // 랜드마크 회전 함수 (Y축 중심 시계방향 180도)
    const rotateLandmark = (lm: number[]): number[] => {
      return [-lm[0], lm[1], -lm[2]]; // x와 z 좌표 반전
    };

    // Left Hand
    if (data.left_hand && data.left_hand[frameIndex] && showLeftHand) {
      const rotatedLeftHand = data.left_hand[frameIndex].map(rotateLandmark);
      if (showCylinders) {
        drawConnectionsCylinder(rotatedLeftHand, HAND_CONNECTIONS, LEFT_COLOR, leftHandLinesRef.current);
      }
    }

    // Right Hand
    if (data.right_hand && data.right_hand[frameIndex] && showRightHand) {
      const rotatedRightHand = data.right_hand[frameIndex].map(rotateLandmark);
      if (showCylinders) {
        drawConnectionsCylinder(rotatedRightHand, HAND_CONNECTIONS, RIGHT_COLOR, rightHandLinesRef.current);
      }
    }
  };

  const loadFrame = (frameIndex: number): void => {
    poseCylinderPool.current.forEach(mesh => mesh.visible = false);
    leftHandCylinderPool.current.forEach(mesh => mesh.visible = false);
    rightHandCylinderPool.current.forEach(mesh => mesh.visible = false);

    // 랜드마크 회전 함수 (Y축 중심 시계방향 180도)
    const rotateLandmark = (lm: number[]): number[] => {
      return [-lm[0], lm[1], -lm[2]]; // x와 z 좌표 반전
    };

    if(data.left_hand && data.left_hand[frameIndex])
    {
      const rotatedLeftHand = data.left_hand[frameIndex].map(rotateLandmark);
      HAND_CONNECTIONS.forEach((conn, i) => {
        if(conn[0] < rotatedLeftHand.length && conn[1] < rotatedLeftHand.length)
        {
          const start = new THREE.Vector3(...rotatedLeftHand[conn[0]]);
          const end = new THREE.Vector3(...rotatedLeftHand[conn[1]]);
          const distance = start.distanceTo(end);

          const mainMesh = leftHandCylinderPool.current[i * 2];
          mainMesh.geometry.dispose();
          mainMesh.geometry = new THREE.CylinderGeometry(0.008, 0.008, distance, 12);
          mainMesh.position.copy(start).add(end).multiplyScalar(0.5);
          mainMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3().subVectors(end, start).normalize()
          );
          mainMesh.visible = true;

          // const outlineMesh = leftHandCylinderPool.current[i * 2 + 1];
          // outlineMesh.geometry.dispose();
          // outlineMesh.geometry = new THREE.CylinderGeometry(0.01, 0.01, distance, 12);
          // outlineMesh.position.copy(start).add(end).multiplyScalar(0.5);

          // outlineMesh.quaternion.copy(mainMesh.quaternion);
          // outlineMesh.material.opacity(0.9);
          // outlineMesh.material.color.set(0xffffff);
          // outlineMesh.visiable = true;

          // 여기서 IsPipFinger라면 이제 색 바꾸는 내용 고려하면 됨
        }
      })
    }

    if(data.right_hand && data.right_hand[frameIndex])
    {
      const rotatedRightHand = data.right_hand[frameIndex].map(rotateLandmark);
      HAND_CONNECTIONS.forEach((conn, i) => {
        if(conn[0] < rotatedRightHand.length && conn[1] < rotatedRightHand.length)
        {
          const start = new THREE.Vector3(...rotatedRightHand[conn[0]]);
          const end = new THREE.Vector3(...rotatedRightHand[conn[1]]);
          const distance = start.distanceTo(end);

          const mainMesh = rightHandCylinderPool.current[i * 2];
          mainMesh.geometry.dispose();
          mainMesh.geometry = new THREE.CylinderGeometry(0.008, 0.008, distance, 12);
          mainMesh.position.copy(start).add(end).multiplyScalar(0.5);
          mainMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3().subVectors(end, start).normalize()
          );
          mainMesh.visible = true;

          // const outlineMesh = rightHandCylinderPool.current[i * 2 + 1];
          // outlineMesh.geometry.dispose();
          // outlineMesh.geometry = new THREE.CylinderGeometry(0.01, 0.01, distance, 12);
          // outlineMesh.position.copy(start).add(end).multiplyScalar(0.5);

          // outlineMesh.quaternion.copy(mainMesh.quaternion);
          // outlineMesh.material.opacity(0.9);
          // outlineMesh.material.color.set(0xffffff);
          // outlineMesh.visiable = true;

          // 여기서 IsPipFinger라면 이제 색 바꾸는 내용 고려하면 됨
        }
      })
    }
  };

  return (
    <div style={styles.leftPanel}>
      <div style={styles.canvasContainer}>
        <canvas ref={canvasRef} style={styles.landmarkCanvas} id="landmark-canvas"></canvas>
      </div>
    </div>
  );
};

export default LandmarkViewerTSX; 