describe('챕터 목록 및 상세 진입', () => {
  it('챕터 목록이 보이고, 첫 챕터 클릭 시 상세로 이동', () => {
    cy.visit('/chapters');
    cy.get('.chapter-list-item').should('have.length.greaterThan', 0);
    cy.get('.chapter-list-item').first().click();
    cy.url().should('include', '/chapters/');
    cy.contains('챕터 상세').should('exist');
  });
}); 