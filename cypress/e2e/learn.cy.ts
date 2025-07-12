describe('학습 페이지', () => {
  it('학습 화면이 정상적으로 렌더링된다', () => {
    cy.visit('/learn');
    cy.contains('학습').should('exist');
  });
}); 