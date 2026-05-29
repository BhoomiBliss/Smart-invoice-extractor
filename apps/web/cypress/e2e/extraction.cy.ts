describe('Invoice Extraction & Correction Pipeline E2E Workflow', () => {
  beforeEach(() => {
    // Clear storage cache before each test run
    cy.clearLocalStorage();
  });

  it('should allow guest users to upload an invoice and use the dynamic editor', () => {
    cy.visit('/');

    // 1. Trigger Guest session ingestion bypass
    cy.contains('Try Ingestion as Guest').click();
    cy.url().should('include', '/dashboard?session=guest');

    // 2. Mock upload document
    const invoiceFile = 'mock_amazon_invoice.pdf';
    cy.get('input[type="file"]').attachFile(invoiceFile);

    // 3. Track progress bar
    cy.contains('Processing', { timeout: 10000 }).should('be.visible');
    cy.contains('Completed', { timeout: 15000 }).should('be.visible');

    // 4. Verify split views are loaded
    cy.contains('Human-in-the-Loop Correction Engine').should('be.visible');
    cy.get('input[value="Amazon Web Services, Inc."]').should('exist');

    // 5. Test synchronized table field overrides
    cy.get('input[value="Amazon Web Services, Inc."]')
      .clear()
      .type('AWS Cloud Invocations')
      .trigger('change');

    // 6. Verify JSON editor and NLP summary views dynamically synchronized values
    cy.get('textarea').should('contain.value', 'AWS Cloud Invocations');
    cy.contains('AWS Cloud Invocations issued Invoice').should('be.visible');

    // 7. Verify save edits
    cy.contains('Commit Verified Data').click();
    cy.contains('Invoice overrides committed successfully!').should('be.visible');
  });
});
