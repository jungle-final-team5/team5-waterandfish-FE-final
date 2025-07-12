describe('회원가입 페이지', () => {
  it('회원가입 폼이 정상적으로 렌더링된다', () => {
    cy.visit('/signup');
    cy.contains('회원가입').should('exist');
  });
}); 