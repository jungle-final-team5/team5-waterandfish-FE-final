import { Pose, Results } from '@mediapipe/pose';

export function createPoseHandler(
  onPoseDetected: (shoulder: { x: number }, wrist: { x: number }) => void
) {
  const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults((results: Results) => {
    if (!results.poseLandmarks) return;
    const rightShoulder = results.poseLandmarks[12];
    const rightWrist = results.poseLandmarks[16];
    if (!rightShoulder || !rightWrist) return;

    onPoseDetected(rightShoulder, rightWrist);
  });

  return pose;
}
// const pose = createPoseHandler((rightShoulder, rightWrist) => {
//     if (rightWrist.x < rightShoulder.x) {
//       setup.current = true;
//     }
//     if (setup.current && rightWrist.x > rightShoulder.x) {
//       setStart(true);
//     }
//   }); setup은 Ref로 start는 state로 관리하면 될것같습니다