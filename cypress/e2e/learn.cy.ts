describe('학습 페이지', () => {
  beforeEach(() => {
    cy.login('test@user.com', 'password123');
  });
  it('학습 화면이 정상적으로 렌더링된다', () => {
    cy.visit('/learn');
    cy.contains('학습').should('exist');
  });
}); 