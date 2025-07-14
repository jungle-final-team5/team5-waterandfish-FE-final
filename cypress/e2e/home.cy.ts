describe('홈 화면', () => {
  beforeEach(() => {
    cy.login('test@user.com', 'password123');
    cy.visit('/home');
  });

  it('메인 페이지가 정상적으로 렌더링된다', () => {
    cy.contains('수어지교').should('exist').and('be.visible');
    cy.contains('인터랙티브 수어 학습 플랫폼').should('exist').and('be.visible');
    cy.contains('오늘도 수어 학습을 시작해볼까요?').should('exist').and('be.visible');
    cy.contains('이어서 학습하기').should('exist').and('be.visible');
    cy.contains('오늘의 추천 수어').should('exist').and('be.visible');
    cy.contains('맞춤 추천 학습').should('exist').and('be.visible');
    cy.contains('전체 진도율').should('exist').and('be.visible');
    cy.contains('획득한 뱃지').should('exist').and('be.visible');
    cy.contains('연속 학습').should('exist').and('be.visible');
  });

  it('검색창에 입력하면 추천 결과가 나타난다', () => {
    cy.get('input[placeholder*="수어를 검색"]').should('exist').and('be.visible').type('학교');
    cy.get('div').contains('학교').should('exist').and('be.visible');
  });

  it('검색 결과를 클릭하면 해당 단어 학습 페이지로 이동한다', () => {
    cy.get('input[placeholder*="수어를 검색"]').should('exist').and('be.visible').type('병원');
    cy.get('button').contains('병원').should('exist').and('be.visible').click();
    cy.url().should('include', '/learn/word/%EB%B3%91%EC%9B%90');
  });

  it('이어 학습하기 버튼을 누르면 최근 학습 챕터 또는 카테고리로 이동한다', () => {
    cy.contains('이어서 학습하기').should('exist').and('be.visible').click();
    cy.url().should('satisfy', (url) => {
      return url.includes('/learn/chapter') || url.includes('/category');
    });
  });

  it('오늘의 추천 수어 카드에서 지금 배우기 버튼을 누르면 이동한다', () => {
    cy.contains('지금 배우기').should('exist').and('be.visible').click();
    cy.url().should('include', '/learn');
  });

  it('맞춤 추천 학습 카드의 카테고리 클릭 시 해당 카테고리로 이동한다', () => {
    cy.get('.bg-violet-50').should('have.length.at.least', 1).first().should('be.visible').click();
    cy.url().should('include', '/category/');
  });

  it('획득한 뱃지 카드 클릭 시 뱃지 모달이 열린다', () => {
    cy.contains('획득한 뱃지').should('exist').and('be.visible').click();
    cy.get('[role="dialog"]').should('exist').and('be.visible');
    cy.get('[role="dialog"]').contains('뱃지').should('exist').and('be.visible');
    cy.get('[role="dialog"] button').first().should('exist').and('be.visible').click();
  });

  it('연속 학습 카드 클릭 시 streak 모달이 열린다', () => {
    cy.contains('연속 학습').should('exist').and('be.visible').click();
    cy.get('[role="dialog"]').should('exist').and('be.visible');
    cy.get('[role="dialog"]').contains('연속 학습').should('exist').and('be.visible');
    cy.get('[role="dialog"] button').first().should('exist').and('be.visible').click();
  });

  it('로그아웃 버튼을 누르면 로그아웃되고 루트 페이지로 이동한다', () => {
    cy.get('button[aria-label="logout"]').should('exist').and('be.visible').click();
    cy.contains('로그아웃').should('exist');
    cy.url().should('include', '/');
  });
}); 