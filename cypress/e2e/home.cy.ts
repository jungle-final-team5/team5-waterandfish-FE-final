describe('홈 화면', () => {
  it('메인 페이지가 정상적으로 렌더링된다', () => {
    cy.visit('/');
    cy.contains('홈').should('exist');
  });
}); 