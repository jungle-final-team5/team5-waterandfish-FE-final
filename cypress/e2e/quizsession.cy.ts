describe('퀴즈 세션', () => {
  beforeEach(() => {
    cy.login('test@user.com', 'password123');
  });
  it('퀴즈 시작 후 첫 문제와 정답 선택, 다음 문제로 이동', () => {
    cy.visit('/quizsession');
    cy.contains('퀴즈 시작').click();
    cy.get('.quiz-question').should('exist');
    cy.get('.quiz-option').first().click();
    cy.contains('다음 문제').click();
    cy.get('.quiz-question').should('exist');
  });
}); 