export function drawLandmarks(ctx, landmarks, canvas) {
    landmarks.forEach((landmark, i) => {
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.font = '12px Arial';
        ctx.fillStyle = 'yellow';
        // ctx.fillText(i, landmark.x * canvas.width + 6, landmark.y * canvas.height - 6);
    });
}

export function drawOverlayMessage(ctx, canvas, message) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0); // x축 기준 오른쪽 끝으로 이동
    ctx.scale(-1, 1);
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

export function drawWarningMessage(ctx, canvas,message) {

  const x = canvas.width / 2;
  const y = canvas.height - 30;
  const paddingX = 16;
  const paddingY = 10;
  const fontSize = 28;
  const font = `${fontSize}px Arial`;
  ctx.translate(canvas.width, 0); // x축 기준 오른쪽 끝으로 이동
  ctx.scale(-1, 1);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const textWidth = ctx.measureText(message).width;
  // 🟥 반투명 배경 박스
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x - textWidth / 2 - paddingX, y - fontSize - paddingY, textWidth + paddingX * 2, fontSize + paddingY * 1.5);

  // ✏️ 텍스트 외곽선 (선택)
  ctx.lineWidth = 2;
  ctx.strokeStyle = "black";
  ctx.strokeText(message, x, y);

  // ✨ 텍스트 본체
  ctx.fillStyle = "white";
  ctx.fillText(message, x, y);

}
