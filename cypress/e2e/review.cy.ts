describe('학습 리뷰 목록 및 상세', () => {
  it('리뷰 목록이 보이고, 첫 리뷰 클릭 시 상세로 이동', () => {
    cy.visit('/review');
    cy.get('.review-list-item').should('have.length.greaterThan', 0);
    cy.get('.review-list-item').first().click();
    cy.url().should('include', '/review/');
    cy.contains('리뷰 상세').should('exist');
  });
}); 