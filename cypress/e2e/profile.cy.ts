describe('프로필 페이지', () => {
  beforeEach(() => {
    cy.login('test@user.com', 'password123');
  });
  it('프로필 화면이 정상적으로 렌더링된다', () => {
    cy.visit('/profile');
    cy.contains('프로필').should('exist');
  });
}); 