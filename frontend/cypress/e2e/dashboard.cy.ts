/// <reference types="cypress" />
describe('Dashboard E2E - Smart Invoice AI Extractor', () => {
  const mockUser = {
    id: 'test-user-uuid',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
    aud: 'authenticated',
    role: 'authenticated'
  };

  beforeEach(() => {
    // Intercept Supabase Auth calls to mock a logged-in session
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 200,
      body: {
        access_token: 'fake-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: mockUser
      }
    });

    cy.intercept('GET', '**/auth/v1/user', {
      statusCode: 200,
      body: mockUser
    });

    // Mock initial DB history fetch
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: []
    });

    // Visit dashboard
    cy.visit('/');
    
    // Ensure we wait for the intro overlay to disappear (1400ms in code)
    cy.wait(2000);
  });

  it('verifies sidebar sync, AI extraction, and cloud save', () => {
    // 1. Sidebar Interaction Check (Logo Toggle)
    // Check initial state (should be expanded 320px)
    cy.get('aside').should('have.css', 'width', '320px');
    
    // Click Header Toggle Button
    cy.get('header button[title="Toggle Sidebar"]').click();
    
    // Verify it collapsed to 80px
    cy.get('aside').should('have.css', 'width', '80px');
    
    // Click again to expand
    cy.get('header button[title="Toggle Sidebar"]').click();
    cy.get('aside').should('have.css', 'width', '320px');

    // 2. File Upload & Extraction Pipeline
    // Setup intercept for the backend extraction endpoint (now using SSE)
    cy.intercept('POST', '**/api/extract', {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
      body: `data: ${JSON.stringify({
        type: "log",
        message: "Agent Initialized"
      })}\n\ndata: ${JSON.stringify({
        type: "result",
        data: {
          vendor: "Test Vendor",
          date: "2026-03-17",
          total: 125.50,
          invoice_number: "INV-100",
          items: [
            { description: "Consulting", quantity: 1, unit_price: 125.5, total: 125.5 }
          ]
        },
        metadata: {
          confidence_score: 99,
          model_used: "gemini",
          manual_review_required: false,
          classification: { is_handwritten: false, image_quality: "high" }
        }
      })}\n\n`
    }).as('extractRequest');

    // Mock Supabase storage upload and DB insert
    cy.intercept('POST', '**/storage/v1/object/invoice-images*', { statusCode: 200, body: { Key: 'path/to/img' } });
    cy.intercept('POST', '**/rest/v1/invoices*', { statusCode: 201, body: {} });
    
    // Mock the refreshed history including the new item
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: [{
        id: '1',
        vendor_name: 'Test Vendor',
        total_amount: 125.5,
        invoice_date: '2026-03-17',
        raw_data: { vendor: 'Test Vendor', total: 125.50, items: [] },
        image_url: 'http://example.com/img.png'
      }]
    });

    // Perform upload
    const fileName = 'invoice.png';
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fake data'),
      fileName: fileName,
      lastModified: Date.now(),
    }, { force: true });

    // Click Extract
    cy.get('button#extractBtn').should('not.be.disabled').click();
    cy.wait('@extractRequest');

    // 3. UI Sequence Verification (JSON above Table)
    // Verify results section appeared
    cy.contains('Analysis Results').should('be.visible');
    
    // Check that pre/code (JSON) comes before the table card
    cy.get('pre#result').should('be.visible');
    cy.get('.card').contains('Table View').should('be.visible');
    
    // Structural DOM check for sequence
    cy.get('pre#result').then(($json: JQuery<HTMLElement>) => {
      const jsonTop = $json.offset()?.top || 0;
      cy.get('.card').contains('Table View').closest('.card').then(($tableCard: JQuery<HTMLElement>) => {
        const tableTop = $tableCard.offset()?.top || 0;
        expect(jsonTop).to.be.lessThan(tableTop);
      });
    });

    // 4. Cloud Verification in Sidebar
    // Expanding sidebar to find the text
    cy.get('aside').contains('Test Vendor', { timeout: 10000 }).should('be.visible');
    cy.get('aside').contains('Sync Enabled').should('be.visible');

    // 5. Theme Engine (Sun/Moon Toggle)
    // Initially dark (bg-[#0f172a])
    cy.get('div.flex.h-screen').should('have.class', 'dark:bg-[#0f172a]');
    
    // Click Sun/Moon Toggle in Header
    cy.get('header button[title="Toggle Theme"]').click();
    
    // Check for light mode background class
    cy.get('div.flex.h-screen').should('have.class', 'bg-slate-50');
    // html should also change classes
    cy.get('html').should('have.class', 'light');
  });
});
