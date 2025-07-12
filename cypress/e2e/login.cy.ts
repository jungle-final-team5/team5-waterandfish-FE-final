describe('로그인 플로우', () => {
  it('이메일, 비밀번호 입력 후 로그인 성공 시 홈으로 이동', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@user.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/home');
  });
}); 