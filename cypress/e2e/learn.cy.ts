describe('실제 학습 플로우 E2E', () => {
  const categoryId = '6878ed316f2c101fa518f4f5';
  const chapterId = '6878ee376f2c101fa518f4fb';

  it('학습하기 버튼 클릭 후 learningguide 페이지로 이동', () => {
    cy.visit(`/category/${categoryId}/chapters`);
    cy.contains('학습하기').click();
    cy.url().should('include', '/learningguide');
  });

  it('learningguide에서 세션시작 버튼 클릭 시 학습페이지로 이동', () => {
    cy.visit('/learningguide');
    // 웹소켓 연결 완료를 mock 또는 wait 처리 필요
    // cy.intercept('GET', '/ws/**', { /* mock response */ }).as('wsConnect');
    // 실제로는 웹소켓 연결 완료 후 버튼 활성화됨을 기다려야 함
    cy.contains('세션 시작').should('not.be.disabled').click();
    cy.url().should('include', `/learn/chapter/${chapterId}`);
  });

  context('학습페이지 기능 테스트', () => {
    beforeEach(() => {
      cy.visit(`/learn/chapter/${chapterId}`);
    });

    it('상단에 진행도와 수어단어가 정상적으로 렌더링된다', () => {
      cy.get('[data-testid=progress-bar]').should('exist');
      cy.get('[data-testid=current-sign-word]').should('exist');
    });

    it('천천히 보기 버튼이 정상적으로 동작한다', () => {
      cy.get('button').contains('천천히 보기').click();
      cy.get('button').contains('일반 속도').should('exist');
      cy.get('button').contains('일반 속도').click();
      cy.get('button').contains('천천히 보기').should('exist');
    });

    it('다음으로 넘어가기 버튼이 정상적으로 동작한다', () => {
      cy.get('button').contains('다음').click();
      // 진행도, 단어 등 변화 확인
      cy.get('[data-testid=progress-bar]').invoke('attr', 'value').then(Number).should('be.gt', 0);
    });

    it('임계값 80% 이상일 때 정답 모달이 잘 작동한다', () => {
      // confidence 값을 mock 또는 강제로 80 이상으로 세팅
      cy.window().then(win => {
        // 예시: win.setDisplayConfidence && win.setDisplayConfidence(85);
        // 또는 API/소켓 mock
      });
      cy.contains('정답').should('exist');
      cy.get('.modal').should('be.visible');
    });

    it('학습이 끝나면 완료 창이 뜬다', () => {
      // 마지막 문제까지 반복 (실제 문제 수에 맞게 조정 필요)
      for (let i = 0; i < 5; i++) {
        cy.get('button').contains('다음').click({ force: true });
      }
      cy.contains('학습 완료').should('exist');
      cy.url().should('include', '/complete');
    });
  });

  /* ==== Test Created with Cypress Studio ==== */
  it('learn', function() {
    /* ==== Generated with Cypress Studio ==== */
    cy.visit('local');
    cy.visit('localhost:5173');
    /* ==== End Cypress Studio ==== */
  });
}); 