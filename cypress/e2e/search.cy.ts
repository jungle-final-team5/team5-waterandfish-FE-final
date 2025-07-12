describe('검색 기능', () => {
  it('검색어 입력 후 결과가 나타난다', () => {
    cy.visit('/search');
    cy.get('input[type="text"]').type('테스트');
    cy.get('button[type="submit"]').click();
    cy.get('.search-result').should('have.length.greaterThan', 0);
  });
}); 