describe('관리자 페이지', () => {
  it('관리자 로그인 후 유저 목록 및 상세 진입', () => {
    cy.visit('/admin');
    cy.get('input[type="email"]').type('admin@admin.com');
    cy.get('input[type="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    cy.get('.user-list-item').should('have.length.greaterThan', 0);
    cy.get('.user-list-item').first().click();
    cy.url().should('include', '/admin/user/');
    cy.contains('유저 상세').should('exist');
  });
}); 