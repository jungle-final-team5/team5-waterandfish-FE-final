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
