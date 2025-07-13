describe('홈 화면', () => {
  beforeEach(() => {
    cy.login('test@user.com', 'password123');
  });
  it('메인 페이지가 정상적으로 렌더링된다', () => {
    cy.visit('/');
    cy.contains('홈').should('exist');
  });
}); 