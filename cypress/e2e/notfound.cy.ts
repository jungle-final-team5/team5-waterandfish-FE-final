describe('NotFound 페이지', () => {
  it('존재하지 않는 경로에서 NotFound 메시지가 보인다', () => {
    cy.visit('/404404');
    cy.contains('404').should('exist');
  });
}); 